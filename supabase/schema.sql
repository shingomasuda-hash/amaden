-- 整備報告書【モータ】自動作成システム — Supabaseスキーマ
-- Supabase の SQL Editor でこのファイルをそのまま実行してください。
-- 再実行しても安全なように IF NOT EXISTS / OR REPLACE を使っています。

-- ============================================================
-- 1. profiles（社内スタッフ。auth.users の付属情報）
--    サインアップ直後は role='pending' で、管理者が承認して権限を割り当てるまで
--    ダッシュボードに入れません（サービスロールキーをフロントに置かずに
--    「管理者だけがアカウントを作れる」を実現するための設計）。
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'pending' check (role in ('pending', '管理者', '担当者', '閲覧者')),
  status text not null default '有効' check (status in ('有効', '停止')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- 本人は名前だけ変更可。role/status は管理者のみ変更可（下の関数経由）。
drop policy if exists "profiles_update_self_name" on public.profiles;
create policy "profiles_update_self_name" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = '管理者')
  );

-- 新規サインアップ時に自動で profiles 行を作る
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, status)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email, 'pending', '有効');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. cases（案件）
-- ============================================================
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  ctrl text unique not null,
  customer text not null,
  kind text not null default '交流',
  rewind boolean not null default false,
  spec text default '',
  status text not null default 'review' check (status in ('review', 'process', 'done', 'error')),
  owner text default '',
  err text default '',
  case_date date default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cases enable row level security;

drop policy if exists "cases_select_authenticated" on public.cases;
create policy "cases_select_authenticated" on public.cases
  for select to authenticated using (true);

drop policy if exists "cases_write_non_viewer" on public.cases;
create policy "cases_write_non_viewer" on public.cases
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('管理者', '担当者'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('管理者', '担当者'))
  );

-- ============================================================
-- 3. case_links（先方用の共有トークン）
-- ============================================================
create table if not exists public.case_links (
  ctrl text primary key references public.cases(ctrl) on delete cascade,
  token text unique not null default encode(gen_random_bytes(12), 'hex'),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.case_links enable row level security;

drop policy if exists "case_links_staff" on public.case_links;
create policy "case_links_staff" on public.case_links
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('管理者', '担当者'))
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('管理者', '担当者'))
  );
-- anon には一切公開しない。先方ポータルは下の SECURITY DEFINER 関数からのみアクセスする。

-- ============================================================
-- 4. case_messages（案件ごとのチャット＋履歴タイムライン）
--    role: 'internal' | 'customer' | 'system'
-- ============================================================
create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  ctrl text not null references public.cases(ctrl) on delete cascade,
  role text not null check (role in ('internal', 'customer', 'system')),
  author text not null,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.case_messages enable row level security;

drop policy if exists "case_messages_select_staff" on public.case_messages;
create policy "case_messages_select_staff" on public.case_messages
  for select to authenticated using (true);

drop policy if exists "case_messages_insert_staff" on public.case_messages;
create policy "case_messages_insert_staff" on public.case_messages
  for insert to authenticated with check (role in ('internal', 'system'));
-- 先方（anon）からの書き込みは下の post_customer_message() 関数経由のみ許可。

-- 案件ごとの「AIエージェント操作を許可」フラグ
alter table public.cases add column if not exists ai_enabled boolean not null default false;

-- ============================================================
-- 5. audit_logs（全社共通の変更履歴）
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  user_name text not null,
  action text not null,
  target text not null,
  before_value text default '—',
  after_value text default '—'
);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_staff" on public.audit_logs;
create policy "audit_logs_select_staff" on public.audit_logs
  for select to authenticated using (true);

drop policy if exists "audit_logs_insert_staff" on public.audit_logs;
create policy "audit_logs_insert_staff" on public.audit_logs
  for insert to authenticated with check (true);

-- ============================================================
-- 6. 先方ポータル用 RPC（anon から呼び出す。トークンが正しく有効な時だけ
--    該当案件の情報とチャットを返す／先方メッセージの投稿を受け付ける）
-- ============================================================
create or replace function public.get_case_by_token(p_token text)
returns table (
  ctrl text, customer text, kind text, rewind boolean, spec text, status text,
  ai_enabled boolean, msg_id uuid, msg_role text, msg_author text, msg_text text, msg_at timestamptz
) as $$
begin
  return query
    select c.ctrl, c.customer, c.kind, c.rewind, c.spec, c.status, c.ai_enabled,
           m.id, m.role, m.author, m.text, m.created_at
    from public.case_links l
    join public.cases c on c.ctrl = l.ctrl
    left join public.case_messages m on m.ctrl = c.ctrl
    where l.token = p_token and l.enabled = true
    order by m.created_at asc;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.get_case_by_token(text) to anon, authenticated;

create or replace function public.post_customer_message(p_token text, p_author text, p_text text)
returns void as $$
declare
  v_ctrl text;
begin
  select l.ctrl into v_ctrl from public.case_links l where l.token = p_token and l.enabled = true;
  if v_ctrl is null then
    raise exception 'invalid or disabled link';
  end if;
  insert into public.case_messages (ctrl, role, author, text) values (v_ctrl, 'customer', p_author, p_text);
  insert into public.audit_logs (user_name, action, target, before_value, after_value)
    values (p_author, 'メッセージ送信', v_ctrl || '（先方）', '—', left(p_text, 40));
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.post_customer_message(text, text, text) to anon, authenticated;

-- ============================================================
-- 7. リアルタイム配信を有効化
-- ============================================================
alter publication supabase_realtime add table public.case_messages;
alter publication supabase_realtime add table public.cases;
alter publication supabase_realtime add table public.audit_logs;

-- ============================================================
-- 8. サンプルデータ（近畿テクノの案件を1件だけ投入。不要なら削除してください）
-- ============================================================
insert into public.cases (ctrl, customer, kind, rewind, spec, status, owner, case_date)
values ('26MT1020B', '近畿テクノ㈱エレベータ', '交流', true, '55kW / 220・440V / 4P', 'review', '', current_date)
on conflict (ctrl) do nothing;

insert into public.case_links (ctrl) values ('26MT1020B') on conflict (ctrl) do nothing;
