import { supabase } from "../lib/supabase";
import { C } from "../lib/theme";
import { ChevronLeft, Link2, Lock } from "../lib/icons";
import { Btn, Card, ProtoNote } from "../components/ui";
import { CaseChatPanel } from "../components/CaseChatPanel";
import { useCaseThread, logActivity } from "../lib/useData";

export function CaseChatScreen({ theCase, currentUser, linkEnabled, onCopyLink, onToggleLink, onBack }) {
  const { messages, send } = useCaseThread(theCase?.ctrl);

  const toggleAi = async (enabled) => {
    await supabase.from("cases").update({ ai_enabled: enabled }).eq("ctrl", theCase.ctrl);
    await logActivity(currentUser.name, "AIエージェント操作の許可変更", theCase.ctrl, enabled ? "無効" : "許可", enabled ? "許可" : "無効");
  };

  return (
    <div className="mx-auto px-8 py-6" style={{ maxWidth: 900 }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={onBack} className="text-xs flex items-center gap-1 mb-1.5" style={{ color: C.sub }}><ChevronLeft size={13} />案件一覧へ</button>
          <h1 className="text-lg font-semibold" style={{ color: C.ink }}>{theCase?.customer} 様とのやり取り</h1>
          <div className="text-xs font-mono mt-0.5" style={{ color: C.sub }}>{theCase?.ctrl}</div>
        </div>
        <div className="flex items-center gap-2">
          <Btn variant="outline" icon={Link2} onClick={() => onCopyLink(theCase)}>先方用リンクをコピー</Btn>
          <Btn variant={linkEnabled ? "outline" : "danger"} icon={Lock} onClick={() => onToggleLink(theCase)}>
            {linkEnabled ? "リンクを無効化" : "リンクを有効化"}
          </Btn>
        </div>
      </div>
      <Card pad={false} style={{ height: 560 }} className="flex flex-col">
        <div className="p-4 flex-1 min-h-0">
          <CaseChatPanel
            messages={messages}
            onSend={send}
            viewerRole="internal" currentUserName={currentUser?.name}
            aiEnabled={theCase?.ai_enabled} showAiToggle onToggleAi={toggleAi}
          />
        </div>
      </Card>
      <div className="mt-4"><ProtoNote /></div>
    </div>
  );
}
