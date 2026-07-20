import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runTool, fetchUrl } from "./tools";

describe("runTool", () => {
  it("throws on unknown tool", async () => {
    await expect(runTool("not_a_real_tool", {})).rejects.toThrow(/unknown tool/i);
  });
});

describe("fetchUrl", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects an invalid URL without hitting the network", async () => {
    await expect(fetchUrl("not-a-valid-url")).rejects.toThrow(/invalid url/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects a non-http(s) URL without hitting the network", async () => {
    await expect(fetchUrl("ftp://example.com/file")).rejects.toThrow(/unsupported url protocol/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("throws a clear error on a non-200 response", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(fetchUrl("https://example.com/missing")).rejects.toThrow(/404/);
  });

  it("extracts readable text and strips scripts/styles", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        "<html><head><style>body{color:red}</style></head><body><script>evil()</script><h1>Hello</h1><p>World</p></body></html>",
    });

    const text = await fetchUrl("https://example.com");
    expect(text).toContain("Hello");
    expect(text).toContain("World");
    expect(text).not.toContain("evil()");
    expect(text).not.toContain("color:red");
  });
});
