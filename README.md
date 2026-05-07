<div align="center">

```
==============================================================================
    _      ____    __   __    _      ____    _   _     _     _____    _
   / \    |  _ \   \ \ / /   / \    | __ )  | | | |   / \   |_   _|  / \
  / _ \   | |_) |   \ V /   / _ \   |  _ \  | |_| |  / _ \    | |   / _ \
 / ___ \  |  _ <     | |   / ___ \  | |_) | |  _  | / ___ \   | |  / ___ \
/_/   \_\ |_| \_\    |_|  /_/   \_\ |____/  |_| |_|/_/   \_\  |_| /_/   \_\
==============================================================================
                        L L M   *   I N S T R U M E N T
```

# Aryabhata · LLM Instrument

**A multi-model AI studio with streaming inference, Blend mode, code editing, image generation, Arena voting, Persona Gallery, Prompt Enhancer, Command Palette, slash commands, voice input, generative conversation fingerprints, fork tree visualization, personal analytics, and per-user persistence — built on NVIDIA NIM.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-aryabhata--rkfm.onrender.com-5eb8ff?style=for-the-badge&logo=render&logoColor=white)](https://aryabhata-rkfm.onrender.com)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Neon](https://img.shields.io/badge/Database-Neon%20Postgres-00e699?style=flat-square)](https://neon.tech)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6c47ff?style=flat-square)](https://clerk.com)

</div>

---

## Overview

Aryabhata (named after the 5th-century Indian mathematician) is a full-stack AI chat studio that gives you direct access to 40+ open-weight language models hosted on the NVIDIA NIM inference platform. It is designed to feel like a precision instrument — a minimal, telemetry-rich interface that stays out of your way while you work.

Every conversation is persisted to a cloud Postgres database, scoped to the authenticated user. Sessions survive page refreshes, device switches, and deployments. The app streams all responses token-by-token over Server-Sent Events and surfaces timing metrics (TTFT, tokens/s, latency) per message.

### Key ideas

| Idea | What it means |
|------|---------------|
| **Blend Mode** | Send one prompt to 2–5 models simultaneously; responses stream in side-by-side within the same thread |
| **Arena** | After a Blend round completes, vote for the best response; your personal model leaderboard updates in real time |
| **Prompt Enhancer** | One-click AI rewrite of your prompt using Llama 3.2 3B — makes it tighter and more effective; undo restores the original |
| **Persona Gallery** | 7 built-in system prompt personas + unlimited custom ones; switchable from the right rail |
| **Fork Conversation** | Right-click any message → Branch a new session starting from that exact point in history |
| **Conversation Pinning** | Pin important sessions to the top of the list with a 📌 indicator |
| **Auto-Route** | An LLM classifier transparently decides whether your prompt should go to Chat, Code, or Image mode |
| **Command Palette** | Ctrl+P opens a fuzzy-searchable index of every action, model, theme, persona, and recent conversation |
| **Slash Commands** | Type `/` in the composer for `/eli5`, `/critique`, `/summarize`, `/translate`, `/code`, `/refactor`, `/whatif`, plus action commands |
| **Conversation DNA** | Every session gets a deterministic generative SVG fingerprint — a unique visual identity in the breadcrumb and sidebar |
| **Multiverse** | Visualize all conversations and their fork lineage as an interactive SVG tree (Ctrl+M) |
| **Insights** | Personal analytics: 26-week activity heatmap, top-models bar chart, 24-hour active-time radial (Ctrl+I) |
| **Voice Input** | Web Speech API mic in the composer — live interim transcript appended to the textarea while you speak |
| **Streaming Theatre** | The right-rail telemetry block transforms during active streams — pulsing sweep, blinking LIVE indicator, real-time token counter |
| **Instrument UI** | 5 design themes (with matching favicons), live sparkline telemetry, UTC + local clock, and a status bar modeled after an engineering HUD |
| **Error Surfaces** | Full toast notification stack, streaming retry button, SYS ERR status indicator — no silent failures |
| **Mobile-first** | Fully responsive from 360px phones to 4K — bottom nav, slide-in panels, dynamic viewport height |
| **Per-user isolation** | Multi-tenant Postgres — every session, message, vote, and setting belongs to the signed-in user |

---

## Live Demo

> **[https://aryabhata-rkfm.onrender.com](https://aryabhata-rkfm.onrender.com)**

Sign up with email or OAuth via Clerk. No credit card required.

---

## Features

### Modes

Switch between modes using the **CHAT / CODE / IMAGE tabs** at the top of the sidebar.

#### Chat Mode
Full conversational AI with streaming. Supports image paste (drop a screenshot into the composer — vision-capable models will analyze it). Responses render in rich Markdown with fenced code blocks, tables, and syntax highlighting powered by highlight.js.

- **Regenerate** — re-stream the last response with one click, or right-click → Regenerate
- **Edit & Resend** — click any past user message to edit it inline; all subsequent messages are truncated and the thread re-streams from that point
- **Fork from here** — right-click any message → "Fork from here →" to branch a new session with all messages up to that point copied over. The new session shows a `⑂` indicator in the breadcrumb
- **Auto-naming** — the conversation title is automatically generated by a Llama 3.1 8B classifier after the first exchange
- **Retry on failure** — if a stream fails, a `↺ Retry` banner appears above the composer with one-click re-generation

#### Code Mode
A Monaco editor (the same engine as VS Code) fills the left half of the screen; an AI assistant streams into the right panel. The editor supports 20+ languages with bracket colorization, word-wrap, and folding. Ask the model to explain, refactor, debug, or extend whatever is in the editor.

- **`↓ Save`** — download the editor contents as a file with the correct extension for the active language

#### Image Mode
Generate images from text prompts using Black Forest Labs models hosted on NVIDIA NIM. Choose resolution, step count, and model from the right rail. Generated images display in a responsive gallery with a one-click Save button.

#### Blend Mode
Select 2–5 models from the sidebar. When you send a message, each model streams its response as a separate assistant bubble in the same thread — attributed to its model. After all streams complete, **☆ Vote** buttons appear on each response, letting you crown the winner and build your personal Arena leaderboard.

---

### Prompt Enhancer

A **✨ Enhance** button appears in the composer toolbar whenever you have more than 10 characters typed and are not currently streaming. Click it to send your draft to `meta/llama-3.2-3b-instruct`, which rewrites it into a tighter, more directive prompt. The textarea is replaced with the improved version instantly, and a **↩ Undo** button appears for 10 seconds to restore the original.

---

### Persona Gallery

The right rail's system prompt section is replaced by a scrollable row of **7 built-in personas**, plus support for **custom personas you create yourself**:

| Persona | Icon | Behavior |
|---------|------|----------|
| Rubber Duck | 🦆 | Passive listener for thinking out loud / debugging |
| Socratic | 🏛 | Never gives direct answers — guides with questions |
| Critic | 😤 | Snarky but brilliant code and logic critic |
| ELI5 | 🧒 | Explains everything as if you're five |
| Devil's Advocate | 😈 | Argues the opposite of every position |
| Tech Writer | 📝 | Hyper-detailed, structured technical documentation |
| Exec Summary | 📊 | 3 bullet points max, business-impact first |
| **+ Custom** | ✦ | Click `+` to create your own persona with a name, icon, and system prompt |

Clicking a card fills the system prompt textarea. Editing the textarea manually deselects the card (custom prompt mode). Clicking the active card again clears the system prompt entirely. Custom persona cards show a `×` delete button; built-in cards do not. All custom personas persist to localStorage.

---

## Phase III · The Multiverse

Aryabhata's third feature wave reimagines the surface area of the app. Seven novel features that don't exist in any other LLM chat client.

### 🌌 Conversation DNA

Every conversation gets a **deterministic generative SVG fingerprint** derived from its ID via FNV-1a hash → linear congruential RNG. The same conversation always renders the same pattern of arcs, asymmetric spokes, and outer pips — but every conversation is unique.

Visible in two places:
- **TopBar breadcrumb** — large fingerprint (18px) beside the active conversation title
- **Sidebar session list** — small fingerprint (16px) on every session row, opacity rising on hover/active

Implementation: `src/lib/dnaGenerator.ts` (~70 lines, zero deps).

### ⌨️ Command Palette · `Ctrl + P`

A Linear / Raycast / VS Code-style universal command interface. Open with **Ctrl+P** (or click the `⌘` button in the status bar) and fuzzy-search across:

- **Actions** — new chat, export, multiverse, insights, shortcuts, auto-route toggle, reset sampling, clear chat
- **Modes** — switch to chat / code / image
- **Themes** — VOID, EMBER, ARCTIC, MATRIX, BLOOM
- **Models** — every one of the 40 language models, with provider/context/speed metadata
- **Personas** — every built-in + custom persona
- **Conversations** — your 50 most recent sessions

Custom positional fuzzy matcher (`src/lib/fuzzyMatch.ts`) with word-boundary and consecutive-match bonuses. Matched characters render in the accent color with a subtle text-shadow glow. Arrow keys navigate, Enter selects, Esc closes.

### / Slash Commands

Type `/` at the start of the composer to reveal a live-filtered command menu. Tab autocompletes the trigger; the typed payload is then transformed before sending.

**Transform commands** (rewrite the message before sending):

| Trigger | Behavior |
|---------|----------|
| `/eli5` | Reframes as an explain-like-I'm-5 question |
| `/critique` | Asks the model to find every flaw rigorously |
| `/summarize` | Condense to 3-5 bullet points |
| `/translate <lang>` | Translate to a target language |
| `/code` | Frame as a code-generation request |
| `/expand` | Develop a short note into a full response |
| `/refactor` | Refactor code for clarity and modern idioms |
| `/whatif` | Explore counterfactuals and alternate scenarios |

**Action commands** (trigger an app action immediately):

| Trigger | Action |
|---------|--------|
| `/clear` | Wipe all messages in the current chat |
| `/fork` | Branch a new conversation from the most recent message |
| `/new` | Start a fresh session |
| `/multiverse` | Open the conversation tree visualizer |

### 🎙 Voice Input

A microphone button in the composer footer, powered by the **Web Speech API**. Press to start recording — interim transcript chunks render directly in the textarea while you speak; finalized chunks append automatically. Pulsing red border indicates active listening. Available on Chrome, Edge, and Safari.

### 🌌 Conversation Multiverse · `Ctrl + M`

An **interactive SVG tree visualization** of every conversation and its fork lineage. Press Ctrl+M (or click the `🌌` button in the sidebar) to open.

- **Layout** — depth on the x-axis (forks branch right), in-order traversal on the y-axis. Bezier-curve edges connect parents to children.
- **Nodes** — each conversation is a card showing its DNA fingerprint, title, mode, pin/fork status. Mode is color-coded (chat / code / image).
- **Filter** — search bar narrows to conversations matching a title substring.
- **Click to jump** — selecting any node closes the modal and switches to that conversation.

Implementation in `src/components/Multiverse.tsx`. Builds the forest from the existing `forked_from` column on the `conversations` table — no schema changes.

### 📊 Insights · `Ctrl + I`

A **personal analytics dashboard** computed entirely client-side from your message history.

- **8 stat cards** — total sessions, messages, output tokens, CO₂ estimate, average TTFT, threads, forks, current session tokens
- **26-week activity heatmap** — GitHub-style contribution grid. Each cell is a day; opacity scales with that day's token volume; hover for exact totals
- **Top Models bar chart** — your 8 most-used models by message count, ordered with provider-color win-rate bars
- **24-hour active-time radial** — when you actually use the app, broken down by local hour. Spokes radiate from a center hub; longer spokes = more activity at that hour

### 🎬 Live Streaming Theatre

While a stream is active, the right-rail telemetry block transforms:

- A **gradient backdrop** appears with a sweeping shimmer animation that traverses the panel every 2.4 seconds
- The **TPOT/TTFT values** glow with the accent color and gain a text-shadow halo
- A new **`● LIVE` readout** appears below the sparkline with a blinking dot and a real-time token counter that ticks up as the model emits
- The block reverts to its calm static state the moment streaming completes

Pure CSS — no JS animation cost, no extra renders.

---

### Arena Mode & Personal Leaderboard

After completing a Blend session, each model's response shows a **☆ Vote this response** button. Clicking it:

1. Records your vote server-side (one vote per user per prompt hash — deduplication via SHA-256 of the prompt text)
2. Dims the losing responses with **vote-lost** styling
3. Marks the winner with **★ VOTED**
4. Re-fetches your leaderboard from the database

The right rail shows a **personal rankings table** listing every model you've ever voted for, sorted by win rate, with an animated win-rate bar in the model's brand color. The leaderboard makes Aryabhata a personal model benchmarking lab that improves over time as you use it.

---

### Fork Conversation

Right-click any message in Chat Mode or Code Mode and select **Fork from here →**. This:

1. Copies all messages up to and including the selected message into a new conversation
2. Saves the new conversation with `⑂ ` prepended to the original title
3. Sets `forked_from` in the database to preserve the lineage
4. Immediately opens the forked session and shows `⑂` in the breadcrumb

Forked sessions are fully independent — edits, continuations, and exports don't affect the source.

---

### Model Selection

The sidebar's **Models** section (visible in CHAT and CODE modes) includes:

- **Mode tabs** (CHAT / CODE / IMAGE) — switch between modes from the top of the sidebar
- **Search box** — type a model name (`llama`, `gemma`) or provider (`mistral`, `deepseek`) to filter the list instantly
- **Provider groups** — models are clustered under sticky provider headers with colored dots matching their brand

---

### Models

Aryabhata provides access to **40 language models** and **2 image models** via [NVIDIA NIM](https://build.nvidia.com).

#### Language Models

| Provider | Models |
|----------|--------|
| **Meta** | Llama 3.1 8B · 70B · 405B, Llama 3.2 3B · 11B Vision · 90B Vision, Llama 3.3 70B, Llama 4 Scout · Maverick |
| **Mistral** | Mistral 7B · Nemo 12B · 675B, Mixtral 8×7B · 8×22B, Codestral 22B |
| **Google** | Gemma 2 9B · 27B, Gemma 3 12B · 27B, CodeGemma 7B |
| **Microsoft** | Phi-3 Mini · Medium, Phi-3.5 Mini, Phi-4 |
| **Qwen** | Qwen 2.5 7B · 72B, QwQ 32B |
| **DeepSeek** | DeepSeek R1 7B (distill) · 70B (distill) · Full, DeepSeek V3 |
| **NVIDIA** | Nemotron Nano 8B, Nemotron 70B, Nemotron Super 49B |
| **Cohere** | Command R, Command R+ |
| **IBM** | Granite 3.0 8B, Granite 34B Code |

#### Image Models

| Model | Badge |
|-------|-------|
| FLUX.1 Schnell | Fast |
| FLUX.1 Dev | HD |

---

### Inference & Streaming

All language model requests stream over **Server-Sent Events (SSE)**. The frontend hooks into the stream with a custom `useStream` hook that:

1. Measures **Time to First Token (TTFT)** on the first `delta` event
2. Accumulates output token count and computes **tokens per second** (T/s) at stream end
3. Writes per-message telemetry (TTFT, T/s, latency, output tokens, finish reason) into a collapsible TRACE panel under each assistant message
4. Routes `error` SSE frames to the `onError` callback — no silent failures

The right rail shows a live **sparkline** of the last 20 T/s readings, plus current TTFT and streaming state indicator. An estimated **CO₂ footprint** (outputTokens × 0.0023 gCO₂/token, labelled "est.") is shown alongside the token count.

If a stream fails mid-generation, a **`↺ Retry` banner** appears above the composer. The status bar switches from `SYS NOMINAL` to `SYS ERR` (with a pulsing red dot) until the next successful stream.

---

### Sampling Controls

The right rail exposes full sampling parameter control with a **`↺` reset button** that returns all sliders to Balanced defaults in one click:

| Parameter | Range | Presets |
|-----------|-------|---------|
| Temperature | 0.0 – 2.0 | Precise (0.1) · Balanced (0.7) · Creative (1.2) · Forensic (0.3) |
| Top-P | 0.0 – 1.0 | — |
| Top-K | 1 – 200 | — |
| Frequency Penalty | 0.0 – 2.0 | — |
| Presence Penalty | 0.0 – 2.0 | — |
| Max Tokens | 256 – 16384 | — |

All parameters are persisted to localStorage and survive page refresh.

---

### Context Menus

Right-click anywhere for contextual actions:

**Sessions (sidebar)**
- **Pin / Unpin** — pins the session to the top of the list with a 📌 icon; pinned sessions persist server-side
- **Rename** — inline text input; saves on Enter or blur
- **Duplicate** — copies the conversation and all its messages; opens the duplicate immediately
- **Export as Markdown** — downloads the full conversation as a `.md` file
- **Clear History** — wipes all messages while keeping the session entry
- **Delete** — permanently removes the session

**Messages**
- **Copy text** — copies raw message content to clipboard
- **Edit** — (user messages only) opens inline editor; re-streams from that point on confirm
- **Regenerate** — (last assistant message only) discards and re-streams
- **Fork from here →** — branches a new session starting at this message

---

### Prompt Library

Save frequently-used prompts from the composer. Click **⌘ Prompts** in the composer toolbar to open the library popover. Clicking a saved prompt inserts it into the textarea. Prompts persist in localStorage across sessions.

---

### Conversation Export

Download any conversation as a formatted Markdown file via:
- Right-click a session → **Export as Markdown**
- **Ctrl + E** (exports the active conversation)

---

### Themes

Five visual themes, switchable from the status bar drop-up. Each theme also updates the **browser favicon** to match its accent color:

| Theme | Internal ID | Style |
|-------|-------------|-------|
| **VOID** | `cad` | Dark space — deep navy/black, electric purple accent, dot-grid texture |
| **EMBER** | `orbit` | Warm amber — off-white surface, orange accent, fire-glow borders |
| **ARCTIC** | `brutal` | High-contrast — white surface, bold blue accent, blue grid-line texture |
| **MATRIX** | `liquid` | Terminal green — dark base, #00ff41 accent, CRT scan-line texture |
| **BLOOM** | `prism` | Soft pink/light — white surface, magenta accent, radial blob texture |

The active theme is persisted to localStorage. CSS custom property switching means all components re-render instantly with zero JavaScript overhead.

---

### Responsive Layout & Mobile Support

Aryabhata is fully responsive across all screen sizes.

#### Desktop (> 1024px)
The classic three-column instrument layout: sidebar on the left (260px), conversation in the center, telemetry/controls on the right (300px). Status bar spans the full bottom.

#### Tablet (641px – 1024px)
Same three-column layout, slightly compressed (240px / 1fr / 260px). All panels remain visible simultaneously.

#### Phone (≤ 640px)
A completely redesigned single-panel layout optimised for one-handed use:

- **Bottom navigation bar** replaces the status bar with four tabs:
  | Tab | Icon | Shows |
  |-----|------|-------|
  | Models | ◈ | Model selector + provider groups |
  | Chat | ◉ | Active conversation + composer |
  | Params | ⊟ | Persona gallery, sampling sliders, telemetry, Arena leaderboard |
  | History | ≡ | Session list + search |

- **Side panels slide in as full-screen overlays** with a 0.28s cubic-bezier animation — no content is permanently hidden, just a tap away
- Selecting a session or creating a new chat automatically navigates to the Chat tab
- **Code mode stacks** the Monaco editor above the AI assistant vertically (45% / 55%) instead of side-by-side
- **Prompt library popover** repositions to a bottom sheet anchored above the keyboard
- TopBar is simplified — clock cells and center logo are hidden; breadcrumb + user button remain
- Uses `100dvh` (dynamic viewport height) so the layout accounts correctly for iOS/Android browser chrome and the virtual keyboard
- iOS home indicator safe area respected via `env(safe-area-inset-bottom)`

---

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + P` | Open the Command Palette |
| `Ctrl + N` | Create a new session |
| `Ctrl + K` | Focus the session search input |
| `Ctrl + E` | Export the active conversation as Markdown |
| `Ctrl + M` | Open the Conversation Multiverse |
| `Ctrl + I` | Open the Insights dashboard |
| `Ctrl + /` | Open the keyboard shortcut guide |
| `/` | Slash commands menu in the composer |
| `Enter` | Send message |
| `Shift + Enter` | New line in composer |
| `Escape` | Stop streaming / close modal |

The status bar exposes three icon buttons: **⌘** (Command Palette), **📊** (Insights), and **⌨** (this shortcut guide).

---

### Authentication & Multi-User

Authentication is handled by **Clerk**. Every API route on the backend requires a valid JWT, verified against Clerk's JWKS endpoint using PyJWT + the `cryptography` library (RS256/RS512). All database queries are scoped by `user_id`, so users can only read and modify their own data.

---

### Error Handling & Resilience

- **Toast notifications** — all user-facing errors surface as dismissible toasts at the top of the screen. Error toasts stay until dismissed; success/info toasts auto-dismiss after 3.5 s.
- **Streaming retry** — if a generation stream fails, a `↺ Retry` banner replaces the thinking indicator. One click re-streams from the last user message.
- **SYS ERR indicator** — the status bar `SYS NOMINAL` indicator switches to a pulsing red `SYS ERR` on any stream failure, and resets automatically on the next successful generation.
- **React ErrorBoundary** — any unhandled component crash renders a full-screen branded fallback (Aryabhata reticle + error message + Reload button) instead of a blank white page.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser  (React 19 + Vite + TypeScript)                        │
│                                                                 │
│  ChatMode · CodeMode (Monaco) · ImageMode · Blend Mode          │
│  Zustand store (conversations · messages · telemetry · arena)   │
│  useStream hook (SSE) · useAuthFetch (JWT injection)            │
│  Clerk React (auth guard, token retrieval)                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTPS / SSE
                                │ Authorization: Bearer <Clerk JWT>
┌───────────────────────────────▼─────────────────────────────────┐
│  FastAPI  (Python 3.12, uvicorn)                                 │
│                                                                 │
│  /api/chat/stream          SSE chat completion                  │
│  /api/code/stream          SSE code completion                  │
│  /api/blend/stream         Parallel SSE across N models         │
│  /api/image/generate       Synchronous image generation         │
│  /api/route                Prompt classifier (chat/code/image)  │
│  /api/chat/name            Auto-title generator                 │
│  /api/prompt/enhance       One-shot prompt rewrite              │
│  /api/arena/vote           Cast a Blend round vote              │
│  /api/arena/leaderboard    Personal model win-rate rankings      │
│  /api/conversations/*      CRUD, pin, fork, duplicate, clear    │
│                                                                 │
│  PyJWT + Clerk JWKS  →  RS256 token verification per request    │
└─────────────────┬───────────────────────┬────────────────────────┘
                  │                       │
   ┌──────────────▼──────────┐  ┌─────────▼───────────────────────┐
   │  Neon Postgres           │  │  NVIDIA NIM                      │
   │  asyncpg · PgBouncer     │  │  integrate.api.nvidia.com/v1     │
   │                          │  │  OpenAI-compatible REST API      │
   │  conversations           │  │  40+ LLMs · 2 image models       │
   │  messages                │  └──────────────────────────────────┘
   │  votes (Arena)           │
   └──────────────────────────┘
```

---

## Tech Stack

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 6.0 | Type safety |
| Vite | 8 | Build tool & dev server |
| Zustand | 5 | Global state with localStorage persistence |
| React Router | 7 | Client-side routing (required for Clerk's `routing="path"`) |
| Clerk React | 5.61 | Authentication UI and JWT management |
| Monaco Editor | 4.7 | VS Code editor engine for Code Mode |
| @radix-ui/react-dialog | 1.1 | Accessible modal dialogs (lightbox, shortcuts guide) |
| @radix-ui/react-tooltip | 1.2 | Accessible tooltips (message timestamps) |
| react-markdown | 10 | Markdown rendering in chat |
| remark-gfm | 4 | GFM tables, strikethrough, task lists |
| rehype-highlight | 7 | Syntax highlighting via highlight.js |
| uuid | 14 | Client-side ID generation |

### Backend

| Package | Purpose |
|---------|---------|
| FastAPI | API framework |
| uvicorn[standard] | ASGI server |
| asyncpg | Async Postgres driver |
| openai | NVIDIA NIM client (OpenAI-compatible) |
| httpx | Async HTTP client (image generation endpoint) |
| cloudinary | Image CDN upload for generated images |
| PyJWT + cryptography | Clerk JWT verification (RS256) |
| python-dotenv | Environment variable loading |

### Infrastructure

| Service | Role |
|---------|------|
| **Render** | Hosting — one web service runs both the FastAPI backend and serves the built Vite SPA |
| **Neon** | Serverless Postgres with PgBouncer pooling (`statement_cache_size=0` required) |
| **Clerk** | Authentication, JWKS endpoint, user management dashboard |
| **Cloudinary** | CDN storage for AI-generated images |
| **NVIDIA NIM** | LLM and image inference at scale |

---

## Database Schema

```sql
CREATE TABLE conversations (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    mode         TEXT NOT NULL DEFAULT 'chat',   -- 'chat' | 'code' | 'image'
    model        TEXT,
    user_id      TEXT NOT NULL DEFAULT '',        -- Clerk user ID
    forked_from  TEXT DEFAULT NULL,               -- source conv ID if branched
    pinned       BOOLEAN NOT NULL DEFAULT FALSE,  -- pinned sessions sort to top
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

CREATE TABLE messages (
    id                  TEXT PRIMARY KEY,
    conversation_id     TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role                TEXT NOT NULL,            -- 'user' | 'assistant'
    content             TEXT NOT NULL,
    mode                TEXT NOT NULL DEFAULT 'chat',
    model               TEXT,
    image_url           TEXT,                     -- populated for image generation responses
    created_at          TEXT NOT NULL
);

-- Arena: one vote per user per prompt round (deduped by SHA-256 of prompt text)
CREATE TABLE votes (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    conv_id      TEXT NOT NULL,
    msg_id       TEXT NOT NULL,
    model_id     TEXT NOT NULL,
    prompt_hash  TEXT NOT NULL,                   -- SHA-256 of user message text
    created_at   TEXT NOT NULL
);
CREATE UNIQUE INDEX votes_user_prompt ON votes(user_id, conv_id, prompt_hash);

-- Performance indexes
CREATE INDEX idx_messages_conv_id          ON messages(conversation_id);
CREATE INDEX idx_conversations_user_id     ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at  ON conversations(updated_at DESC);
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.12+
- A [Neon](https://neon.tech) Postgres database (free tier works)
- A [Clerk](https://clerk.com) application (free tier works)
- An [NVIDIA NIM](https://build.nvidia.com) API key
- A [Cloudinary](https://cloudinary.com) account (free tier works, for image storage)

### 1. Clone and install

```bash
git clone https://github.com/360NoScopeGuru/Aryabhata.git
cd Aryabhata
npm install
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Environment variables

Copy the example files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp .env.example .env
```

**`backend/.env`**

```env
# NVIDIA NIM — get keys at build.nvidia.com
NVIDIA_API_KEY=nvapi-...
NVIDIA_API_KEY_IMAGE=nvapi-...          # optional; falls back to NVIDIA_API_KEY

# Neon Postgres — from your Neon project dashboard
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# Clerk — from your Clerk dashboard → API Keys
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...

# Cloudinary — from your Cloudinary dashboard
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS — comma-separated allowed origins (defaults to * if unset)
ALLOWED_ORIGINS=http://localhost:5173
```

**`.env`** (project root, for Vite)

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### 4. Run

```bash
# Terminal 1 — backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api/*` to port 8000 automatically.

---

## Deployment (Render)

The app deploys as a **single Render web service**. FastAPI serves the Vite build from the `dist/` directory in production — no separate static hosting needed.

### Build command

```bash
npm install && npm run build && pip install -r backend/requirements.txt
```

### Start command

```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Environment variables on Render

| Variable | Notes |
|----------|-------|
| `NVIDIA_API_KEY` | Primary NIM key (chat, code, routing, naming) |
| `NVIDIA_API_KEY_IMAGE` | Optional separate key for image generation; falls back to `NVIDIA_API_KEY` |
| `DATABASE_URL` | Neon connection string |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key (also used by the frontend build) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins, e.g. `https://aryabhata-rkfm.onrender.com` (defaults to `*`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | **Must be a Build Arg** — Vite bakes it into the bundle at build time |

---

## API Reference

All routes require `Authorization: Bearer <Clerk JWT>`.

### Chat

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/chat/stream` | `ChatRequest` | Stream a chat completion (SSE) |
| `POST` | `/api/chat/name` | `{ conversation_id, first_message }` | Auto-generate a conversation title |
| `POST` | `/api/route` | `{ prompt }` | Classify a prompt → `chat` / `code` / `image` |

### Code

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/code/stream` | `CodeRequest` | Stream a code-focused completion (SSE) |

### Blend

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/blend/stream` | `BlendRequest` | Stream completions from multiple models concurrently (SSE) |

### Image

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/image/generate` | `ImageRequest` | Generate an image via NVIDIA GenAI; returns `{ image_url }` (Cloudinary CDN). Model must be `flux.1-schnell` or `flux.1-dev`. |

### Prompt

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/prompt/enhance` | `{ text: str }` | Rewrite a prompt using Llama 3.2 3B; returns `{ enhanced: str }` |

### Arena

| Method | Route | Body | Description |
|--------|-------|------|-------------|
| `POST` | `/api/arena/vote` | `{ conv_id, msg_id, model_id, prompt_hash }` | Cast a vote for the winning Blend response |
| `GET` | `/api/arena/leaderboard` | — | Personal per-model win counts, total rounds, and win rates |

### Conversations

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/conversations` | List all conversations for the current user (pinned first, then by `updated_at`) |
| `POST` | `/api/conversations` | Create a new conversation |
| `DELETE` | `/api/conversations/{id}` | Delete a conversation and all its messages |
| `PATCH` | `/api/conversations/{id}/title` | Rename a conversation |
| `PATCH` | `/api/conversations/{id}/pin` | Toggle the pinned state (`{ pinned: bool }`) |
| `POST` | `/api/conversations/{id}/duplicate` | Duplicate conversation + messages |
| `POST` | `/api/conversations/{id}/fork/{message_id}` | Fork a new conversation up to `message_id` |
| `GET` | `/api/conversations/{id}/messages` | Fetch all messages |
| `DELETE` | `/api/conversations/{id}/messages` | Clear all messages (keep conversation) |
| `DELETE` | `/api/conversations/{id}/messages/{msg_id}/onwards` | Delete a message and all following messages |

### SSE Stream Format

```
data: {"delta": "token text"}

data: {"model_start": "meta/llama-3.1-70b-instruct"}   ← Blend only
data: {"model_done": true}                              ← Blend only

data: {"done": true, "id": "msg-uuid", "output_tokens": 412}

data: {"error": "something went wrong"}
```

---

## Project Structure

```
Aryabhata/
├── backend/
│   ├── main.py                   # FastAPI app, CORS (ALLOWED_ORIGINS), SPA fallback
│   ├── auth.py                   # Clerk JWT verification (PyJWT + JWKS retry)
│   ├── database.py               # asyncpg pool, ? → $N placeholder shim, init_db + indexes
│   ├── models.py                 # Pydantic request models (with input validation)
│   ├── requirements.txt
│   ├── .env.example              # Reference env file for all backend variables
│   └── routes/
│       ├── chat.py               # /chat/stream, /chat/name, /route
│       ├── code.py               # /code/stream
│       ├── blend.py              # /blend/stream (parallel multi-model SSE)
│       ├── image.py              # /image/generate (model allowlist + Cloudinary upload)
│       ├── prompt.py             # /prompt/enhance (Llama 3.2 3B rewrite)
│       ├── arena.py              # /arena/vote, /arena/leaderboard
│       └── conversations.py      # CRUD, pin, fork, duplicate, clear, delete-onwards
│
├── src/
│   ├── main.tsx                  # React entry: ErrorBoundary + BrowserRouter + ClerkProvider
│   ├── App.tsx                   # Root layout, keyboard shortcuts, toast stack, shortcuts modal
│   ├── store/
│   │   └── appStore.ts           # Zustand store (all state + actions, localStorage persist)
│   ├── components/
│   │   ├── TopBar.tsx            # Nav bar: breadcrumb (with conv DNA), clocks, Clerk UserButton
│   │   ├── Sidebar.tsx           # Mode tabs, model search, provider groups, session list (pinning, DNA, multiverse btn)
│   │   ├── RightRail.tsx         # Persona gallery, sampling, telemetry (with Live Streaming Theatre)
│   │   ├── StatusBar.tsx         # Theme switcher, TTFT, SYS NOMINAL/ERR, ⌘ palette, 📊 insights, ⌨ shortcuts
│   │   ├── ChatMode.tsx          # Chat thread, Blend voting, fork, retry banner, slash actions
│   │   ├── CodeMode.tsx          # Monaco editor + AI assistant, ↓ Save button, retry banner
│   │   ├── ImageMode.tsx         # Image generation UI with inline gallery
│   │   ├── MessageBubble.tsx     # Message renderer (Markdown, telemetry, timestamp tooltip, vote)
│   │   ├── ChatInput.tsx         # Composer (Enhance, prompt library, image paste, slash menu, voice mic)
│   │   ├── PersonaGallery.tsx    # 7 built-in + custom persona cards (create/delete inline)
│   │   ├── CommandPalette.tsx    # ★ Ctrl+P fuzzy-search universal action UI
│   │   ├── Multiverse.tsx        # ★ Ctrl+M conversation fork tree visualizer
│   │   ├── Insights.tsx          # ★ Ctrl+I personal analytics dashboard
│   │   ├── ConversationDNA.tsx   # ★ Generative SVG fingerprint component
│   │   ├── SlashMenu.tsx         # ★ Live-filtered slash command suggestions popup
│   │   ├── ErrorBoundary.tsx     # Full-screen fallback for unhandled component crashes
│   │   ├── MobileNav.tsx         # Bottom nav bar (Models / Chat / Params / History)
│   │   └── ContextMenu.tsx       # Right-click context menu (createPortal to document.body)
│   ├── hooks/
│   │   ├── useAuthFetch.ts       # fetch() wrapper that injects Clerk Bearer token
│   │   ├── useStream.ts          # SSE streaming hook with TTFT / T/s / error callbacks
│   │   └── useVoice.ts           # ★ Web Speech API hook (interim + final transcripts)
│   ├── lib/
│   │   ├── exportConversation.ts # Markdown export (used by sidebar + Ctrl+E)
│   │   ├── dnaGenerator.ts       # ★ Deterministic SVG fingerprint algorithm (FNV-1a + LCG)
│   │   ├── fuzzyMatch.ts         # ★ Positional fuzzy matcher for the Command Palette
│   │   ├── slashCommands.ts      # ★ Slash command registry and dispatch
│   │   └── utils.ts              # Date formatting, misc helpers
│   ├── pages/
│   │   ├── SignInPage.tsx         # Clerk <SignIn routing="path"> with branded theme
│   │   └── SignUpPage.tsx         # Clerk <SignUp routing="path"> with branded theme
│   └── index.css                 # Design system: 5 themes, all component styles
│
├── public/
│   └── favicon.svg               # Crosshair/reticle brand mark (overridden at runtime per theme)
├── .env.example                  # Reference env file for frontend variables
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Design System

The entire visual layer lives in `src/index.css` as CSS custom properties. Five themes are defined as `:root[data-theme="..."]` overrides. Switching theme sets `document.documentElement.dataset.theme` — all components re-render instantly with no JS theme context needed. The browser favicon is also regenerated as an SVG blob URL with the active theme's accent color.

Each theme also applies a CSS texture to the app grid background (dot grid, scan lines, blueprint grid, etc.) via a `::before` pseudo-element.

Core variables:

```css
--bg          /* page background           */
--surface     /* card / panel background   */
--surface2    /* elevated surface          */
--ink         /* primary text              */
--ink-dim     /* secondary text (75% opacity) */
--ink-faint   /* tertiary text (45% opacity)  */
--accent      /* primary action color      */
--accent2     /* secondary accent          */
--ok          /* success / green           */
--warn        /* destructive / red         */
--glow2       /* accent tint background    */
--r           /* border-radius (VOID: 8px · EMBER: 18px · ARCTIC: 0px) */
--mono        /* monospace font stack      */
--border-w    /* border width (0.5px–1.5px) */
--trans       /* transition shorthand      */
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with a clear message
4. Push and open a pull request

Bug reports and feature requests are welcome via [GitHub Issues](https://github.com/360NoScopeGuru/Aryabhata/issues).

---

## License

MIT © 2025 360NoScopeGuru

---

<div align="center">
  <sub>Built with NVIDIA NIM · FastAPI · React 19 · Neon Postgres · Clerk · Cloudinary</sub><br/><br/>
  <sub>Named after <strong>Āryabhaṭa</strong> (476–550 CE) — mathematician, astronomer,<br/>and the first person to correctly explain Earth's axial rotation</sub>
</div>
