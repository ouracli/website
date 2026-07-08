# ouracli.com

Marketing site for [**ouracli**](https://github.com/ouracli/oura) — an agent-first
CLI and MCP server for the Oura Ring API v2.

A single static page (`public/index.html`) served as a Cloudflare
[static-assets Worker](https://developers.cloudflare.com/workers/static-assets/)
named `ourcli`. No build step, no framework.

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
  index.html   # the site
  404.html     # not-found page
wrangler.jsonc # Worker config (name: ourcli, assets: ./public)
```
