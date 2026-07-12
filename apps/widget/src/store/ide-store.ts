import { create } from "zustand";
import type {
  ActivityView,
  BottomPanel,
  Checkpoint,
  CommandExecution,
  GitStatus,
  OpenFile,
  SearchMatch,
  WorkspaceEntry,
  WorkspaceSummary,
} from "../types";

interface IdeState {
  summary: WorkspaceSummary | undefined;
  directories: Record<string, WorkspaceEntry[]>;
  expandedDirectories: Set<string>;
  openFiles: OpenFile[];
  activePath: string | undefined;
  activityView: ActivityView;
  bottomPanel: BottomPanel;
  bottomPanelOpen: boolean;
  aiPanelOpen: boolean;
  loading: Set<string>;
  error: string | undefined;
  searchQuery: string;
  searchMatches: SearchMatch[];
  searchTruncated: boolean;
  gitStatus: GitStatus | undefined;
  gitDiff: string;
  checkpoints: Checkpoint[];
  commandLine: string;
  commandCwd: string;
  commandHistory: string[];
  execution: CommandExecution | undefined;
  output: string[];
  setSummary: (summary: WorkspaceSummary) => void;
  setDirectory: (path: string, entries: WorkspaceEntry[]) => void;
  toggleDirectory: (path: string) => void;
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  setActivePath: (path: string | undefined) => void;
  updateFile: (path: string, content: string) => void;
  markFileSaved: (path: string, hash: string, modifiedAt: string, size: number) => void;
  setSelection: (path: string, selection: string) => void;
  setActivityView: (view: ActivityView) => void;
  setBottomPanel: (panel: BottomPanel, open?: boolean) => void;
  setAiPanelOpen: (open: boolean) => void;
  setLoading: (key: string, active: boolean) => void;
  setError: (error: string | undefined) => void;
  setSearch: (query: string, matches: SearchMatch[], truncated: boolean) => void;
  setGit: (status: GitStatus, diff?: string) => void;
  setGitDiff: (diff: string) => void;
  setCheckpoints: (checkpoints: Checkpoint[]) => void;
  setCommand: (line: string, cwd?: string) => void;
  setExecution: (execution: CommandExecution, command: string) => void;
  addOutput: (message: string) => void;
}

function updateSet(source: Set<string>, key: string, add: boolean): Set<string> {
  const next = new Set(source);
  if (add) next.add(key);
  else next.delete(key);
  return next;
}

export const useIdeStore = create<IdeState>((set) => ({
  summary: undefined,
  directories: {},
  expandedDirectories: new Set(["."]),
  openFiles: [],
  activePath: undefined,
  activityView: "explorer",
  bottomPanel: "terminal",
  bottomPanelOpen: true,
  aiPanelOpen: true,
  loading: new Set(),
  error: undefined,
  searchQuery: "",
  searchMatches: [],
  searchTruncated: false,
  gitStatus: undefined,
  gitDiff: "",
  checkpoints: [],
  commandLine: "npm test",
  commandCwd: ".",
  commandHistory: [],
  execution: undefined,
  output: [],
  setSummary: (summary) => set((state) => ({ summary, directories: { ...state.directories, ".": summary.entries } })),
  setDirectory: (path, entries) => set((state) => ({ directories: { ...state.directories, [path]: entries } })),
  toggleDirectory: (path) => set((state) => ({ expandedDirectories: updateSet(state.expandedDirectories, path, !state.expandedDirectories.has(path)) })),
  openFile: (file) => set((state) => {
    const exists = state.openFiles.some((entry) => entry.path === file.path);
    return { openFiles: exists ? state.openFiles : [...state.openFiles, file], activePath: file.path };
  }),
  closeFile: (path) => set((state) => {
    const index = state.openFiles.findIndex((file) => file.path === path);
    const openFiles = state.openFiles.filter((file) => file.path !== path);
    const activePath = state.activePath === path
      ? (openFiles[Math.max(0, index - 1)]?.path ?? openFiles[0]?.path)
      : state.activePath;
    return { openFiles, activePath };
  }),
  setActivePath: (activePath) => set({ activePath }),
  updateFile: (path, content) => set((state) => ({
    openFiles: state.openFiles.map((file) => file.path === path
      ? { ...file, content, dirty: content !== file.savedContent }
      : file),
  })),
  markFileSaved: (path, hash, modifiedAt, size) => set((state) => ({
    openFiles: state.openFiles.map((file) => file.path === path
      ? { ...file, hash, modifiedAt, size, savedContent: file.content, dirty: false }
      : file),
  })),
  setSelection: (path, selection) => set((state) => ({
    openFiles: state.openFiles.map((file) => file.path === path ? { ...file, selection } : file),
  })),
  setActivityView: (activityView) => set({ activityView }),
  setBottomPanel: (bottomPanel, open = true) => set({ bottomPanel, bottomPanelOpen: open }),
  setAiPanelOpen: (aiPanelOpen) => set({ aiPanelOpen }),
  setLoading: (key, active) => set((state) => ({ loading: updateSet(state.loading, key, active) })),
  setError: (error) => set({ error }),
  setSearch: (searchQuery, searchMatches, searchTruncated) => set({ searchQuery, searchMatches, searchTruncated }),
  setGit: (gitStatus, gitDiff) => set((state) => ({ gitStatus, gitDiff: gitDiff ?? state.gitDiff })),
  setGitDiff: (gitDiff) => set({ gitDiff }),
  setCheckpoints: (checkpoints) => set({ checkpoints }),
  setCommand: (commandLine, commandCwd) => set((state) => ({ commandLine, commandCwd: commandCwd ?? state.commandCwd })),
  setExecution: (execution, command) => set((state) => ({
    execution,
    commandHistory: [command, ...state.commandHistory.filter((item) => item !== command)].slice(0, 30),
    output: [...state.output, `$ ${command}`, execution.stdout, execution.stderr].filter(Boolean),
  })),
  addOutput: (message) => set((state) => ({ output: [...state.output, message] })),
}));
