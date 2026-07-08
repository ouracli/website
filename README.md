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
  index.html     # the site (+ DataFast tracking, JSON-LD, llms link tags)
  404.html       # not-found page
  llms.txt       # AI discovery: markdown index of the site (llmstxt.org)
  llms-full.txt  # AI discovery: full plain-text content for LLMs
  robots.txt     # welcomes AI crawlers + Content-Signal usage grants
  sitemap.xml    # sitemap incl. the llms files
src/
  index.js       # thin Worker: server-side bot tracking, then serves assets
wrangler.jsonc   # Worker config (name: ourcli, main + assets binding)
```

## AI / agent discoverability

The site is built to be easy for LLMs and agents to find, index, and use,
following the [llms.txt](https://llmstxt.org) convention:

- **`/llms.txt`** — a concise Markdown index (site name, summary, key links).
- **`/llms-full.txt`** — the complete site content as clean plain text, so an
  agent can load full context in one request.
- **`/robots.txt`** — explicitly allows AI crawlers and sets
  [Content Signals](https://developers.cloudflare.com/ai-crawl-control/)
  (`search`, `ai-input`, `ai-train`) to `yes`.
- **`/sitemap.xml`** — lists the page and the llms files.
- **JSON-LD** (`SoftwareApplication`) and `<link rel="alternate">` tags in the
  page `<head>` point machines at the llms files.

Note on Cloudflare: **AI Crawl Control** (dashboard → your zone → AI Crawl
Control) is aimed at *restricting* crawlers, and its managed `robots.txt` tells
AI to stay away, which is the opposite of what we want here, so it is left off.
The "Agent Readiness" card there is still useful for confirming this site
signals AI-friendly usage.

## Analytics (DataFast)

- **Pageviews**: `datafa.st/js/script.js` tag in `public/index.html`.
- **Custom goals**: `visit-github` and `visit-akeemjenkins` fire via
  `window.datafast(...)` on the outbound links.
- **Bot/AI-crawler tracking**: `src/index.js` wraps the fetch handler with
  `@datafast/ai-crawl`'s `withAICrawlerTracking`.
