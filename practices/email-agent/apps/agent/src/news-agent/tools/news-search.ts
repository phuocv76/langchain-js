// Libs for third party
import { tool } from "langchain";
import { z } from "zod";

interface NewsHit {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
}

/** Searches Tavily when configured; otherwise uses Hacker News Algolia. */
const fetchNewsResults = async (query: string): Promise<NewsHit[]> => {
  const tavilyKey = process.env.TAVILY_API_KEY?.trim();

  if (tavilyKey) {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `${query} AI artificial intelligence`,
        search_depth: "basic",
        max_results: 5,
        topic: "news",
      }),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        results?: Array<{ title?: string; url?: string; content?: string }>;
      };

      return (payload.results ?? []).map((item) => ({
        title: item.title ?? "Untitled",
        url: item.url ?? "",
        snippet: (item.content ?? "").slice(0, 400),
      }));
    }
  }

  const searchUrl = new URL("https://hn.algolia.com/api/v1/search");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("tags", "story");
  searchUrl.searchParams.set("hitsPerPage", "8");

  const response = await fetch(searchUrl);
  if (!response.ok) {
    return [
      {
        title: "Search unavailable",
        url: "",
        snippet: `Could not fetch news for "${query}". Try again later.`,
      },
    ];
  }

  const payload = (await response.json()) as {
    hits?: Array<{ title?: string; url?: string; story_text?: string }>;
  };

  return (payload.hits ?? [])
    .filter((hit) =>
      /ai|llm|gpt|model|agent|openai|anthropic/i.test(hit.title ?? ""),
    )
    .slice(0, 5)
    .map((hit) => ({
      title: hit.title ?? "Untitled",
      url: hit.url ?? "",
      snippet: (hit.story_text ?? hit.title ?? "").slice(0, 400),
    }));
};

/** Formats search hits for the model as plain text. */
const formatHits = (hits: NewsHit[]): string => {
  if (hits.length === 0) {
    return "No recent AI news found for that query.";
  }

  return hits
    .map(
      (hit, index) =>
        `${index + 1}. ${hit.title}\n   URL: ${hit.url || "n/a"}\n   ${hit.snippet}`,
    )
    .join("\n\n");
};

/** LangChain tool that searches for recent AI news articles. */
export const searchNewsTool = tool(
  async ({ query }: { query: string }): Promise<string> => {
    const hits = await fetchNewsResults(query);
    return formatHits(hits);
  },
  {
    name: "search_news",
    description:
      "Search for the latest AI news articles. Use when the user asks for recent developments, headlines, or summaries.",
    schema: z.object({
      query: z
        .string()
        .describe(
          'Search terms, e.g. "OpenAI", "LLM benchmarks", "AI regulation"',
        ),
    }),
  },
);
