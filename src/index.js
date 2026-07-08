// ouracli.com Worker.
//
// The site is static (served from ./public via the ASSETS binding). This thin
// Worker runs in front of the assets (run_worker_first in wrangler.jsonc) only
// so DataFast's server-side AI/bot crawler tracking can see every request
// before an asset is served: env.ASSETS.fetch then serves the file.
//
// Human/browser pageviews are tracked separately by the datafa.st/js/script.js
// tag in the page <head>; this covers non-browser bots (GPTBot, ClaudeBot, ...).
//
// AI-agent discoverability is handled by static files, not by per-request
// content negotiation here: /llms.txt (index), /llms-full.txt (full plain
// text), /robots.txt, /sitemap.xml, and JSON-LD plus <link rel="alternate">
// in the page head. Same-URL negotiation is avoided on purpose, because the
// edge caches "/" and does not reliably vary on the Accept header, which could
// serve Markdown to a human (or HTML to an agent) from a poisoned cache entry.
import { withAICrawlerTracking } from "@datafast/ai-crawl";

export default {
  fetch: withAICrawlerTracking(
    async (request, env, _ctx) => {
      return env.ASSETS.fetch(request);
    },
    {
      websiteId: "dfid_VCTF31bztQV1azbjpfz8s",
    },
  ),
};
