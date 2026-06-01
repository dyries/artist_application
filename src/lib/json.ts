export function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON.");
  }
  return JSON.parse(text.slice(start, end + 1));
}

export function asListText(value: unknown) {
  if (Array.isArray(value)) return value.map(String).join("\n");
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value, null, 2);
}
