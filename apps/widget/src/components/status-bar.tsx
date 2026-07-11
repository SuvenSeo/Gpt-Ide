import { AlertCircle, CheckCircle2, GitBranch, HardDrive, ShieldCheck } from "lucide-react";
import { useIdeStore } from "../store/ide-store";

export function StatusBar() {
  const summary = useIdeStore((state) => state.summary);
  const active = useIdeStore((state) => state.openFiles.find((file) => file.path === state.activePath));
  const error = useIdeStore((state) => state.error);
  return <footer className="status-bar">
    <span><GitBranch size={12} />{summary?.branch ?? "No Git branch"}</span>
    <span><ShieldCheck size={12} />Sandboxed workspace</span>
    <span><HardDrive size={12} />{summary?.changedFiles ?? 0} changes</span>
    <span className="status-spacer" />
    {error ? <span className="status-error"><AlertCircle size={12} />Error</span> : <span><CheckCircle2 size={12} />Ready</span>}
    {active ? <span>UTF-8 · {active.size} bytes</span> : null}
  </footer>;
}
