// Server-only Anthropic client helper. Never import from client code.
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5";

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnthropicCallOptions {
  system?: string;
  messages: AnthropicMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callAnthropic(opts: AnthropicCallOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.7,
      system: opts.system,
      messages: opts.messages,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${txt.slice(0, 500)}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  return data.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!)
    .join("");
}
