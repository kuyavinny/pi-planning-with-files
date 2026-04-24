export const PLANNING_FILES = ["task_plan.md", "findings.md", "progress.md"] as const;

export type PlanningFileName = (typeof PLANNING_FILES)[number];

export type PlanningTemplate = "default" | "analytics";

export type PhaseStatus = "pending" | "in_progress" | "complete" | "failed" | "blocked" | "unknown";

export interface PlanningPaths {
  projectDir: string;
  taskPlanPath: string;
  findingsPath: string;
  progressPath: string;
}

export interface PlanningFilesState extends PlanningPaths {
  exists: {
    taskPlan: boolean;
    findings: boolean;
    progress: boolean;
  };
}

export interface EnsurePlanningFilesOptions {
  template?: PlanningTemplate;
  packageRoot?: string;
}

export interface EnsurePlanningFilesResult {
  projectDir: string;
  created: PlanningFileName[];
  existing: PlanningFileName[];
  skipped: PlanningFileName[];
}

export interface ReadOptions {
  maxBytes?: number;
}

export interface PhaseInfo {
  index: number;
  title: string;
  status: PhaseStatus;
  raw: string;
}

export type PlanDepth = "lightweight" | "standard" | "deep";

export interface ParsedTaskPlan {
  goal: string | null;
  currentPhase: string | null;
  depth: PlanDepth;
  phases: PhaseInfo[];
  errorsLogged: number;
  warnings: string[];
}

export interface PlanStatus {
  exists: boolean;
  projectDir: string;
  currentPhase: string | null;
  goal: string | null;
  depth: PlanDepth;
  phases: PhaseInfo[];
  counts: {
    total: number;
    complete: number;
    inProgress: number;
    pending: number;
    failed: number;
    blocked: number;
    unknown: number;
  };
  files: {
    taskPlan: boolean;
    findings: boolean;
    progress: boolean;
  };
  errorsLogged: number;
  recentProgress: string;
  planPreview: string;
  complete: boolean;
  warnings: string[];
}

export interface CompletionCheck {
  complete: boolean;
  total: number;
  completeCount: number;
  inProgress: number;
  pending: number;
  failed: number;
  blocked: number;
  unknown: number;
  message: string;
}

export interface ReminderState {
  progressReminderPending: boolean;
  findingsReminderPending: boolean;
  errorReminderPending: boolean;
  completionReminderCount: number;
  readLikeToolCount: number;
  lastToolErrorSignature?: string;
  repeatedErrorCount: number;
  errorPatterns: Record<string, string[]>;
}

export interface ExtensionState {
  active: boolean;
  paused: boolean;
  projectDir: string | null;
  reminders: ReminderState;
  lastUserIntent: "continue" | "pause" | "stop" | "unknown";
  planDepth: PlanDepth;
}

export interface TruncatedText {
  text: string;
  truncated: boolean;
  originalBytes: number;
  originalLines: number;
}

export interface Limits {
  maxBytes?: number;
  maxLines?: number;
}

export interface ContextOptions {
  planMaxBytes?: number;
  planMaxLines?: number;
  progressMaxBytes?: number;
  progressMaxLines?: number;
}

export interface CatchupReport {
  hasReport: boolean;
  sessionFile?: string;
  lastPlanningUpdate?: {
    file: PlanningFileName;
    entryId?: string;
    lineNumber?: number;
    timestamp?: string;
  };
  messages: CatchupMessage[];
  warnings: string[];
}

export interface CatchupMessage {
  role: "user" | "assistant" | "tool" | "custom";
  summary: string;
  timestamp?: string;
  entryId?: string;
}
