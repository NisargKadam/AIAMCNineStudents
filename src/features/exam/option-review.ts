type ReviewQuestion = {
  kind: string;
  options?: { id: string; text: string }[];
  correct?: string | string[];
};

/** Expected successes when a candidate picks solely by option length, choosing
 * uniformly among ties. Only aggregate metrics leave this review. */
export function reviewOptionBalance(questions: readonly ReviewQuestion[]) {
  const mcqs = questions.filter((q) => q.kind === "mcq");
  const lengthRanks = [0, 0, 0, 0];
  const metrics = {
    longestCharacters: 0,
    shortestCharacters: 0,
    longestWords: 0,
    shortestWords: 0,
  };
  let maxCharacterSpread = 1;
  for (const q of mcqs) {
    const options = q.options!;
    const correctIndex = options.findIndex((o) => o.id === q.correct);
    if (options.length !== 4 || correctIndex < 0)
      throw new Error("Invalid MCQ review input.");
    const chars = options.map((o) => o.text.trim().length);
    const words = options.map((o) => o.text.trim().split(/\s+/).length);
    const correctLength = chars[correctIndex];
    const smaller = chars.filter((n) => n < correctLength).length;
    const tied = chars.filter((n) => n === correctLength).length;
    for (let rank = smaller; rank < smaller + tied; rank++)
      lengthRanks[rank] += 1 / tied;
    for (const [lengths, longest, shortest] of [
      [chars, "longestCharacters", "shortestCharacters"],
      [words, "longestWords", "shortestWords"],
    ] as const) {
      const max = Math.max(...lengths),
        min = Math.min(...lengths);
      if (lengths[correctIndex] === max)
        metrics[longest] += 1 / lengths.filter((n) => n === max).length;
      if (lengths[correctIndex] === min)
        metrics[shortest] += 1 / lengths.filter((n) => n === min).length;
    }
    maxCharacterSpread = Math.max(
      maxCharacterSpread,
      Math.max(...chars) / Math.max(1, Math.min(...chars)),
    );
  }
  const total = mcqs.length;
  const guessRates = Object.fromEntries(
    Object.entries(metrics).map(([key, correct]) => [
      key,
      total ? correct / total : 0,
    ]),
  ) as Record<keyof typeof metrics, number>;
  return {
    total,
    lengthRanks,
    guessRates,
    maxCharacterSpread,
    hasLengthCue:
      Object.values(guessRates).some((rate) => rate > 0.325) ||
      maxCharacterSpread > 1.6,
  };
}
