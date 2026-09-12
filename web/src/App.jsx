import { useEffect, useState } from "react";
import { firebaseReady } from "./lib/firebase";
import { useAuth } from "./lib/useAuth";
import { useCases, useProfiles, useAuditLogs, useThreadCounts, logActivity, pushSystemNote, createCase, toggleCaseLink, logAiCost } from "./lib/useData";
import { extractCase } from "./lib/extract";
import { C } from "./lib/theme";
import { FileSpreadsheet, ShieldCheck, LogOut, Info, LayoutDashboard, ChevronLeft } from "./lib/icons";
import { Btn, Toast } from "./components/ui";
import { AuthScreen, PendingApproval, SuspendedNotice } from "./screens/AuthScreen";
import { CustomerPortal } from "./screens/CustomerPortal";
import { Dashboard } from "./screens/Dashboard";
import { CaseChatScreen } from "./screens/CaseChatScreen";
import { AdminPanel } from "./screens/AdminPanel";
import {
  Stepper, UploadScreen, Processing, Review, WorkContent, Measurements, Preview, Done,
  toReviewFields, toDefectRows, toMeasRows, toPreviewDefaults,
} from "./screens/Workflow";
import { STEPS } from "./lib/mockWorkflow";

const parseCustomerToken = () => {
  const m = /^#\/customer\/(.+)$/.exec(window.location.hash || "");
  return m ? decodeURIComponent(m[1]) : null;
};

function MissingConfig() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#f0f2f5" }}>
      <div className="max-w-md text-sm rounded-lg border bg-white p-6" style={{ borderColor: C.line, color: C.ink }}>
        <div className="font-semibold mb-2">Firebaseの接続設定がありません</div>
        <p className="text-xs" style={{ color: C.sub }}>
          <code>.env.local</code>（または Vercel のプロジェクト環境変数）に
          <code>VITE_FIREBASE_*</code> の値を設定してください（<code>web/README.md</code> 参照）。
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

  if (!firebaseReady) return <MissingConfig />;
  if (customerToken) return <CustomerPortal token={customerToken} />;
  return <StaffApp />;
}

function StaffApp() {
  const auth = useAuth();
  const { cases } = useCases();
  const { profiles } = useProfiles();
  const { logs } = useAuditLogs();
  const threadCounts = useThreadCounts(cases);

  const [screen, setScreenRaw] = useState("dashboard");
  const [screenHistory, setScreenHistory] = useState([]); // 「戻る」用のスタック
  const [activeCase, setActiveCase] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toast = (m) => setToastMsg(m);

  // AI読み取り（Claude API）の状態。案件をまたいで残らないよう、案件を切り替える際にリセットする。
  const [extractStatus, setExtractStatus] = useState("idle"); // idle | loading | done | error
  const [extractError, setExtractError] = useState("");
  // 結果確認・作業内容・測定値の各画面での編集内容（AIの生の読み取り結果から初期化）。
  // ここで一元管理することで、画面を行き来しても編集内容が保持され、提出プレビューにも反映される。
  const [reviewFields, setReviewFields] = useState([]);
  const [workRows, setWorkRows] = useState([]);
  const [measRows, setMeasRows] = useState([]);
  const [previewData, setPreviewData] = useState(null); // 提出プレビューの基本情報（顧客名・出力等、編集可）
  const resetExtraction = () => {
    setExtractStatus("idle"); setExtractError("");
    setReviewFields([]); setWorkRows([]); setMeasRows([]); setPreviewData(null);
  };

  // 画面遷移は必ずこれを通す（forward）。前の画面をスタックに積んでおくことで「戻る」ができる。
  const navigate = (next) => {
    setScreenHistory((h) => [...h, screen]);
    setScreenRaw(next);
  };
  const goBack = () => {
    setScreenHistory((h) => {
      if (h.length === 0) { setScreenRaw("dashboard"); return h; }
      const copy = [...h];
      const prev = copy.pop();
      setScreenRaw(prev);
      return copy;
    });
  };

  if (auth.loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f0f2f5" }} />;
  }
  if (!auth.user) return <AuthScreen auth={auth} />;
  if (!auth.profile) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f0f2f5" }} />;
  if (auth.profile.status === "停止") return <SuspendedNotice onSignOut={auth.signOut} />;
  if (auth.profile.role === "pending") return <PendingApproval profile={auth.profile} onSignOut={auth.signOut} />;

  const currentUser = auth.profile;
  const canManage = currentUser.role !== "閲覧者";
  const isAdmin = currentUser.role === "管理者";
  const maxReached = STEPS.findIndex((s) => s.id === screen);
  const inFlow = !["dashboard", "admin", "casechat"].includes(screen);

  // 表示中の案件は cases 一覧のリアルタイム更新にも追従させる（linkEnabled/aiEnabled等の反映用）
  const activeCaseLive = activeCase ? cases.find((c) => c.ctrl === activeCase.ctrl) || activeCase : null;

  const openCase = (c, at) => {
    setActiveCase(c);
    resetExtraction();
    navigate(at);
    logActivity(currentUser.name, "案件を開いた", c.ctrl, "—", STEPS.find((s) => s.id === at)?.name || at);
    pushSystemNote(c, `${currentUser.name} が案件を開きました（${STEPS.find((s) => s.id === at)?.name || at}）。`);
  };

  const newCase = async (fields) => {
    const ctrl = `26MT${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const created = await createCase({
        ctrl, customer: fields?.customer || "新規案件（顧客名未設定）",
        kind: fields?.kind || "交流", rewind: !!fields?.rewind, spec: fields?.spec || "", owner: currentUser.name,
      });
      await logActivity(currentUser.name, "案件登録", ctrl, "—", created.customer);
      setActiveCase(created);
      resetExtraction();
      navigate("upload");
    } catch {
      toast("案件の作成に失敗しました");
    }
  };

  const openChat = (c) => { setActiveCase(c); navigate("casechat"); };
  const goHome = () => { setScreenRaw("dashboard"); setActiveCase(null); setScreenHistory([]); resetExtraction(); };

  // アップロードされたPDFをAI(Claude)に読み取らせる。結果は各確認画面(Review/WorkContent/Measurements)へ渡す。
  const startExtraction = async (file) => {
    if (!activeCase) return;
    setExtractError("");
    setExtractStatus("loading");
    navigate("processing");
    try {
      const { result, cost, truncated } = await extractCase(file, { customer: activeCase.customer, ctrl: activeCase.ctrl });
      const fields = toReviewFields(result?.fields);
      setReviewFields(fields);
      setWorkRows(toDefectRows(result?.defects));
      setMeasRows(toMeasRows(result?.measurements));
      setPreviewData(toPreviewDefaults(activeCase, fields));
      setExtractStatus("done");
      if (cost) logAiCost(activeCase, currentUser.name, cost).catch(() => {});
      if (truncated) toast("読み取り結果が多く、AIの出力上限に達した可能性があります。各画面の内容を漏れなくご確認ください。");
    } catch (e) {
      setExtractError(e?.message || "読み取りに失敗しました");
      setExtractStatus("error");
    }
  };

  const backToUpload = () => { resetExtraction(); goBack(); };

  const copyLink = async (c) => {
    if (!c.linkToken) { toast("先方用リンクがまだ発行されていません"); return; }
    const url = `${window.location.origin}${window.location.pathname}#/customer/${c.linkToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("先方用リンクをコピーしました");
    } catch {
      toast(url);
    }
  };

  const handleToggleLink = async (c) => {
    await toggleCaseLink(c);
  };

  const onAudit = (action, target, before, after) => {
    logActivity(currentUser.name, action, target, before, after);
    if (activeCaseLive) pushSystemNote(activeCaseLive, `${currentUser.name} が「${action}」を行いました（${target}${after && after !== "—" ? ` → ${after}` : ""}）`);
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
              <Info size={11} /> Excel・PDF・フォルダ保存は未接続のモックです（PDFの読み取りはAI連携済み）
            </div>
            {isAdmin && <Btn size="sm" variant="outline" icon={ShieldCheck} onClick={() => navigate("admin")}>管理者</Btn>}
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
              <div className="flex items-center gap-3">
                <button onClick={goBack} disabled={screenHistory.length === 0}
                  className="text-xs whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded border"
                  style={screenHistory.length === 0 ? { color: "#cbd5e1", borderColor: C.line, cursor: "default" } : { color: C.navy, borderColor: C.line2 }}>
                  <ChevronLeft size={13} />戻る
                </button>
                <Stepper current={screen} go={navigate} maxReached={maxReached} />
              </div>
              <button onClick={goHome} className="text-xs whitespace-nowrap flex items-center gap-1" style={{ color: C.sub }}><LayoutDashboard size={13} />一覧へ</button>
            </div>
          </div>
        )}
      </header>

      <main>
        {screen === "dashboard" && (
          <Dashboard cases={cases} profiles={profiles} threadCounts={threadCounts} currentUser={currentUser} canManage={canManage} isAdmin={isAdmin}
            onOpenCase={openCase} onNewCase={newCase} onAdmin={() => navigate("admin")} onOpenChat={openChat} onCopyLink={copyLink} />
        )}
        {screen === "admin" && isAdmin && (
          <AdminPanel profiles={profiles} cases={cases} threadCounts={threadCounts} currentUser={currentUser}
            onBack={goHome} onOpenChat={openChat} onCopyLink={copyLink} onToggleLink={handleToggleLink} logs={logs} toast={toast} />
        )}
        {screen === "casechat" && (
          <CaseChatScreen theCase={activeCaseLive} currentUser={currentUser} onCopyLink={copyLink} onToggleLink={handleToggleLink} onBack={goHome} />
        )}
        {screen === "upload" && <UploadScreen theCase={activeCaseLive} owners={profiles.filter((p) => p.role !== "pending").map((p) => p.name)} onStart={startExtraction} onAudit={onAudit} />}
        {screen === "processing" && <Processing theCase={activeCaseLive} status={extractStatus} error={extractError} onDone={() => navigate("review")} onBack={backToUpload} />}
        {screen === "review" && <Review fields={reviewFields} setFields={setReviewFields} onNext={() => navigate("work")} onAudit={onAudit} />}
        {screen === "work" && <WorkContent rows={workRows} setRows={setWorkRows} onNext={() => navigate("meas")} onAudit={onAudit} />}
        {screen === "meas" && <Measurements rows={measRows} setRows={setMeasRows} onNext={() => navigate("preview")} onAudit={onAudit} />}
        {screen === "preview" && (
          <Preview theCase={activeCaseLive} previewData={previewData} setPreviewData={setPreviewData}
            reviewFields={reviewFields} workRows={workRows} measRows={measRows} onNext={() => navigate("done")} onAudit={onAudit} />
        )}
        {screen === "done" && (
          <Done theCase={activeCaseLive} previewData={previewData} reviewFields={reviewFields} workRows={workRows} measRows={measRows}
            onHome={goHome} onAudit={onAudit} toast={toast} />
        )}
      </main>

      {toastMsg && <Toast msg={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  );
}
