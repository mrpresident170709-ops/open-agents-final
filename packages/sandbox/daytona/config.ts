export interface DaytonaSandboxConfig {
  name?: string;
  source?: {
    url: string;
    branch?: string;
    token?: string;
    newBranch?: string;
  };
  env?: Record<string, string>;
  githubToken?: string;
  gitUser?: { name: string; email: string };
  timeout?: number;
  language?: "typescript" | "javascript" | "python";
  snapshot?: string;
  hooks?: import("../interface").SandboxHooks;
  ports?: number[];
}
