import fs from "node:fs";
import path from "node:path";

type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiConfig = {
  provider: "openai-compatible" | "deepseek" | "openai" | "gemini" | "claude";
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function getAiConfig(): AiConfig | null {
  const provider = resolveProvider();
  const apiKey = process.env.ARTIST_STUDIO_AI_API_KEY
    || process.env.DEEPSEEK_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.ANTHROPIC_API_KEY
    || "";
  if (!apiKey) return null;

  const baseUrl = (process.env.ARTIST_STUDIO_AI_BASE_URL || defaultBaseUrl(provider)).replace(/\/+$/, "");
  const model = process.env.ARTIST_STUDIO_AI_MODEL || defaultModel(provider);

  return { provider, apiKey, baseUrl, model };
}

export function aiSetupMessage() {
  return [
    "External model automation is not configured.",
    "Add one provider key to .env.local, then restart the dev server.",
    "Supported providers: openai-compatible, deepseek, openai, gemini, claude.",
    "Examples:",
    "DEEPSEEK_API_KEY=your_key",
    "GEMINI_API_KEY=your_key",
    "ANTHROPIC_API_KEY=your_key",
    "ARTIST_STUDIO_AI_PROVIDER=gemini",
    "ARTIST_STUDIO_AI_MODEL=gemini-1.5-pro"
  ].join("\n");
}

export async function callChatCompletion(messages: AiMessage[], options: { temperature?: number } = {}) {
  const config = getAiConfig();
  if (!config) throw new Error(aiSetupMessage());

  if (config.provider === "gemini") return callGemini(config, messages, options);
  if (config.provider === "claude") return callClaude(config, messages, options);
  return callOpenAiCompatible(config, messages, options);
}

export async function callMaterialMultimodalAnalysis(input: {
  filePath: string;
  fileName: string;
  mimeType: string;
  prompt: string;
}) {
  const config = getAiConfig();
  if (!config) throw new Error(aiSetupMessage());
  if (!isImageMime(input.mimeType, input.fileName)) {
    throw new Error(`Direct multimodal analysis is currently supported for image files only: ${input.fileName}`);
  }
  const bytes = fs.statSync(input.filePath).size;
  const maxBytes = readMegabyteLimit("ARTIST_STUDIO_MULTIMODAL_MAX_IMAGE_MB", 8) * 1024 * 1024;
  if (bytes > maxBytes) throw new Error(`Image is too large for direct multimodal analysis: ${input.fileName}`);

  const base64 = fs.readFileSync(input.filePath).toString("base64");
  if (config.provider === "gemini") return callGeminiVision(config, input.prompt, input.mimeType, base64);
  if (config.provider === "claude") return callClaudeVision(config, input.prompt, input.mimeType, base64);
  return callOpenAiVision(config, input.prompt, input.mimeType, base64);
}

function resolveProvider(): AiConfig["provider"] {
  const configured = process.env.ARTIST_STUDIO_AI_PROVIDER?.toLowerCase();
  if (configured === "gemini" || configured === "claude" || configured === "openai" || configured === "deepseek" || configured === "openai-compatible") {
    return configured;
  }
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.DEEPSEEK_API_KEY) return "deepseek";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "openai-compatible";
}

function defaultBaseUrl(provider: AiConfig["provider"]) {
  if (provider === "deepseek") return "https://api.deepseek.com/v1";
  if (provider === "gemini") return "https://generativelanguage.googleapis.com/v1beta";
  if (provider === "claude") return "https://api.anthropic.com/v1";
  return "https://api.openai.com/v1";
}

function defaultModel(provider: AiConfig["provider"]) {
  if (provider === "deepseek") return "deepseek-chat";
  if (provider === "gemini") return "gemini-1.5-pro";
  if (provider === "claude") return "claude-3-5-sonnet-latest";
  return "gpt-4o-mini";
}

function isImageMime(mimeType: string, fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return mimeType.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext);
}

function readMegabyteLimit(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.min(Math.trunc(value), 25)) : fallback;
}

async function callOpenAiCompatible(config: AiConfig, messages: AiMessage[], options: { temperature?: number }) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: options.temperature ?? 0.3
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI provider request failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned an empty response.");
  return { content, provider: config.provider, model: config.model };
}

async function callOpenAiVision(config: AiConfig, prompt: string, mimeType: string, base64: string) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
        ]
      }],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI provider vision request failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned an empty vision response.");
  return { content, provider: config.provider, model: config.model };
}

async function callGemini(config: AiConfig, messages: AiMessage[], options: { temperature?: number }) {
  const prompt = messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join("\n\n");
  const response = await fetch(`${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: options.temperature ?? 0.3 }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Gemini returned an empty response.");
  return { content, provider: config.provider, model: config.model };
}

async function callGeminiVision(config: AiConfig, prompt: string, mimeType: string, base64: string) {
  const response = await fetch(`${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64 } }
        ]
      }],
      generationConfig: { temperature: 0.2 }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini vision request failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Gemini returned an empty vision response.");
  return { content, provider: config.provider, model: config.model };
}

async function callClaude(config: AiConfig, messages: AiMessage[], options: { temperature?: number }) {
  const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const claudeMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content
    }));

  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 6000,
      temperature: options.temperature ?? 0.3,
      system,
      messages: claudeMessages.length > 0 ? claudeMessages : [{ role: "user", content: "Run the requested automation." }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude request failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    content?: { type?: string; text?: string }[];
  };
  const content = data.content?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Claude returned an empty response.");
  return { content, provider: config.provider, model: config.model };
}

async function callClaudeVision(config: AiConfig, prompt: string, mimeType: string, base64: string) {
  const response = await fetch(`${config.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 2000,
      temperature: 0.2,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } }
        ]
      }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Claude vision request failed (${response.status}): ${text}`);
  }

  const data = await response.json() as {
    content?: { type?: string; text?: string }[];
  };
  const content = data.content?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Claude returned an empty vision response.");
  return { content, provider: config.provider, model: config.model };
}
