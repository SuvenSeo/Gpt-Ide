import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { languageForPath } from "../lib/language";

interface CodeEditorProps {
  path: string;
  content: string;
  onChange(content: string): void;
  onSelection(selection: string): void;
  onSave(): void;
}

function languageExtension(path: string) {
  switch (languageForPath(path)) {
    case "typescript-jsx": return javascript({ typescript: true, jsx: true });
    case "typescript": return javascript({ typescript: true });
    case "javascript-jsx": return javascript({ jsx: true });
    case "javascript": return javascript();
    case "json": return json();
    case "html": return html();
    case "css": return css();
    case "markdown": return markdown();
    case "python": return python();
    default: return [];
  }
}

const editorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--editor-bg)", color: "var(--text-primary)" },
  ".cm-scroller": { overflow: "auto", fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.65" },
  ".cm-content": { caretColor: "var(--accent)", padding: "14px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
  ".cm-gutters": { backgroundColor: "var(--editor-bg)", color: "var(--text-muted)", border: "none", paddingLeft: "6px" },
  ".cm-activeLineGutter": { backgroundColor: "var(--surface-hover)", color: "var(--text-secondary)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--surface-hover) 55%, transparent)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": { backgroundColor: "var(--selection) !important" },
  "&.cm-focused": { outline: "none" },
});

export function CodeEditor({ path, content, onChange, onSelection, onSave }: CodeEditorProps) {
  const container = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onSelectionRef = useRef(onSelection);
  const onSaveRef = useRef(onSave);
  onChangeRef.current = onChange;
  onSelectionRef.current = onSelection;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!container.current) return undefined;
    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        languageExtension(path),
        editorTheme,
        keymap.of([
          { key: "Mod-s", preventDefault: true, run: () => { onSaveRef.current(); return true; } },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          if (update.selectionSet || update.docChanged) {
            const selection = update.state.selection.main;
            onSelectionRef.current(update.state.sliceDoc(selection.from, selection.to));
          }
        }),
      ],
    });
    const view = new EditorView({ state, parent: container.current });
    return () => view.destroy();
  }, [path]);

  return <div className="code-editor" ref={container} />;
}
