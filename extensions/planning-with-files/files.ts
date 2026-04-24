import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  EnsurePlanningFilesOptions,
  EnsurePlanningFilesResult,
  PlanningFileName,
  PlanningFilesState,
  PlanningPaths,
  PlanningTemplate,
  ReadOptions,
} from "./types.js";
import { PLANNING_FILES } from "./types.js";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PACKAGE_ROOT = resolve(MODULE_DIR, "../..");

export function resolveProjectDir(cwd: string): string {
  return resolve(cwd || ".");
}

export function getPlanningPaths(projectDir: string): PlanningPaths {
  const root = resolveProjectDir(projectDir);
  return {
    projectDir: root,
    taskPlanPath: resolve(root, "task_plan.md"),
    findingsPath: resolve(root, "findings.md"),
    progressPath: resolve(root, "progress.md"),
  };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function getPlanningFilesState(projectDir: string): Promise<PlanningFilesState> {
  const paths = getPlanningPaths(projectDir);
  return {
    ...paths,
    exists: {
      taskPlan: await fileExists(paths.taskPlanPath),
      findings: await fileExists(paths.findingsPath),
      progress: await fileExists(paths.progressPath),
    },
  };
}

function getTemplateRoot(packageRoot = DEFAULT_PACKAGE_ROOT): string {
  return resolve(packageRoot, "skills/planning-with-files/templates");
}

function templatePathFor(file: PlanningFileName, template: PlanningTemplate, packageRoot?: string): string | null {
  const root = getTemplateRoot(packageRoot);
  if (template === "analytics") {
    if (file === "task_plan.md") return resolve(root, "analytics_task_plan.md");
    if (file === "findings.md") return resolve(root, "analytics_findings.md");
    return null;
  }
  return resolve(root, file);
}

function destinationPath(paths: PlanningPaths, file: PlanningFileName): string {
  if (file === "task_plan.md") return paths.taskPlanPath;
  if (file === "findings.md") return paths.findingsPath;
  return paths.progressPath;
}

function analyticsProgressTemplate(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `# Progress Log\n\n## Session: ${date}\n\n### Current Status\n- **Phase:** 1 - Data Discovery\n- **Started:** ${date}\n\n### Actions Taken\n-\n\n### Query Log\n| Query | Result Summary | Interpretation |\n|-------|---------------|----------------|\n\n### Errors\n| Error | Resolution |\n|-------|------------|\n`;
}

async function createFromTemplate(dest: string, file: PlanningFileName, template: PlanningTemplate, packageRoot?: string): Promise<void> {
  const source = templatePathFor(file, template, packageRoot);
  await mkdir(dirname(dest), { recursive: true });

  if (source) {
    if (!(await fileExists(source))) throw new Error(`Missing template: ${source}`);
    await copyFile(source, dest);
    return;
  }

  if (template === "analytics" && file === "progress.md") {
    await writeFile(dest, analyticsProgressTemplate(), "utf8");
    return;
  }

  throw new Error(`No template configured for ${file} (${template})`);
}

export async function ensurePlanningFiles(
  projectDir: string,
  options: EnsurePlanningFilesOptions = {},
): Promise<EnsurePlanningFilesResult> {
  const template = options.template ?? "default";
  const paths = getPlanningPaths(projectDir);
  const created: PlanningFileName[] = [];
  const existing: PlanningFileName[] = [];
  const skipped: PlanningFileName[] = [];

  for (const file of PLANNING_FILES) {
    const dest = destinationPath(paths, file);
    if (await fileExists(dest)) {
      existing.push(file);
      skipped.push(file);
      continue;
    }
    await createFromTemplate(dest, file, template, options.packageRoot);
    created.push(file);
  }

  return { projectDir: paths.projectDir, created, existing, skipped };
}

export async function readPlanningFile(
  projectDir: string,
  file: PlanningFileName,
  options: ReadOptions = {},
): Promise<string | null> {
  const dest = destinationPath(getPlanningPaths(projectDir), file);
  if (!(await fileExists(dest))) return null;
  const content = await readFile(dest, "utf8");
  if (!options.maxBytes || Buffer.byteLength(content, "utf8") <= options.maxBytes) return content;
  return content.slice(0, options.maxBytes);
}

export async function writePlanningFileIfMissing(path: string, content: string): Promise<"created" | "exists"> {
  if (await fileExists(path)) return "exists";
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  return "created";
}
