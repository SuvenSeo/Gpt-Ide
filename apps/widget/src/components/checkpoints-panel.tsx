import { Clock3, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { createCheckpoint, deleteCheckpoint, refreshCheckpoints, restoreCheckpoint } from "../actions";
import { useIdeStore } from "../store/ide-store";
import { PanelHeader } from "./panel-header";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CheckpointsPanel() {
  const checkpoints = useIdeStore((state) => state.checkpoints);
  const loading = useIdeStore((state) => state.loading.has("checkpoints"));
  return (
    <section className="side-panel">
      <PanelHeader title="Checkpoints" actions={<>
        <button title="Create checkpoint" onClick={() => void createCheckpoint()}><Plus size={14} /></button>
        <button title="Refresh" onClick={() => void refreshCheckpoints()}><RefreshCw size={14} className={loading ? "spin" : ""} /></button>
      </>} />
      <div className="checkpoint-list">
        {checkpoints.map((checkpoint) => (
          <article className="checkpoint-card" key={checkpoint.id}>
            <div className="checkpoint-title"><Clock3 size={14} /><strong>{checkpoint.label}</strong></div>
            <div className="checkpoint-meta">{new Date(checkpoint.createdAt).toLocaleString()} · {checkpoint.files.length} files · {formatBytes(checkpoint.bytes)}</div>
            <div className="checkpoint-actions">
              <button onClick={() => void restoreCheckpoint(checkpoint)}><RotateCcw size={13} /> Restore</button>
              <button onClick={() => void deleteCheckpoint(checkpoint)}><Trash2 size={13} /> Delete</button>
            </div>
          </article>
        ))}
      </div>
      {checkpoints.length === 0 ? <div className="empty-message">No checkpoints yet. GPT IDE creates them before destructive edits.</div> : null}
    </section>
  );
}
