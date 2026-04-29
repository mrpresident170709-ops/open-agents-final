export enum PermissionOptionKind {
  AllowOnce = "allow_once",
  AllowAlways = "allow_always",
  Reject = "reject",
  RejectAlways = "reject_always",
}

export interface PermissionOption {
  id: string;
  title: string;
  kind: PermissionOptionKind;
}

export interface ToolPermissionContext {
  toolName: string;
  inputValues: string[];
  scope: ToolPermissionScope;
}

export enum ToolPermissionScope {
  ToolInput = "tool_input",
  SymlinkTarget = "symlink_target",
}

export enum ToolPermissionDecision {
  Allow = "allow",
  Deny = "deny",
}

export interface ToolPermissionRule {
  toolName: string;
  pattern: string;
  decision: ToolPermissionDecision;
  createdAt: number;
}

export interface PermissionRequest {
  toolCallId: string;
  toolName: string;
  inputValues: string[];
  options: PermissionOption[];
}

export interface PermissionResponse {
  optionId: string;
  params?: Record<string, unknown>;
}

export class ToolPermissionManager {
  private alwaysAllowRules: ToolPermissionRule[];
  private alwaysDenyRules: ToolPermissionRule[];

  constructor() {
    this.alwaysAllowRules = [];
    this.alwaysDenyRules = [];
  }

  addRule(rule: ToolPermissionRule): void {
    const rules =
      rule.decision === ToolPermissionDecision.Allow
        ? this.alwaysAllowRules
        : this.alwaysDenyRules;
    rules.push(rule);
  }

  removeRule(toolName: string, pattern: string): boolean {
    const rules = [this.alwaysAllowRules, this.alwaysDenyRules];
    for (const list of rules) {
      const index = list.findIndex(
        (r) => r.toolName === toolName && r.pattern === pattern,
      );
      if (index !== -1) {
        list.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  getRules(): ReadonlyArray<ToolPermissionRule> {
    return [...this.alwaysAllowRules, ...this.alwaysDenyRules];
  }

  checkPermission(
    toolName: string,
    inputValues: string[],
  ): ToolPermissionDecision | null {
    for (const value of inputValues) {
      for (const rule of this.alwaysDenyRules) {
        if (rule.toolName === toolName && this.matchesPattern(rule.pattern, value)) {
          return ToolPermissionDecision.Deny;
        }
      }

      for (const rule of this.alwaysAllowRules) {
        if (rule.toolName === toolName && this.matchesPattern(rule.pattern, value)) {
          return ToolPermissionDecision.Allow;
        }
      }
    }

    return null;
  }

  buildOptions(
    toolName: string,
    inputValues: string[],
    includeAlwaysOptions = true,
  ): PermissionOption[] {
    const options: PermissionOption[] = [];

    if (includeAlwaysOptions) {
      options.push({
        id: `always_allow:${toolName}`,
        title: `Always for ${toolName.replace(/_/g, " ")}`,
        kind: PermissionOptionKind.AllowAlways,
      });

      options.push({
        id: `always_deny:${toolName}`,
        title: `Always deny ${toolName.replace(/_/g, " ")}`,
        kind: PermissionOptionKind.RejectAlways,
      });
    }

    options.push({
      id: "allow",
      title: "Yes",
      kind: PermissionOptionKind.AllowOnce,
    });

    options.push({
      id: "deny",
      title: "No",
      kind: PermissionOptionKind.Reject,
    });

    return options;
  }

  private matchesPattern(pattern: string, value: string): boolean {
    try {
      const regex = new RegExp(pattern, "i");
      return regex.test(value);
    } catch {
      return false;
    }
  }

  clear(): void {
    this.alwaysAllowRules = [];
    this.alwaysDenyRules = [];
  }
}
