import * as cheerio from "cheerio";

const MAX_CHARS = 6000;
const FETCH_TIMEOUT_MS = 10000;

/**
 * Fetches a URL and extracts readable text from the HTML using cheerio.
 * Throws a clear error on bad input, network failure, or non-200 response.
 */
export async function fetchUrl(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: "${url}"`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported URL protocol: "${parsed.protocol}"`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "research-agent/1.0 (+fetch_url tool)",
      },
    });
  } catch (err) {
    throw new Error(
      `Failed to fetch "${url}": ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Fetch failed for "${url}": HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, iframe, nav, footer").remove();

  const text = $("body").text().replace(/\s+/g, " ").trim();

  if (!text) {
    throw new Error(`No readable text extracted from "${url}"`);
  }

  return text.slice(0, MAX_CHARS);
}

/**
 * Anthropic tool-use schema definitions for the tools this agent can call.
 */
export const toolDefinitions = [
  {
    name: "fetch_url",
    description:
      "Fetch a web page by URL and return its readable text content (scripts/styles stripped, truncated to ~6000 characters). Use this to read the contents of a page the user references.",
    input_schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The absolute URL of the page to fetch, e.g. https://example.com",
        },
      },
      required: ["url"],
    },
  },
] as const;

/**
 * Dispatches a tool call by name to its implementation.
 * Throws on unknown tool names.
 */
export async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "fetch_url": {
      const url = input.url;
      if (typeof url !== "string") {
        throw new Error('fetch_url requires a string "url" input');
      }
      return fetchUrl(url);
    }
    default:
      throw new Error(`Unknown tool: "${name}"`);
  }
}
