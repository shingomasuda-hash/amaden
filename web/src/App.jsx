import { useEffect, useState } from "react";
import { supabase, supabaseReady } from "./lib/supabase";
import { useAuth } from "./lib/useAuth";
import { useCases, useProfiles, useCaseLinks, useAuditLogs, useThreadCounts, logActivity, pushSystemNote } from "./lib/useData";
import { C } from "./lib/theme";
import { FileSpreadsheet, ShieldCheck, LogOut, Info, LayoutDashboard } from "./lib/icons";
import { Btn, Toast } from "./components/ui";
import { AuthScreen, PendingApproval, SuspendedNotice } from "./screens/AuthScreen";
import { CustomerPortal } from "./screens/CustomerPortal";
import { Dashboard } from "./screens/Dashboard";
import { CaseChatScreen } from "./screens/CaseChatScreen";
import { AdminPanel } from "./screens/AdminPanel";
import { Stepper, UploadScreen, Processing, Review, WorkContent, Measurements, Preview, Done } from "./screens/Workflow";
import { STEPS } from "./lib/mockWorkflow";

const parseCustomerToken = () => {
  const m = /^#\/customer\/(.+)$/.exec(window.location.hash || "");
  return m ? decodeURIComponent(m[1]) : null;
};

function MissingConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#f0f2f5" }}>
      <div className="max-w-md text-sm rounded-lg border bg-white p-6" style={{ borderColor: C.line, color: C.ink }}>
        <div className="font-semibold mb-2">Supabaseの接続設定がありません</div>
        <p className="text-xs" style={{ color: C.sub }}>
          <code>.env.local</code>（または Vercel のプロジェクト環境変数）に
          <code>VITE_SUPABASE_URL</code> と <code>VITE_SUPABASE_ANON_KEY</code> を設定してください。
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [customerToken, setCustomerToken] = useState(parseCustomerToken);
  useEffect(() => {
    const onHash = () => setCustomerToken(parseCustomerToken());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (!supabaseReady) return <MissingConfig />;
  if (customerToken) return <CustomerPortal token={customerToken} />;
  return <StaffApp />;
}

function StaffApp() {
  const auth = useAuth();
  const { cases } = useCases();
  const { profiles } = useProfiles();
  const { links: caseLinks, ensureLink, toggleLink } = useCaseLinks();
  const { logs } = useAuditLogs();
  const threadCounts = useThreadCounts();

  const [screen, setScreen] = useState("dashboard");
  const [activeCase, setActiveCase] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => setToastMsg(m);

  if (auth.loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f0f2f5" }} />;
  }
  if (!auth.session) return <AuthScreen auth={auth} />;
  if (!auth.profile) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f0f2f5" }} />;
  if (auth.profile.status === "停止") return <SuspendedNotice onSignOut={auth.signOut} />;
  if (auth.profile.role === "pending") return <PendingApproval profile={auth.profile} onSignOut={auth.signOut} />;

  const currentUser = auth.profile;
  const canManage = currentUser.role !== "閲覧者";
  const isAdmin = currentUser.role === "管理者";
  const maxReached = STEPS.findIndex((s) => s.id === screen);
  const inFlow = !["dashboard", "admin", "casechat"].includes(screen);

  const openCase = (c, at) => {
    setActiveCase(c);
    setScreen(at);
    logActivity(currentUser.name, "案件を開いた", c.ctrl, "—", STEPS.find((s) => s.id === at)?.name || at);
    pushSystemNote(c.ctrl, `${currentUser.name} が案件を開きました（${STEPS.find((s) => s.id === at)?.name || at}）。`);
  };

  const newCase = async () => {
    const ctrl = `26MT${Math.floor(1000 + Math.random() * 9000)}`;
    const { data, error } = await supabase.from("cases").insert({
      ctrl, customer: "新規案件（顧客名未設定）", kind: "交流", rewind: false, spec: "", status: "review", owner: currentUser.name,
    }).select().single();
    if (error) { toast("案件の作成に失敗しました"); return; }
    await logActivity(currentUser.name, "案件登録", ctrl, "—", data.customer);
    setActiveCase(data);
    setScreen("upload");
  };

  const openChat = (c) => { setActiveCase(c); setScreen("casechat"); };
  const goHome = () => { setScreen("dashboard"); setActiveCase(null); };

  const copyLink = async (c) => {
    const token = await ensureLink(c.ctrl);
    const url = `${window.location.origin}${window.location.pathname}#/customer/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("先方用リンクをコピーしました");
    } catch {
      toast(url);
    }
  };

  const onAudit = (action, target, before, after) => {
    logActivity(currentUser.name, action, target, before, after);
    if (activeCase?.ctrl) pushSystemNote(activeCase.ctrl, `${currentUser.name} が「${action}」を行いました（${target}${after && after !== "—" ? ` → ${after}` : ""}）`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f0f2f5", fontFamily: "'Hiragino Kaku Gothic ProN','Yu Gothic',Meiryo,sans-serif" }}>
      <header className="sticky top-0 z-40" style={{ backgroundColor: C.navy }}>
        <div className="mx-auto flex items-center justify-between px-6 h-14" style={{ maxWidth: 1440 }}>
          <button onClick={goHome} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,.12)" }}><FileSpreadsheet size={17} className="text-white" /></div>
            <div className="text-left">
              <div className="text-white text-sm font-semibold leading-tight">整備報告書【モータ】自動作成システム</div>
              <div className="text-[10px] leading-tight" style={{ color: "#a9bdd4" }}>Amaden ／ 分解整備成績書 → 整備報告書</div>
            </div>
          </button>
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded" style={{ color: "#ffe3b0", backgroundColor: "rgba(255,255,255,.08)" }}>
              <Info size={11} /> OCR・Excel・PDF・保存は未接続のモックです
            </div>
            {isAdmin && <Btn size="sm" variant="outline" icon={ShieldCheck} onClick={() => setScreen("admin")}>管理者</Btn>}
            <div className="flex items-center gap-2 text-white text-xs">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px]" style={{ backgroundColor: "rgba(255,255,255,.15)" }}>{(currentUser.name || "担").slice(0, 1)}</div>
              <span className="hidden md:inline">{currentUser.name}（{currentUser.role}）</span>
            </div>
            <button onClick={() => { logActivity(currentUser.name, "ログアウト", "システム", "—", "実行"); auth.signOut(); }} className="text-[11px] flex items-center gap-1" style={{ color: "#cbd5e1" }}><LogOut size={12} />ログアウト</button>
          </div>
        </div>
        {inFlow && (
          <div style={{ backgroundColor: "#fff", borderBottom: `1px solid ${C.line}` }}>
            <div className="mx-auto px-6 py-2 flex items-center justify-between gap-4" style={{ maxWidth: 1440 }}>
              <Stepper current={screen} go={setScreen} maxReached={maxReached} />
              <button onClick={goHome} className="text-xs whitespace-nowrap flex items-center gap-1" style={{ color: C.sub }}><LayoutDashboard size={13} />一覧へ</button>
            </div>
          </div>
        )}
      </header>

      <main>
        {screen === "dashboard" && (
          <Dashboard cases={cases} profiles={profiles} caseLinks={caseLinks} currentUser={currentUser} canManage={canManage}
            onOpenCase={openCase} onNewCase={newCase} onAdmin={() => setScreen("admin")} onOpenChat={openChat} onCopyLink={copyLink} />
        )}
        {screen === "admin" && isAdmin && (
          <AdminPanel profiles={profiles} cases={cases} caseLinks={caseLinks} threadCounts={threadCounts} currentUser={currentUser}
            onBack={goHome} onOpenChat={openChat} onCopyLink={copyLink} onToggleLink={(c) => toggleLink(c.ctrl)} logs={logs} toast={toast} />
        )}
        {screen === "casechat" && (
          <CaseChatScreen theCase={activeCase} currentUser={currentUser} linkEnabled={caseLinks[activeCase?.ctrl]?.enabled !== false}
            onCopyLink={copyLink} onToggleLink={(c) => toggleLink(c.ctrl)} onBack={goHome} />
        )}
        {screen === "upload" && <UploadScreen theCase={activeCase} owners={profiles.filter((p) => p.role !== "pending").map((p) => p.name)} onStart={() => setScreen("processing")} onAudit={onAudit} />}
        {screen === "processing" && <Processing theCase={activeCase} onDone={() => setScreen("review")} />}
        {screen === "review" && <Review onNext={() => setScreen("work")} onAudit={onAudit} />}
        {screen === "work" && <WorkContent onNext={() => setScreen("meas")} onAudit={onAudit} />}
        {screen === "meas" && <Measurements onNext={() => setScreen("preview")} onAudit={onAudit} />}
        {screen === "preview" && <Preview theCase={activeCase} onNext={() => setScreen("done")} onAudit={onAudit} />}
        {screen === "done" && <Done theCase={activeCase} onHome={goHome} />}
      </main>

      {toastMsg && <Toast msg={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
