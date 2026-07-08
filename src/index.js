// ouracli.com Worker.
//
// The site is static (served from ./public via the ASSETS binding). This thin
// Worker exists only so DataFast's server-side AI/bot crawler tracking can see
// every request before an asset is served. `run_worker_first` in wrangler.jsonc
// makes this handler run unconditionally; env.ASSETS.fetch serves the file.
//
// Human/browser pageviews are tracked separately by the datafa.st/js/script.js
// tag in the page <head>; this covers non-browser bots (GPTBot, ClaudeBot, etc.).
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
