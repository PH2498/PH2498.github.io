# Design — Add Hello World Page

## Context
The repository is a static HTML blog site (pages open directly in a browser, no build step).

## Decisions
- Place `helloworld.html` at the repository root alongside `index.html`.
- Reuse the site's document structure conventions: `<!DOCTYPE html>`, `<html lang="zh-CN">`, UTF-8 charset.
- Keep the page self-contained (inline CSS) so it works without the site theme assets.

## Risks
- None material; the page is additive and isolated.
