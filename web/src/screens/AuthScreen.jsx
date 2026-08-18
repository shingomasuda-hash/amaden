import { useState } from "react";
import { C } from "../lib/theme";
import { ShieldCheck, Mail, Lock, LogIn, LogOut } from "../lib/icons";
import { Btn, Card, ProtoNote } from "../components/ui";

export function AuthScreen({ auth }) {
  const [mode, setMode] = useState("login"); // login | signup | reset
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (next) => { setMode(next); setErr(""); };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) { setErr("氏名を入力してください"); return; }
        const error = await auth.signUp(email.trim(), password, name.trim());
        if (error) { setErr(error.message); return; }
        setSignedUp(true);
      } else if (mode === "reset") {
        const error = await auth.resetPassword(email.trim());
        if (error) { setErr("送信できませんでした。メールアドレスをご確認ください。"); return; }
        setResetSent(true);
      } else {
        const error = await auth.signIn(email.trim(), password);
        if (error) { setErr("メールアドレスまたはパスワードが違います"); return; }
      }
    } finally {
      setBusy(false);
    }
  };

  if (signedUp) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#f0f2f5" }}>
        <Card className="w-full" style={{ maxWidth: 460 }}>
          <div className="text-center">
            <div className="w-12 h-12 rounded mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: C.navy }}><Mail size={22} className="text-white" /></div>
            <h1 className="text-base font-semibold" style={{ color: C.ink }}>確認メールを送信しました</h1>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: C.sub }}>
              {email} 宛のメールに記載されたリンクを開いてメールアドレスを確認してください。<br />
              その後、管理者が権限を付与するまでは「承認待ち」の状態になります。
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#f0f2f5" }}>
        <Card className="w-full" style={{ maxWidth: 460 }}>
          <div className="text-center">
            <div className="w-12 h-12 rounded mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: C.navy }}><Mail size={22} className="text-white" /></div>
            <h1 className="text-base font-semibold" style={{ color: C.ink }}>パスワード再設定メールを送信しました</h1>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: C.sub }}>
              {email} 宛のメールに記載されたリンクから、新しいパスワードを設定してください。
            </p>
          </div>
          <div className="flex justify-center mt-4">
            <Btn variant="outline" onClick={() => { setResetSent(false); switchMode("login"); }}>ログイン画面に戻る</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#f0f2f5" }}>
      <Card className="w-full" style={{ maxWidth: 440 }}>
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: C.navy }}>
            {mode === "reset" ? <Lock size={22} className="text-white" /> : <ShieldCheck size={22} className="text-white" />}
          </div>
          <h1 className="text-base font-semibold" style={{ color: C.ink }}>整備報告書システム</h1>
          <p className="text-xs mt-1" style={{ color: C.sub }}>
            {mode === "login" ? "社内アカウントでログイン" : mode === "signup" ? "新しいアカウントを作成" : "パスワードの再設定"}
          </p>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label className="text-xs block mb-1" style={{ color: C.sub }}>氏名</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：高橋 一郎"
                className="w-full rounded border px-3 py-2 text-sm mb-3" style={{ borderColor: C.line2, color: C.ink }} />
            </>
          )}
          <label className="text-xs block mb-1" style={{ color: C.sub }}>メールアドレス</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@amaden-ss.co.jp"
            className={`w-full rounded border px-3 py-2 text-sm ${mode === "reset" ? "mb-4" : "mb-3"}`} style={{ borderColor: C.line2, color: C.ink }} />
          {mode !== "reset" && (
            <>
              <label className="text-xs block mb-1" style={{ color: C.sub }}>パスワード</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6文字以上"
                className="w-full rounded border px-3 py-2 text-sm mb-1" style={{ borderColor: C.line2, color: C.ink }} />
              {mode === "login" && (
                <button type="button" onClick={() => switchMode("reset")} className="text-[11px] mb-3" style={{ color: C.navy }}>
                  パスワードをお忘れですか？
                </button>
              )}
            </>
          )}
          {err && <div className="text-xs mb-3 mt-2" style={{ color: "#dc2626" }}>{err}</div>}
          <div className="mt-3">
            <Btn type="submit" variant="primary" size="lg" icon={mode === "login" ? LogIn : Mail} disabled={busy}>
              {mode === "login" ? "ログイン" : mode === "signup" ? "確認メールを送る" : "再設定メールを送る"}
            </Btn>
          </div>
        </form>
        {mode === "reset" ? (
          <button onClick={() => switchMode("login")} className="w-full text-center text-xs mt-4" style={{ color: C.navy }}>
            ログイン画面に戻る
          </button>
        ) : (
          <button onClick={() => switchMode(mode === "login" ? "signup" : "login")} className="w-full text-center text-xs mt-4" style={{ color: C.navy }}>
            {mode === "login" ? "アカウントをお持ちでない方はこちら" : "既にアカウントをお持ちの方はこちら"}
          </button>
        )}
        <div className="mt-4"><ProtoNote>ログインはFirebase Authによる本物の認証です。新規登録後は管理者が権限を付与するまで「承認待ち」になります。</ProtoNote></div>
      </Card>
    </div>
  );
}

export function PendingApproval({ profile, onSignOut }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#f0f2f5" }}>
      <Card className="w-full" style={{ maxWidth: 440 }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: "#d97706" }}><Lock size={22} className="text-white" /></div>
          <h1 className="text-base font-semibold" style={{ color: C.ink }}>承認待ちです</h1>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: C.sub }}>
            {profile?.name} さんのアカウントはまだ管理者の承認待ちです。<br />
            管理者が権限を付与すると使えるようになります。
          </p>
        </div>
        <div className="flex justify-center mt-4">
          <Btn variant="outline" icon={LogOut} onClick={onSignOut}>ログアウト</Btn>
        </div>
      </Card>
    </div>
  );
}

export function SuspendedNotice({ onSignOut }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#f0f2f5" }}>
      <Card className="w-full" style={{ maxWidth: 440 }}>
        <div className="text-center">
          <div className="w-12 h-12 rounded mx-auto flex items-center justify-center mb-3" style={{ backgroundColor: "#dc2626" }}><Lock size={22} className="text-white" /></div>
          <h1 className="text-base font-semibold" style={{ color: C.ink }}>アカウントが停止されています</h1>
          <p className="text-xs mt-2" style={{ color: C.sub }}>管理者にお問い合わせください。</p>
        </div>
        <div className="flex justify-center mt-4">
          <Btn variant="outline" icon={LogOut} onClick={onSignOut}>ログアウト</Btn>
        </div>
      </Card>
    </div>
  );
}
