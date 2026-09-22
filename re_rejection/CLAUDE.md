# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

This is a freshly bootstrapped `create-next-app` project. Beyond the generated
scaffold (`app/layout.tsx`, `app/page.tsx`, default assets in `public/`), no
application code, routes, or tests exist yet.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript (`strict: true`)
- Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config.*`; theme is
  configured directly in `app/globals.css`)
- ESLint 9 flat config (`eslint.config.mjs`) extending `eslint-config-next`
  (`core-web-vitals` + `typescript`)
- Path alias: `@/*` resolves to the project root (see `tsconfig.json`)

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — run ESLint over the project

There is no test runner configured yet.

## Next.js 16 breaking changes

Per `AGENTS.md`, this Next.js version has breaking changes relative to older
training data. Before writing any App Router code (routing, data fetching,
metadata, caching, server/client components, etc.), read the relevant guide
under `node_modules/next/dist/docs/` — organized into `01-app`, `02-pages`,
and `03-architecture` — and follow any deprecation notices found there.
