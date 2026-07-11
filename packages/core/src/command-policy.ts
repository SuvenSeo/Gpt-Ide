export class CommandPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandPolicyError";
  }
}

export interface ValidatedCommand {
  command: string;
  args: string[];
}

export class CommandPolicy {
  private readonly allowed: Set<string>;

  constructor(commands: Iterable<string>) {
    this.allowed = new Set([...commands].map((command) => command.trim()).filter(Boolean));
  }

  validate(command: string, args: readonly string[]): ValidatedCommand {
    if (!command || command.includes("\0")) {
      throw new CommandPolicyError("Executable is invalid.");
    }
    if (command.includes("/") || command.includes("\\")) {
      throw new CommandPolicyError("Executable paths are not allowed; use an allowlisted command name.");
    }
    if (!this.allowed.has(command)) {
      throw new CommandPolicyError(`Executable is not allowlisted: ${command}`);
    }
    const normalizedArgs = args.map((argument) => {
      if (argument.includes("\0")) {
        throw new CommandPolicyError("Command arguments cannot contain null bytes.");
      }
      return argument;
    });
    return { command, args: normalizedArgs };
  }

  values(): string[] {
    return [...this.allowed].toSorted();
  }
}
