import { AlertTriangle, ChevronDown, ChevronUp, CirclePlay, TerminalSquare, Text, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { FormEvent } from "react";
import { executeCommand } from "../actions";
import { useIdeStore } from "../store/ide-store";
import type { BottomPanel as BottomPanelType } from "../types";

const tabs: Array<{ id: BottomPanelType; label: string; icon: typeof TerminalSquare }> = [
  { id: "terminal", label: "Terminal", icon: TerminalSquare },
  { id: "output", label: "Output", icon: Text },
  { id: "problems", label: "Problems", icon: AlertTriangle },
];

export function BottomPanel() {
  const panel = useIdeStore((state) => state.bottomPanel);
  const open = useIdeStore((state) => state.bottomPanelOpen);
  const setPanel = useIdeStore((state) => state.setBottomPanel);
  const commandLine = useIdeStore((state) => state.commandLine);
  const commandCwd = useIdeStore((state) => state.commandCwd);
  const setCommand = useIdeStore((state) => state.setCommand);
  const execution = useIdeStore((state) => state.execution);
  const output = useIdeStore((state) => state.output);
  const gitDiff = useIdeStore((state) => state.gitDiff);
  const error = useIdeStore((state) => state.error);
  const dirtyFiles = useIdeStore((state) => state.openFiles.filter((file) => file.dirty));
  const loading = useIdeStore((state) => state.loading.has("command"));
  const scroll = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [output, execution, gitDiff]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!loading) void executeCommand(commandLine, commandCwd);
  };

  return (
    <section className={open ? "bottom-panel open" : "bottom-panel"}>
      <div className="bottom-tabs">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={panel === id && open ? "bottom-tab active" : "bottom-tab"} onClick={() => setPanel(id, panel === id ? !open : true)}><Icon size={13} /> {label}</button>
        ))}
        <div className="bottom-spacer" />
        <button className="panel-control" onClick={() => setPanel(panel, !open)} title={open ? "Collapse panel" : "Expand panel"}>{open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</button>
        {open ? <button className="panel-control" onClick={() => setPanel(panel, false)} title="Close panel"><X size={14} /></button> : null}
      </div>
      {open ? <div className="bottom-content">
        {panel === "terminal" ? (
          <div className="terminal-view">
            <form className="command-form" onSubmit={submit}>
              <input className="cwd-input" value={commandCwd} onChange={(event) => setCommand(commandLine, event.target.value)} aria-label="Working directory" title="Workspace-relative working directory" />
              <span className="terminal-prompt">$</span>
              <input className="command-input" value={commandLine} onChange={(event) => setCommand(event.target.value)} placeholder="npm test" aria-label="Command" />
              <button type="submit" disabled={loading || !commandLine.trim()}><CirclePlay size={14} /> {loading ? "Running" : "Run"}</button>
            </form>
            <pre className="terminal-output" ref={scroll}>{output.join("\n") || "Commands run without a shell and are limited to the configured executable allowlist."}</pre>
            {execution ? <div className="execution-meta"><span className={execution.exitCode === 0 ? "success" : "failure"}>exit {execution.exitCode ?? execution.signal}</span><span>{execution.durationMs} ms</span>{execution.timedOut ? <span>timed out</span> : null}{execution.truncated ? <span>output truncated</span> : null}</div> : null}
          </div>
        ) : null}
        {panel === "output" ? <pre className="diff-output" ref={scroll}>{gitDiff || output.join("\n") || "No output."}</pre> : null}
        {panel === "problems" ? <div className="problems-list">
          {error ? <div className="problem-row error"><AlertTriangle size={14} /><span>{error}</span></div> : null}
          {dirtyFiles.map((file) => <div className="problem-row warning" key={file.path}><AlertTriangle size={14} /><span>Unsaved changes in {file.path}</span></div>)}
          {!error && dirtyFiles.length === 0 ? <div className="empty-message">No current problems.</div> : null}
        </div> : null}
      </div> : null}
    </section>
  );
}
