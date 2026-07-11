import { useIdeStore } from "../store/ide-store";
import { CheckpointsPanel } from "./checkpoints-panel";
import { ExplorerPanel } from "./explorer-panel";
import { SearchPanel } from "./search-panel";
import { SourceControlPanel } from "./source-control-panel";

export function Sidebar() {
  const view = useIdeStore((state) => state.activityView);
  return <aside className="sidebar">
    {view === "explorer" ? <ExplorerPanel /> : null}
    {view === "search" ? <SearchPanel /> : null}
    {view === "source-control" ? <SourceControlPanel /> : null}
    {view === "checkpoints" ? <CheckpointsPanel /> : null}
  </aside>;
}
