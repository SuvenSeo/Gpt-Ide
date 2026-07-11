import { useEffect } from "react";
import { initializeIde, openPath, saveUiState } from "../actions";
import { useIdeStore } from "../store/ide-store";
import { ActivityBar } from "./activity-bar";
import { AiPanel } from "./ai-panel";
import { BottomPanel } from "./bottom-panel";
import { EditorArea } from "./editor-area";
import { Sidebar } from "./sidebar";
import { StatusBar } from "./status-bar";
import { TopBar } from "./top-bar";

export function AppShell() {
  const error = useIdeStore((state) => state.error);
  const setActivityView = useIdeStore((state) => state.setActivityView);
  const setBottomPanel = useIdeStore((state) => state.setBottomPanel);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    void initializeIde().then((cleanup) => { unsubscribe = cleanup; });
    const keyboard = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        const path = window.prompt("Quick open: workspace-relative path");
        if (path) void openPath(path);
      }
      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        setBottomPanel("terminal", true);
      }
      if (event.key.toLowerCase() === "f" && event.shiftKey) {
        event.preventDefault();
        setActivityView("search");
      }
    };
    window.addEventListener("keydown", keyboard);
    const persist = window.setInterval(saveUiState, 2_000);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", keyboard);
      window.clearInterval(persist);
      saveUiState();
    };
  }, [setActivityView, setBottomPanel]);

  return (
    <div className="ide-app">
      <TopBar />
      <div className="ide-workbench">
        <ActivityBar />
        <Sidebar />
        <div className="center-stack">
          {error ? <div className="error-banner">{error}</div> : null}
          <EditorArea />
          <BottomPanel />
        </div>
        <AiPanel />
      </div>
      <StatusBar />
    </div>
  );
}
