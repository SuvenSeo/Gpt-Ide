import { Bot, Bug, FileCheck2, Hammer, MessageSquareText, Send, Sparkles, WandSparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { applyPatchFromUi, sendAiAction } from "../actions";
import { useIdeStore } from "../store/ide-store";

const actions = [
  { title: "Explain", prompt: "Explain the selected code or active file clearly, including its role, data flow, and important edge cases.", icon: MessageSquareText },
  { title: "Fix", prompt: "Find defects in the selected code or active file, implement the smallest correct fix, and run relevant verification.", icon: Bug },
  { title: "Add tests", prompt: "Add meaningful automated tests for the selected code or active file using the repository's existing test conventions, then run them.", icon: FileCheck2 },
  { title: "Refactor", prompt: "Refactor the selected code or active file for clarity, maintainability, and performance without changing behavior, then verify it.", icon: WandSparkles },
  { title: "Build feature", prompt: "Implement the requested feature end-to-end in this workspace, inspect existing conventions first, and verify the result.", icon: Hammer },
  { title: "Review", prompt: "Perform a rigorous code review of the selected code or active file, prioritizing correctness, security, regressions, and missing tests.", icon: Sparkles },
];

export function AiPanel() {
  const open = useIdeStore((state) => state.aiPanelOpen);
  const setOpen = useIdeStore((state) => state.setAiPanelOpen);
  const activePath = useIdeStore((state) => state.activePath);
  const activeFile = useIdeStore((state) => state.openFiles.find((file) => file.path === state.activePath));
  const loading = useIdeStore((state) => state.loading.has("ai"));
  const [custom, setCustom] = useState("");
  const [patch, setPatch] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const focus = () => { setOpen(true); window.setTimeout(() => input.current?.focus(), 50); };
    window.addEventListener("gpt-ide:focus-ai", focus);
    return () => window.removeEventListener("gpt-ide:focus-ai", focus);
  }, [setOpen]);

  if (!open) return null;
  const submitCustom = () => {
    if (!custom.trim()) return;
    void sendAiAction(custom.trim());
    setCustom("");
  };

  return (
    <aside className="ai-panel">
      <div className="ai-header"><div><Bot size={17} /><strong>ChatGPT Actions</strong></div><button onClick={() => setOpen(false)} title="Close AI panel"><X size={15} /></button></div>
      <div className="ai-context">
        <span>Context</span>
        <strong>{activePath ?? "Workspace"}</strong>
        <small>{activeFile?.selection ? `${activeFile.selection.length} selected characters` : activeFile ? "Entire active file" : "Repository context"}</small>
      </div>
      <div className="ai-action-grid">
        {actions.map(({ title, prompt, icon: Icon }) => <button key={title} disabled={loading} onClick={() => void sendAiAction(prompt)}><Icon size={15} /><span>{title}</span></button>)}
      </div>
      <div className="ai-compose">
        <label htmlFor="ai-prompt">Custom task</label>
        <textarea id="ai-prompt" ref={input} value={custom} onChange={(event) => setCustom(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") submitCustom(); }} placeholder="Ask ChatGPT to implement, debug, review, or explain…" />
        <button className="primary-button" onClick={submitCustom} disabled={!custom.trim() || loading}><Send size={14} /> Send to ChatGPT</button>
      </div>
      <details className="patch-tool">
        <summary>Apply unified diff</summary>
        <textarea value={patch} onChange={(event) => setPatch(event.target.value)} placeholder="Paste a git-compatible unified diff…" />
        <button onClick={() => void applyPatchFromUi(patch)} disabled={!patch.trim()}>Apply with checkpoint</button>
      </details>
      <div className="ai-note">ChatGPT chooses and calls the workspace tools. File writes, patches, terminal commands, restores, and deletes require confirmation.</div>
    </aside>
  );
}
