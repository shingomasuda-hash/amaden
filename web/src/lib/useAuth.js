import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

/* 認証状態と自分のプロフィール（role/status）を管理するフック。
   role='pending' のうちはダッシュボードに入れない（管理者が承認するまで）。 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) { setProfile(null); setLoading(false); }
    });
    return unsub;
  }, []);

  // 自分のプロフィールをリアルタイム購読（管理者が権限を付与した瞬間に反映される）
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "profiles", user.uid), (snap) => {
      setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const signUp = useCallback(async (email, password, name) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // profiles ドキュメントは本人が role='pending' でのみ作成できる（ルールで強制）
      await setDoc(doc(db, "profiles", cred.user.uid), {
        name, email, role: "pending", status: "有効", created_at: serverTimestamp(),
      });
      return null;
    } catch (e) {
      return e;
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return null;
    } catch {
      return new Error("auth-failed");
    }
  }, []);

  const signOut = useCallback(async () => { await fbSignOut(auth); }, []);

  return { user, profile, loading, session: user, signUp, signIn, signOut };
}
