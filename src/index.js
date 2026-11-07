// ouracli.com Worker.
//
// The site is static (served from ./public via the ASSETS binding). This thin
// Worker runs in front of the assets (run_worker_first in wrangler.jsonc) so it
// can do two things before an asset is served:
//
// 1. DataFast server-side AI/bot crawler tracking (@datafast/ai-crawl). Human
//    pageviews are tracked separately by the datafa.st/js/script.js tag in the
//    page <head>; this covers non-browser bots (GPTBot, ClaudeBot, ...).
//
// 2. Markdown for Agents content negotiation. A request whose Accept header
//    prefers text/markdown over text/html gets a Markdown representation of the
//    page (Content-Type: text/markdown, plus an x-markdown-tokens estimate).
//    Everything else, including every browser, gets the HTML as before. See
//    https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/
//
//    Cache safety: because run_worker_first is set, this Worker runs on every
//    request before any asset lookup, so the edge cannot hand a cached Markdown
//    body to a browser (or HTML to an agent). Negotiated responses also carry
//    "Vary: Accept" so downstream caches key on the header too.
//
// The static AI discovery files remain: /llms.txt (index), /llms-full.txt (the
// same Markdown served by negotiation), /robots.txt, /sitemap.xml, and JSON-LD
// plus <link rel="alternate"> in the page head.
import { withAICrawlerTracking } from "@datafast/ai-crawl";

// HTML page path -> static asset holding its Markdown representation.
const MARKDOWN_FOR = {
  "/": "/llms-full.txt",
  "/index.html": "/llms-full.txt",
  "/index": "/llms-full.txt",
};

// RFC 8288 Link headers on the homepage for agent discovery (RFC 9727 sec. 3).
const HOMEPAGE_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '<https://github.com/ouracli/oura#readme>; rel="service-doc"; type="text/html"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</llms-full.txt>; rel="describedby"; type="text/markdown"',
  '</>; rel="alternate"; type="text/markdown"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(", ");

const HOMEPAGE_PATHS = new Set(["/", "/index.html", "/index"]);

const NOT_FOUND_MARKDOWN = `# 404, nothing here

That page doesn't exist on ouracli.com.

- [ouracli home](https://ouracli.com/) (request with \`Accept: text/markdown\` for this format)
- [llms.txt index](https://ouracli.com/llms.txt)
- [Full site content](https://ouracli.com/llms-full.txt)
`;

// Returns the q-value (0..1) the Accept header gives a media type, honouring
// exact matches over type/* over */*. Returns 0 when not acceptable.
function qualityOf(accept, type) {
  const [major] = type.split("/");
  let best = -1;
  let specificity = -1;
  for (const part of accept.split(",")) {
    const [range, ...params] = part.trim().toLowerCase().split(";");
    const r = range.trim();
    let s;
    if (r === type) s = 2;
    else if (r === `${major}/*`) s = 1;
    else if (r === "*/*") s = 0;
    else continue;
    let q = 1;
    for (const p of params) {
      const [k, v] = p.trim().split("=");
      if (k === "q") {
        const n = Number.parseFloat(v);
        q = Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : 1;
      }
    }
    if (s > specificity) {
      specificity = s;
      best = q;
    }
  }
  return best < 0 ? 0 : best;
}

// Markdown only when the client names text/markdown explicitly and does not
// rank text/html higher. Browsers never list text/markdown, so they keep HTML.
function wantsMarkdown(request) {
  const accept = request.headers.get("Accept") || "";
  if (!/text\/markdown/i.test(accept)) return false;
  const md = qualityOf(accept, "text/markdown");
  return md > 0 && md >= qualityOf(accept, "text/html");
}

// Rough token estimate (~4 characters per token), as no tokenizer is bundled.
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function markdownResponse(request, body, status) {
  return new Response(request.method === "HEAD" ? null : body, {
    status,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept",
      "x-markdown-tokens": String(estimateTokens(body)),
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function withVaryAccept(response) {
  const res = new Response(response.body, response);
  const vary = res.headers.get("Vary");
  if (!vary) res.headers.set("Vary", "Accept");
  else if (!/(^|,)\s*accept\s*(,|$)/i.test(vary)) res.headers.set("Vary", `${vary}, Accept`);
  return res;
}

async function handle(request, env) {
  const res = await negotiate(request, env);
  const { pathname } = new URL(request.url);

  if (HOMEPAGE_PATHS.has(pathname) && res.ok) {
    const out = new Response(res.body, res);
    out.headers.append("Link", HOMEPAGE_LINKS);
    return out;
  }
  // Extensionless file, so the asset server can't infer its media type.
  if (pathname === "/.well-known/api-catalog" && res.ok) {
    const out = new Response(res.body, res);
    out.headers.set("Content-Type", 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"');
    out.headers.set("Access-Control-Allow-Origin", "*");
    return out;
  }
  return res;
}

async function negotiate(request, env) {
  const url = new URL(request.url);
  const isRead = request.method === "GET" || request.method === "HEAD";
  const mdAsset = isRead ? MARKDOWN_FOR[url.pathname] : undefined;

  if (isRead && wantsMarkdown(request)) {
    if (mdAsset) {
      const asset = await env.ASSETS.fetch(new URL(mdAsset, url.origin));
      if (asset.ok) return markdownResponse(request, await asset.text(), 200);
    }
    // Let real non-HTML assets (robots.txt, sitemap.xml, ...) through as-is;
    // only replace an HTML response (i.e. the 404 page) with Markdown.
    const res = await env.ASSETS.fetch(request);
    const type = res.headers.get("Content-Type") || "";
    if (res.status === 404 && type.includes("text/html")) {
      return markdownResponse(request, NOT_FOUND_MARKDOWN, 404);
    }
    return mdAsset ? withVaryAccept(res) : res;
  }

  const res = await env.ASSETS.fetch(request);
  // Every HTML response has a Markdown twin (the page, or the 404), so it must
  // say "Vary: Accept" and shared caches never mix the two representations.
  const type = res.headers.get("Content-Type") || "";
  return mdAsset || type.includes("text/html") ? withVaryAccept(res) : res;
}

export default {
  fetch: withAICrawlerTracking(
    async (request, env, _ctx) => handle(request, env),
    {
      websiteId: "dfid_VCTF31bztQV1azbjpfz8s",
    },
  ),
};
