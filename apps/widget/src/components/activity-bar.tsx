import { Boxes, Files, GitBranch, History, Search, Sparkles } from "lucide-react";
import type { ActivityView } from "../types";
import { useIdeStore } from "../store/ide-store";

const activities: Array<{ id: ActivityView; label: string; icon: typeof Files }> = [
  { id: "explorer", label: "Explorer", icon: Files },
  { id: "search", label: "Search", icon: Search },
  { id: "source-control", label: "Source control", icon: GitBranch },
  { id: "checkpoints", label: "Checkpoints", icon: History },
];

export function ActivityBar() {
  const active = useIdeStore((state) => state.activityView);
  const setActive = useIdeStore((state) => state.setActivityView);
  const aiPanelOpen = useIdeStore((state) => state.aiPanelOpen);
  const setAiPanelOpen = useIdeStore((state) => state.setAiPanelOpen);
  return (
    <nav className="activity-bar" aria-label="Primary workspace views">
      <div className="activity-brand" title="GPT IDE"><Boxes size={21} /></div>
      <div className="activity-items">
        {activities.map(({ id, label, icon: Icon }) => (
          <button key={id} className={active === id ? "activity-button active" : "activity-button"} onClick={() => setActive(id)} title={label} aria-label={label}>
            <Icon size={20} />
          </button>
        ))}
      </div>
      <button className={aiPanelOpen ? "activity-button active" : "activity-button"} onClick={() => setAiPanelOpen(!aiPanelOpen)} title="AI actions" aria-label="AI actions">
        <Sparkles size={20} />
      </button>
    </nav>
  );
}
