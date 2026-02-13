# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Vohra Code

An AI chat interface built with Next.js that streams responses from the Claude API. Users send messages and receive streamed replies in a conversational UI.

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint with Next.js rules
- No test runner is configured yet

## Architecture

**Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Anthropic SDK.

**Path alias:** `@/*` maps to `./src/*`.

**Key files:**
- `src/app/api/chat/route.ts` — POST endpoint that accepts `{ messages }`, calls `claude-sonnet-4-5-20250929` via the Anthropic SDK streaming API, and returns a Server-Sent Events stream
- `src/components/Chat.tsx` — main client component managing message state, calling `/api/chat`, and parsing the SSE stream
- `src/components/ChatInput.tsx` — auto-resizing textarea with Enter-to-send (Shift+Enter for newlines)
- `src/components/ChatMessage.tsx` — renders a single message bubble (indigo for user, zinc for assistant)
- `src/lib/types.ts` — shared `Message` type

**Data flow:** Chat.tsx holds `messages[]` state → sends full history to `/api/chat` → API route streams Claude's response as SSE `data:` frames → Chat.tsx accumulates text chunks and re-renders incrementally.

## Environment

Requires `ANTHROPIC_API_KEY` in `.env.local` (gitignored). The Anthropic SDK reads it automatically.
