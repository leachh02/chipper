// The home page's greetings, from greetings.md, where anyone can add one
import file from "../../greetings.md?raw";

export const MAX_GREETING_LENGTH = 60;

// The list items under "## Greetings"; everything else is notes
export function parseGreetings(markdown: string): string[] {
  const section = markdown.split(/^## Greetings\s*$/m)[1] ?? "";
  return section
    .split("\n")
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

export const GREETINGS = parseGreetings(file);

export function randomGreeting(random = Math.random): string {
  return GREETINGS[Math.floor(random() * GREETINGS.length)] ?? "Ready for a chip session?";
}
