import { Bot, Expand, GitBranch, LoaderCircle, PanelRight, Play, SaveAll, Search } from "lucide-react";
import { enterFullscreen, executeCommand, openPath, saveFile } from "../actions";
import { useIdeStore } from "../store/ide-store";

export function TopBar() {
  const summary = useIdeStore((state) => state.summary);
  const loading = useIdeStore((state) => state.loading.size > 0);
  const openFiles = useIdeStore((state) => state.openFiles);
  const aiPanelOpen = useIdeStore((state) => state.aiPanelOpen);
  const setAiPanelOpen = useIdeStore((state) => state.setAiPanelOpen);
  const setBottomPanel = useIdeStore((state) => state.setBottomPanel);

  const quickOpen = () => {
    const path = window.prompt("Quick open: enter a workspace-relative file path");
    if (path) void openPath(path);
  };
  const saveAll = () => void Promise.all(openFiles.filter((file) => file.dirty).map((file) => saveFile(file.path)));
  const runTests = () => {
    setBottomPanel("terminal", true);
    void executeCommand("npm test", ".");
  };

  return (
    <header className="top-bar">
      <div className="top-title"><Bot size={18} /><strong>GPT IDE</strong><span>/</span><span>{summary?.name ?? "workspace"}</span></div>
      <button className="command-center" onClick={quickOpen}><Search size={14} /><span>Search or open a file</span><kbd>Ctrl/⌘ P</kbd></button>
      <div className="top-actions">
        {summary?.isRepository ? <span className="branch-pill"><GitBranch size={13} />{summary.branch ?? "detached"}</span> : null}
        {loading ? <LoaderCircle size={15} className="spin" /> : null}
        <button onClick={saveAll} title="Save all"><SaveAll size={16} /></button>
        <button onClick={runTests} title="Run tests"><Play size={16} /></button>
        <button className={aiPanelOpen ? "active" : ""} onClick={() => setAiPanelOpen(!aiPanelOpen)} title="Toggle AI panel"><PanelRight size={16} /></button>
        <button onClick={() => void enterFullscreen()} title="Fullscreen"><Expand size={16} /></button>
      </div>
    </header>
  );
}
