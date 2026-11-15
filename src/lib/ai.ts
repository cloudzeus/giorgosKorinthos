// Automatic content about Corinth and the wider region, written in Greek, English and German in one pass.
// Works with any OpenAI-compatible chat API (OpenRouter by default). Server only.
import { z } from "zod";
import { db } from "./db";
import { locales } from "./i18n";
import { AI_MODELS, getSettings } from "./settings";

/** Subjects the generator rotates through. When all are used, it asks the model for a fresh angle. */
export const TOPICS = [
  "Ancient Corinth: the temple of Apollo, the Roman forum and the Peirene fountain",
  "Acrocorinth: walking the fortress above the city",
  "The Corinth Canal: history of the cut and where to see it from",
  "Loutraki: thermal springs and the seafront",
  "Nemea: the ancient stadium and the Agiorgitiko wine roads",
  "Lake Vouliagmeni and the Heraion of Perachora",
  "Ancient Isthmia and the Isthmian Games",
  "The ancient harbours of Lechaion and Kenchreai",
  "Lake Stymphalia and the mountains of Corinthia",
  "Corinthian raisins, olive oil and what to eat in the region",
  "The apostle Paul in Corinth: the Bema and the sites linked to him",
  "A day trip from Corinth to Mycenae, Nafplio and Epidaurus",
  "Beaches of the Corinthian and Saronic gulfs near Corinth",
  "Corinth through the seasons: when to visit and what changes",
  "The Diolkos: the ancient paved trackway across the Isthmus",
];

const localized = z.object({
  title: z.string().min(8).max(120),
  excerpt: z.string().min(40).max(320),
  body: z.string().min(600),
  metaTitle: z.string().min(8).max(70),
  metaDescription: z.string().min(50).max(170),
});
const generated = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  el: localized,
  en: localized,
  de: localized,
});

const SYSTEM = `You write the travel journal of Ephyria Lux, a private villa in Examilia, Corinth, Greece.
Write one article about the given subject for guests planning their days in the region.
Voice: calm, precise, editorial. Short sentences. No exclamation marks, no superlatives, no emoji, no hype.
Rules:
- Only well-established facts about the place. If you are not sure of a date, a number, an opening time or a price, leave it out. Never invent opening hours, ticket prices, distances or driving times.
- Never describe the villa's amenities, prices, rooms or services. You may say the place is a short drive from the villa, nothing more specific.
- Write the article three times: Greek (el), English (en), German (de). Each version is written natively for its readers, not translated word for word, and uses the local spelling of place names.
- body: 450 to 650 words in Markdown, using only paragraphs and "## " subheadings (three or four). No lists, links, images or bold.
- slug: lowercase English words joined by hyphens.
Reply with one JSON object and nothing else:
{"slug":"...","el":{"title","excerpt","body","metaTitle","metaDescription"},"en":{...},"de":{...}}`;

/** OpenRouter endpoint, key and model. The address is fixed; the model is one of the DeepSeek V4 choices. */
export async function aiConfig() {
  const s = await getSettings();
  const model = AI_MODELS.find((option) => option.value === s.AI_MODEL)?.value ?? AI_MODELS[0].value;
  return { key: s.AI_API_KEY, model, url: (process.env.AI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""), publish: s.AI_AUTO_PUBLISH === "true" };
}

export async function aiConfigured() {
  return Boolean((await aiConfig()).key);
}

/** Pull the first JSON object out of a model reply (some models wrap it in a code fence). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The model did not return JSON");
  return JSON.parse(text.slice(start, end + 1));
}

async function nextTopic(): Promise<string> {
  const used = new Set((await db.article.findMany({ select: { topic: true } })).map((article) => article.topic));
  const unused = TOPICS.find((topic) => !used.has(topic));
  if (unused) return unused;
  const titles = await db.articleTranslation.findMany({ where: { locale: "en" }, select: { title: true }, take: 60, orderBy: { articleId: "desc" } });
  return `A new angle on Corinth or the wider region of Corinthia that none of these existing articles covers: ${titles.map((row) => row.title).join("; ")}`;
}

/** Generate one article in all three languages and store it. Returns the article id. */
export async function generateArticle(topic?: string): Promise<string> {
  const ai = await aiConfig();
  if (!ai.key) throw new Error("Λείπει το API key του OpenRouter (Ρυθμίσεις)");
  const subject = topic?.trim() || (await nextTopic());
  const model = ai.model;
  const res = await fetch(`${ai.url}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ai.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: `Subject: ${subject}` }],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  const reply = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const article = generated.parse(extractJson(reply.choices?.[0]?.message?.content ?? ""));

  // Keep slugs unique without failing the run.
  const taken = await db.article.count({ where: { slug: { startsWith: article.slug } } });
  const publish = ai.publish;
  const created = await db.article.create({
    data: {
      slug: taken ? `${article.slug}-${taken + 1}` : article.slug,
      topic: subject,
      model,
      status: publish ? "PUBLISHED" : "DRAFT",
      publishedAt: publish ? new Date() : null,
      translations: { create: locales.map((locale) => ({ locale, ...article[locale] })) },
    },
  });
  return created.id;
}
