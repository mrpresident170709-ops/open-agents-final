export interface Ability {
  id: string;
  name: string;
  description: string;
  category: AbilityCategory;
  enabled: boolean;
  execute(context: AbilityContext): Promise<AbilityResult>;
}

export type AbilityCategory =
  | "code_analysis"
  | "code_generation"
  | "refactoring"
  | "testing"
  | "documentation"
  | "debugging"
  | "security"
  | "performance"
  | "architecture";

export interface AbilityContext {
  projectPath: string;
  files: string[];
  currentFile?: string;
  selection?: string;
  language?: string;
}

export interface AbilityResult {
  success: boolean;
  output: string;
  changes?: FileChange[];
  suggestions?: string[];
  metadata?: Record<string, unknown>;
}

export interface FileChange {
  path: string;
  type: "create" | "modify" | "delete";
  content?: string;
  oldContent?: string;
}

export abstract class BaseAbility implements Ability {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract category: AbilityCategory;
  abstract execute(context: AbilityContext): Promise<AbilityResult>;

  enabled = true;
}

export class CodeAnalysisAbility extends BaseAbility {
  id = "code_analysis";
  name = "Code Analysis";
  description = "Analyze code for issues, patterns, and quality metrics";
  category = "code_analysis" as const;

  async execute(context: AbilityContext): Promise<AbilityResult> {
    return {
      success: true,
      output: "Analyzing code structure and patterns...",
      suggestions: [
        "Consider extracting complex functions into smaller units",
        "Add type annotations for better type safety",
        "Review for potential null pointer issues",
      ],
    };
  }
}

export class RefactoringAbility extends BaseAbility {
  id = "refactoring";
  name = "Smart Refactoring";
  description = "Automatically refactor code for better readability and maintainability";
  category = "refactoring" as const;

  async execute(context: AbilityContext): Promise<AbilityResult> {
    return {
      success: true,
      output: "Identifying refactoring opportunities...",
      suggestions: [
        "Extract repeated code into shared utilities",
        "Rename unclear variable names",
        "Simplify complex conditional logic",
      ],
    };
  }
}

export class AutoTestAbility extends BaseAbility {
  id = "auto_test";
  name = "Auto Test Generation";
  description = "Automatically generate tests based on code changes";
  category = "testing" as const;

  async execute(context: AbilityContext): Promise<AbilityResult> {
    return {
      success: true,
      output: "Analyzing code to generate appropriate tests...",
      suggestions: [
        "Add unit tests for new functions",
        "Create integration tests for API endpoints",
        "Add edge case tests for complex logic",
      ],
    };
  }
}

export class DocGenAbility extends BaseAbility {
  id = "doc_gen";
  name = "Documentation Generator";
  description = "Generate documentation from code comments and structure";
  category = "documentation" as const;

  async execute(context: AbilityContext): Promise<AbilityResult> {
    return {
      success: true,
      output: "Generating documentation...",
      suggestions: [
        "Add JSDoc comments to exported functions",
        "Create README with setup instructions",
        "Document API endpoints",
      ],
    };
  }
}

export class SecurityScanAbility extends BaseAbility {
  id = "security_scan";
  name = "Security Scanner";
  description = "Scan for security vulnerabilities and best practices";
  category = "security" as const;

  async execute(context: AbilityContext): Promise<AbilityResult> {
    return {
      success: true,
      output: "Scanning for security issues...",
      suggestions: [
        "Review input validation",
        "Check for exposed secrets",
        "Verify authentication/authorization",
      ],
    };
  }
}

export class PerformanceAbility extends BaseAbility {
  id = "performance";
  name = "Performance Optimizer";
  description = "Identify and fix performance bottlenecks";
  category = "performance" as const;

  async execute(context: AbilityContext): Promise<AbilityResult> {
    return {
      success: true,
      output: "Analyzing performance characteristics...",
      suggestions: [
        "Consider caching expensive computations",
        "Review database queries for optimization",
        "Check for unnecessary re-renders",
      ],
    };
  }
}

export class ArchitectureAbility extends BaseAbility {
  id = "architecture";
  name = "Architecture Advisor";
  description = "Provide architectural recommendations and patterns";
  category = "architecture" as const;

  async execute(context: AbilityContext): Promise<AbilityResult> {
    return {
      success: true,
      output: "Analyzing architecture...",
      suggestions: [
        "Consider using dependency injection",
        "Evaluate state management approach",
        "Review component separation",
      ],
    };
  }
}

export class AbilityRegistry {
  private abilities: Map<string, Ability> = new Map();

  constructor() {
    this.registerDefaultAbilities();
  }

  private registerDefaultAbilities(): void {
    const abilities: Ability[] = [
      new CodeAnalysisAbility(),
      new RefactoringAbility(),
      new AutoTestAbility(),
      new DocGenAbility(),
      new SecurityScanAbility(),
      new PerformanceAbility(),
      new ArchitectureAbility(),
    ];

    for (const ability of abilities) {
      this.abilities.set(ability.id, ability);
    }
  }

  register(ability: Ability): void {
    this.abilities.set(ability.id, ability);
  }

  get(id: string): Ability | undefined {
    return this.abilities.get(id);
  }

  list(category?: AbilityCategory): Ability[] {
    const all = Array.from(this.abilities.values());
    return category ? all.filter((a) => a.category === category) : all;
  }

  enable(id: string): void {
    const ability = this.abilities.get(id);
    if (ability) ability.enabled = true;
  }

  disable(id: string): void {
    const ability = this.abilities.get(id);
    if (ability) ability.enabled = false;
  }

  async execute(
    id: string,
    context: AbilityContext,
  ): Promise<AbilityResult> {
    const ability = this.abilities.get(id);
    if (!ability) {
      return {
        success: false,
        output: `Ability "${id}" not found`,
      };
    }

    if (!ability.enabled) {
      return {
        success: false,
        output: `Ability "${id}" is disabled`,
      };
    }

    return ability.execute(context);
  }
}

export const globalAbilityRegistry = new AbilityRegistry();