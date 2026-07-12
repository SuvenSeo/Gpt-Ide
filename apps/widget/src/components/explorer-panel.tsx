import { ChevronDown, ChevronRight, File, FilePlus2, Folder, FolderOpen, FolderPlus, MoreHorizontal, RefreshCw } from "lucide-react";
import { createDirectory, createFile, deletePath, loadDirectory, openPath, refreshWorkspace, renamePath, toggleDirectory } from "../actions";
import { useIdeStore } from "../store/ide-store";
import type { WorkspaceEntry } from "../types";
import { PanelHeader } from "./panel-header";

function DirectoryChildren({ path, depth }: { path: string; depth: number }) {
  const entries = useIdeStore((state) => state.directories[path]);
  if (!entries) return <div className="tree-loading" style={{ paddingLeft: 12 + depth * 14 }}>Loading…</div>;
  return <>{entries.map((entry) => <TreeEntry key={entry.path} entry={entry} depth={depth} />)}</>;
}

function TreeEntry({ entry, depth }: { entry: WorkspaceEntry; depth: number }) {
  const expanded = useIdeStore((state) => state.expandedDirectories.has(entry.path));
  const activePath = useIdeStore((state) => state.activePath);
  const isDirectory = entry.type === "directory";
  const onOpen = async () => {
    if (isDirectory) await toggleDirectory(entry.path);
    else if (entry.type === "file") await openPath(entry.path);
  };
  const menu = async (event: React.MouseEvent) => {
    event.preventDefault();
    const action = window.prompt(`Action for ${entry.path}: rename, delete${isDirectory ? ", new-file, new-folder" : ""}`, "rename");
    if (action === "rename") await renamePath(entry.path);
    if (action === "delete") await deletePath(entry.path, isDirectory);
    if (action === "new-file" && isDirectory) await createFile(entry.path);
    if (action === "new-folder" && isDirectory) await createDirectory(entry.path);
  };
  return (
    <div>
      <button className={activePath === entry.path ? "tree-row active" : "tree-row"} style={{ paddingLeft: 8 + depth * 14 }} onClick={onOpen} onContextMenu={menu} title={entry.path}>
        <span className="tree-chevron">{isDirectory ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}</span>
        {isDirectory ? (expanded ? <FolderOpen size={15} /> : <Folder size={15} />) : <File size={14} />}
        <span className="tree-label">{entry.name}</span>
        <span className="tree-more" onClick={menu}><MoreHorizontal size={14} /></span>
      </button>
      {isDirectory && expanded ? <DirectoryChildren path={entry.path} depth={depth + 1} /> : null}
    </div>
  );
}

export function ExplorerPanel() {
  const summary = useIdeStore((state) => state.summary);
  const loading = useIdeStore((state) => state.loading.has("workspace"));
  return (
    <section className="side-panel">
      <PanelHeader title="Explorer" actions={<>
        <button title="New file" onClick={() => void createFile()}><FilePlus2 size={14} /></button>
        <button title="New folder" onClick={() => void createDirectory()}><FolderPlus size={14} /></button>
        <button title="Refresh" onClick={() => void Promise.all([refreshWorkspace(), loadDirectory(".")])}><RefreshCw size={14} className={loading ? "spin" : ""} /></button>
      </>} />
      <div className="workspace-caption">{summary?.name ?? "Workspace"}</div>
      <div className="tree"><DirectoryChildren path="." depth={0} /></div>
    </section>
  );
}
