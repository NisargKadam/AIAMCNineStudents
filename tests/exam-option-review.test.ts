import { describe, expect, it } from "vitest";
import { reviewOptionBalance } from "@/features/exam/option-review";

const options = ["a", "b", "c", "d"].map((id, i) => ({
  id,
  text: `A ${"clear ".repeat(i + 1)}choice`,
}));
function bank(correct: (index: number) => string) {
  return Array.from({ length: 40 }, (_, i) => ({
    kind: "mcq",
    options,
    correct: correct(i),
  }));
}

describe("MCQ editorial review", () => {
  it("catches a correct-is-longest pattern and its correct-is-shortest inverse", () => {
    expect(reviewOptionBalance(bank(() => "d"))).toMatchObject({
      hasLengthCue: true,
      guessRates: { longestCharacters: 1, longestWords: 1 },
    });
    expect(reviewOptionBalance(bank(() => "a"))).toMatchObject({
      hasLengthCue: true,
      guessRates: { shortestCharacters: 1, shortestWords: 1 },
    });
  });
  it("reports chance-level length guessing when answer ranks are balanced", () => {
    const result = reviewOptionBalance(bank((i) => options[i % 4].id));
    expect(result.lengthRanks).toEqual([10, 10, 10, 10]);
    expect(result.guessRates).toEqual({
      longestCharacters: 0.25,
      shortestCharacters: 0.25,
      longestWords: 0.25,
      shortestWords: 0.25,
    });
  });
  it("splits indistinguishable ties fairly and ignores non-MCQ tasks", () => {
    const tied = {
      kind: "mcq",
      options: options.map((o) => ({ ...o, text: "An equal length option" })),
      correct: "a",
    };
    const result = reviewOptionBalance([tied, { kind: "coding" }]);
    expect(result.total).toBe(1);
    expect(result.lengthRanks).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(result.hasLengthCue).toBe(false);
  });
});
