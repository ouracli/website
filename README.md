# ouracli.com

Marketing site for [**ouracli**](https://github.com/ouracli/oura), an agent-first
CLI and MCP server for the Oura Ring API v2.

A single static page (`public/index.html`) served by a Cloudflare Worker named
`ourcli`. A thin Worker (`src/index.js`) runs in front of the
[static assets](https://developers.cloudflare.com/workers/static-assets/) via
`run_worker_first` and serves them through the `ASSETS` binding. It exists only
so [DataFast](https://datafa.st) can track AI/bot crawlers server-side
(`@datafast/ai-crawl`). Human pageviews and custom goals are tracked by the
`datafa.st/js/script.js` tag in the page `<head>`.

## Develop

```sh
npm install
npm run dev      # local preview at http://localhost:8787
```

## Deploy

Manually:

```sh
npm run deploy   # wrangler deploy
```

### Continuous deployment

This repo is designed to auto-deploy via Cloudflare's native Git integration
(**Workers → Builds → Connect to Git**), which installs the Cloudflare GitHub
App on this repo and deploys every push to `main`. No API tokens or secrets are
stored in the repo.

## Structure

```
public/
  index.html   # the site (+ DataFast pageview/goal tracking)
  404.html     # not-found page
src/
  index.js     # thin Worker: server-side bot tracking, then serves assets
wrangler.jsonc # Worker config (name: ourcli, main + assets binding)
```

## Analytics (DataFast)

- **Pageviews**: `datafa.st/js/script.js` tag in `public/index.html`.
- **Custom goals**: `visit-github` and `visit-akeemjenkins` fire via
  `window.datafast(...)` on the outbound links.
- **Bot/AI-crawler tracking**: `src/index.js` wraps the fetch handler with
  `@datafast/ai-crawl`'s `withAICrawlerTracking`.
