import { z } from "zod";

const chatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
});

interface ModelRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

function getModelConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim();
  const baseUrl = process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1";
  const siteUrl = process.env.OPENROUTER_SITE_URL?.trim();
  const siteName = process.env.OPENROUTER_SITE_NAME?.trim();

  if (!apiKey || !model) {
    return null;
  }

  return {
    apiKey,
    model,
    baseUrl: baseUrl.replace(/\/$/, ""),
    siteUrl,
    siteName,
  };
}

function extractJsonCandidate(content: string): string | null {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i) ?? content.match(/```\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectStart = content.indexOf("{");
  const objectEnd = content.lastIndexOf("}");

  if (objectStart !== -1 && objectEnd > objectStart) {
    return content.slice(objectStart, objectEnd + 1).trim();
  }

  return null;
}

async function requestModelCompletion(input: ModelRequest): Promise<string | null> {
  const config = getModelConfig();

  if (!config) {
    return null;
  }

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(config.siteUrl ? { "HTTP-Referer": config.siteUrl } : {}),
        ...(config.siteName ? { "X-Title": config.siteName } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        temperature: input.temperature ?? 0.3,
        messages: [
          {
            role: "system",
            content: input.systemPrompt,
          },
          {
            role: "user",
            content: input.userPrompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return null;
    }

    const parsed = chatCompletionSchema.safeParse(await response.json());

    if (!parsed.success) {
      return null;
    }

    return parsed.data.choices[0]?.message.content?.trim() || null;
  } catch {
    return null;
  }
}

export function isModelConfigured(): boolean {
  return getModelConfig() !== null;
}

export async function generateObjectWithModel<T>(input: {
  schema: z.ZodType<T>;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}): Promise<T | null> {
  const content = await requestModelCompletion({
    systemPrompt: `${input.systemPrompt}\nReturn valid JSON only. Do not wrap the response in markdown fences.`,
    userPrompt: input.userPrompt,
    temperature: input.temperature ?? 0.2,
  });

  if (!content) {
    return null;
  }

  const jsonCandidate = extractJsonCandidate(content) ?? content;

  try {
    const parsedJson = JSON.parse(jsonCandidate);
    const parsedObject = input.schema.safeParse(parsedJson);

    if (!parsedObject.success) {
      return null;
    }

    return parsedObject.data;
  } catch {
    return null;
  }
}

