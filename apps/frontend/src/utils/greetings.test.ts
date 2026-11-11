import { describe, expect, it } from "vitest";
import { GREETINGS, MAX_GREETING_LENGTH, parseGreetings, randomGreeting } from "./greetings";

describe("parseGreetings", () => {
  it("takes the list items under Greetings and ignores the notes above", () => {
    const markdown = "# Title\n\n- A rule, not a greeting\n\n## Greetings\n\n- Got chip?\n-   Chip for days  \nstray text\n- \n";
    expect(parseGreetings(markdown)).toEqual(["Got chip?", "Chip for days"]);
  });
});

// Checks everyone's additions to greetings.md
describe("greetings.md", () => {
  it("has greetings", () => {
    expect(GREETINGS.length).toBeGreaterThan(0);
  });

  it.each(GREETINGS)("%s fits on the home page as plain text", (greeting) => {
    expect(greeting.length).toBeLessThanOrEqual(MAX_GREETING_LENGTH);
    expect(greeting).not.toMatch(/[*_`[\]<>]/);
  });

  it("has no repeats", () => {
    const lower = GREETINGS.map((g) => g.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });
});

describe("randomGreeting", () => {
  it("picks from the list", () => {
    expect(randomGreeting(() => 0)).toBe(GREETINGS[0]);
    expect(randomGreeting(() => 0.9999)).toBe(GREETINGS[GREETINGS.length - 1]);
  });
});
