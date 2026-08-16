import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

/* 認証状態と自分のプロフィール（role/status）を管理するフック。
   role='pending' のうちはダッシュボードに入れない（管理者が承認するまで）。 */
export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      loadProfile(data.session?.user?.id).finally(() => setLoading(false));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      loadProfile(sess?.user?.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // 自分のプロフィール（role/status）が管理者に変更された時にリアルタイムで反映
  useEffect(() => {
    if (!supabase || !session?.user?.id) return;
    const channel = supabase
      .channel(`profile-${session.user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${session.user.id}` },
        (payload) => setProfile(payload.new))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    return error;
  };
  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  return { session, profile, loading, signUp, signIn, signOut, user: session?.user || null };
}
