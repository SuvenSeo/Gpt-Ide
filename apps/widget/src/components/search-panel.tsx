import { CaseSensitive, FileSearch, Regex, Search } from "lucide-react";
import { useState } from "react";
import { openPath, runWorkspaceSearch } from "../actions";
import { useIdeStore } from "../store/ide-store";
import { PanelHeader } from "./panel-header";

export function SearchPanel() {
  const existingQuery = useIdeStore((state) => state.searchQuery);
  const matches = useIdeStore((state) => state.searchMatches);
  const truncated = useIdeStore((state) => state.searchTruncated);
  const loading = useIdeStore((state) => state.loading.has("search"));
  const [query, setQuery] = useState(existingQuery);
  const [filePattern, setFilePattern] = useState("");
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const submit = () => void runWorkspaceSearch(query, { regex, caseSensitive, filePattern: filePattern || undefined });
  return (
    <section className="side-panel">
      <PanelHeader title="Search" />
      <div className="search-form">
        <div className="input-with-actions">
          <Search size={14} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="Search workspace" />
          <button className={caseSensitive ? "toggle active" : "toggle"} onClick={() => setCaseSensitive(!caseSensitive)} title="Match case"><CaseSensitive size={14} /></button>
          <button className={regex ? "toggle active" : "toggle"} onClick={() => setRegex(!regex)} title="Regular expression"><Regex size={14} /></button>
        </div>
        <div className="input-with-actions"><FileSearch size={14} /><input value={filePattern} onChange={(event) => setFilePattern(event.target.value)} placeholder="Files to include, e.g. src/**/*.ts" /></div>
        <button className="primary-button" onClick={submit} disabled={!query.trim() || loading}>{loading ? "Searching…" : "Search"}</button>
      </div>
      <div className="result-summary">{matches.length} results{truncated ? " (truncated)" : ""}</div>
      <div className="search-results">
        {matches.map((match, index) => (
          <button key={`${match.path}:${match.line}:${index}`} className="search-result" onClick={() => void openPath(match.path)}>
            <div><strong>{match.path}</strong><span>:{match.line}:{match.column}</span></div>
            <code>{match.text}</code>
          </button>
        ))}
      </div>
    </section>
  );
}
