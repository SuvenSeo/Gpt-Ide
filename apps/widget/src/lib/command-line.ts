export interface ParsedCommand {
  executable: string;
  args: string[];
}

export function parseCommandLine(input: string): ParsedCommand {
  const value = input.trim();
  if (!value) throw new Error("Enter a command.");
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  let escaping = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";
    const next = value[index + 1] ?? "";
    if (escaping) {
      current += character;
      escaping = false;
      continue;
    }
    if (character === "\\" && quote !== "'") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = undefined;
      else current += character;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if ([";", "|", ">", "<", "`"].includes(character) || (character === "&" && next === "&")) {
      throw new Error("Shell operators are not supported. Run one executable with explicit arguments.");
    }
    if (/\s/.test(character)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += character;
  }

  if (quote) throw new Error("Unclosed quote in command.");
  if (escaping) current += "\\";
  if (current) tokens.push(current);
  const [executable, ...args] = tokens;
  if (!executable) throw new Error("Enter a command.");
  return { executable, args };
}
