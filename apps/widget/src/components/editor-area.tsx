import { Code2, FileCode2, Save, X } from "lucide-react";
import { openPath, saveFile } from "../actions";
import { CodeEditor } from "../editor/code-editor";
import { useIdeStore } from "../store/ide-store";

export function EditorArea() {
  const files = useIdeStore((state) => state.openFiles);
  const activePath = useIdeStore((state) => state.activePath);
  const setActivePath = useIdeStore((state) => state.setActivePath);
  const closeFile = useIdeStore((state) => state.closeFile);
  const updateFile = useIdeStore((state) => state.updateFile);
  const setSelection = useIdeStore((state) => state.setSelection);
  const active = files.find((file) => file.path === activePath);

  return (
    <main className="editor-region">
      <div className="editor-tabs" role="tablist">
        {files.map((file) => (
          <button key={file.path} role="tab" aria-selected={file.path === activePath} className={file.path === activePath ? "editor-tab active" : "editor-tab"} onClick={() => setActivePath(file.path)} title={file.path}>
            <FileCode2 size={13} />
            <span>{file.path.split("/").at(-1)}</span>
            {file.dirty ? <span className="dirty-dot" title="Unsaved" /> : null}
            <span className="tab-close" onClick={(event) => { event.stopPropagation(); if (!file.dirty || window.confirm(`Close ${file.path} without saving?`)) closeFile(file.path); }}><X size={12} /></span>
          </button>
        ))}
      </div>
      {active ? (
        <>
          <div className="editor-toolbar">
            <div className="breadcrumbs">{active.path.split("/").map((part, index, all) => <span key={`${part}-${index}`}>{part}{index < all.length - 1 ? <b>/</b> : null}</span>)}</div>
            <button className="toolbar-action" onClick={() => void saveFile(active.path)} disabled={!active.dirty} title="Save (Ctrl/Cmd+S)"><Save size={14} /> Save</button>
          </div>
          <div className="editor-canvas">
            <CodeEditor
              key={active.path}
              path={active.path}
              content={active.content}
              onChange={(content) => updateFile(active.path, content)}
              onSelection={(selection) => setSelection(active.path, selection)}
              onSave={() => void saveFile(active.path)}
            />
          </div>
        </>
      ) : (
        <div className="editor-welcome">
          <div className="welcome-mark"><Code2 size={38} /></div>
          <h1>GPT IDE</h1>
          <p>Open a file from Explorer or ask ChatGPT to inspect and modify the workspace.</p>
          <div className="welcome-actions">
            <button onClick={() => { const path = window.prompt("Open workspace-relative file"); if (path) void openPath(path); }}>Open file</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent("gpt-ide:focus-ai"))}>Ask ChatGPT</button>
          </div>
          <div className="shortcut-grid">
            <span>Save file</span><kbd>Ctrl/⌘ S</kbd>
            <span>Quick open</span><kbd>Ctrl/⌘ P</kbd>
            <span>Run command</span><kbd>Ctrl/⌘ J</kbd>
          </div>
        </div>
      )}
    </main>
  );
}
