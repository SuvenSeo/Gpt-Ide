import { Diff, GitBranch, RefreshCw } from "lucide-react";
import { loadGitDiff, openPath, refreshGit } from "../actions";
import { useIdeStore } from "../store/ide-store";
import { PanelHeader } from "./panel-header";

export function SourceControlPanel() {
  const status = useIdeStore((state) => state.gitStatus);
  const loading = useIdeStore((state) => state.loading.has("git"));
  return (
    <section className="side-panel">
      <PanelHeader title="Source Control" actions={<button title="Refresh" onClick={() => void refreshGit()}><RefreshCw size={14} className={loading ? "spin" : ""} /></button>} />
      <div className="scm-branch"><GitBranch size={14} /><strong>{status?.branch ?? "No branch"}</strong>{status ? <span>↑{status.ahead} ↓{status.behind}</span> : null}</div>
      <button className="wide-action" onClick={() => void loadGitDiff()}><Diff size={14} /> View workspace diff</button>
      <div className="scm-list">
        {(status?.files ?? []).map((file) => (
          <div key={file.path} className="scm-row">
            <button className="scm-file" onClick={() => void openPath(file.path)} title={file.path}>{file.path}</button>
            <button className="status-badge" onClick={() => void loadGitDiff(file.path)} title="View diff">{file.untracked ? "U" : `${file.indexStatus}${file.workTreeStatus}`.trim()}</button>
          </div>
        ))}
      </div>
      {!status?.isRepository ? <div className="empty-message">This workspace is not a Git repository.</div> : null}
    </section>
  );
}
