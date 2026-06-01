export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseApiError(text) || response.statusText);
  }
  return response.json();
}

function parseApiError(text: string) {
  if (!text) return "";
  try {
    const data = JSON.parse(text) as { error?: unknown };
    return typeof data.error === "string" ? data.error : text;
  } catch {
    return text;
  }
}
