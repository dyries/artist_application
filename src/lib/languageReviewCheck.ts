const chinesePattern = /[\u3400-\u9fff]/;

export const aiClichePatterns = [
  /\bexplores the relationship\b/i,
  /\bunstable site\b/i,
  /\bacts as a space\b/i,
  /\binvestigates memory\b/i,
  /\bquestions boundaries\b/i,
  /\bcreates dialogue\b/i,
  /\bliminal\b/i,
  /\bembodied\b/i,
  /\bpoetic resonance\b/i,
  /\binterrogates\b/i,
  /\bproblematizes\b/i,
  /\bsite of\b/i
];

export function containsChinese(text: string) {
  return chinesePattern.test(text);
}

export function findAiCliches(text: string) {
  return aiClichePatterns
    .filter((pattern) => pattern.test(text))
    .map((pattern) => pattern.source.replace(/\\b/g, "").replace(/\\/g, ""));
}

export function concreteWritingReminder(cliches: string[]) {
  if (cliches.length === 0) return "";
  return [
    "Rewrite the marked application text with concrete facts instead of abstract application language.",
    "Name works, materials, image sources, places, archive objects, research actions, making methods, display formats, and expected outputs.",
    `Avoid these phrases or close variants: ${cliches.join(", ")}.`
  ].join(" ");
}
