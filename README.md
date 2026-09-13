# Aetheria — The Realm Walker

*A gamified productivity app that turns your real to-do list into a living fantasy world.*

Aetheria is a task manager wearing the skin of an RPG — every real task you type becomes a **Quest**, automatically classified by AI into one of 8 mystical **Realms**, each governed by its own Guardian and tied to a real-life attribute (Strength, Intellect, Vitality, Connection, Exploration, Discipline, Creativity, or Miscellany). Complete quests to grow your Realms' Towers, earn Shards, and hold back **the Void** — a slow-creeping corruption fed by procrastination.

---

## Table of Contents
- [The Concept](#the-concept)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [Accessibility](#accessibility)
- [Known Limitations / Future Work](#known-limitations--future-work)

---

## The Concept

Aetheria is a realm sustained by intention. Eight Realms drift across a 3D ocean world, each tied to a facet of a person's life:

| Realm | Attribute | Guardian |
|---|---|---|
| The Enchanted Woods | Strength | The Fairy Keeper |
| The Celestial Kingdom | Vitality | The Royal Dragon |
| The Astral Library | Intellect | The Archivist |
| Neo-Mystica | Connection | AX-7, the Ancient Machine |
| Xyran Frontier | Exploration | The Star Wanderer |
| The Timeless Realm | Discipline | The Chronomancer |
| The Dreaming Isles | Creativity | The Dream Weaver |
| The Wandering Isles | Miscellany (catch-all) | The Wayfinder |

You are the Guardian who keeps these Realms alive through action. Neglect them, and **the Void** — a corruption born of procrastination — grows and quietly dampens your rewards. Tend them, and their Towers rise, their Guardians react, and eventually the whole world can be **Restored**.

Strip the fiction away and it's an ordinary task manager — but every mechanic (classification, timers, streaks, rewards) is reskinned so that staying productive actually *feels* like something, instead of just checking a box.

## Core Features

### 🧠 AI-Powered Quest Intake
Type a task in plain English — *"go for a run this evening"* — and a server-side Groq LLM call classifies it into the correct Realm and suggests a difficulty, with the Realm list fetched live from the database (never hardcoded, so it can never drift). Low-confidence or failed classification never blocks the user — it falls straight to a manual Realm picker instead of guessing.

### 🌌 Real 3D World Map
A genuine WebGL scene (`react-three-fiber` + `three.js`), not CSS tricks — an ocean world with drifting Realm Towers, full orbit-controls camera navigation (drag to rotate, scroll to zoom, pan), a twinkling starfield, and a 3D particle vortex representing the Void that visibly grows with corruption. Realm Towers stay dormant (no Tower, just open sky) until a Realm's first quest is completed, then **manifest** with a grow-in animation.

### ⏳ Focus Session — The Orbit Timer
The core "flagship" interaction: pick a duration (15/25/45 min or custom), and a character orbits your Realm's Tower in real time — the orbit *is* the timer, completing exactly one revolution as your time runs out. Sessions are persisted **server-side** (not localStorage) with server-time-authoritative completion, so:
- Refreshing, closing the tab, or opening a second tab all resume the *same* session correctly.
- A session finishing while you're elsewhere is picked up automatically the next time you load any page, with the reward applied and a toast/banner shown.
- Only one session can be active per user at a time.
- Respects `prefers-reduced-motion` (a static progress ring replaces the orbiting avatar).

### 🔁 Recurring Quests
Quests can repeat Daily or Weekly (specific days). On completion, the next occurrence is spawned automatically server-side — nothing vanishes.

### 🌑 A Real Void Penalty
The Void isn't just cosmetic. Once it crosses 60%, completion rewards (XP/Shards) are reduced server-side, scaling to −50% at 100% Void — a genuine mechanical incentive to stay on top of your tasks, computed inside the same trusted `complete_quest` database function that already handles XP/streaks.

### 🗣️ Guardian Reactions
Each Guardian has hand-written flavor lines shown on quest completion and level-up — deterministic, not AI-generated, so it's fast and dependable.

### 🏆 Milestones
Reach level 10 in all 8 Realms with 0% Void, and a one-time "Aetheria Restored" celebration fires — a recognized long-term destination for the loop, not an infinite grind with no finish line.

### ✅ Todo-App Usability
Underneath the fiction, this is still a *fast* task manager:
- **Today view** (`/today`) — every pending quest across all Realms in one list, overdue-first.
- **Quick-add** — type a title and hit Enter, no modal, no AI round-trip.
- **Search** — instant substring filter across titles/descriptions.
- Manual Realm selection, editing, due dates, Google Calendar export, and instant "mark done" are always available as fallbacks alongside every AI/game-driven flow.

### 👤 Accounts, Progression & Streaks
Email/password auth via Supabase, a non-linear XP curve (`level = floor((xp/100)^(2/3)) + 1`, so mastery gets harder, not easier), daily streak tracking, and a "last active" login greeting that adapts depending on whether it's a new day or you're already back.

### 🎧 Ambient Audio
Looping background music once you're actually in Aetheria (silent on the public landing/auth pages), a click sound on every interaction, and a persistent volume/mute control — all preferences saved locally, all audio failures (autoplay blocked, missing files) fail silently rather than breaking the page.

### 🌐 A Real Landing Page
A multi-section marketing page at `/` — hero, the world's story, all 8 Realms, feature highlights, the Void — with scroll-triggered animations that replay every time a section re-enters view, not just once.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| 3D | `three.js`, `@react-three/fiber`, `@react-three/drei` |
| Animation | Framer Motion |
| State | Zustand (client-side optimistic game state) |
| Backend / DB | Supabase (PostgreSQL, Auth, Row-Level Security, RPC functions) |
| AI | Groq (`qwen/qwen3.8-27b`) via an OpenAI-compatible endpoint, called only server-side |
| Styling | Tailwind CSS v4 + hand-tuned CSS |
| 3D Assets | `.glb` / glTF, Draco-compressed, loaded with a self-hosted decoder |

## Architecture

**Client never talks to the AI directly.** All Groq calls happen in Next.js API routes (`/api/classify-quest`, `/api/classify-task`) using a server-only `GROQ_API_KEY` — it's never bundled to the browser.

**The database is the source of truth for game logic.** XP, leveling, streaks, the Void, recurring-quest spawning, focus-session timing, and the Void reward penalty are all implemented as PostgreSQL functions (`complete_quest`, `start_focus_session`, `get_active_focus_session`, `sync_passive_void`, `next_recurrence_date`) callable via Supabase RPC. This means:
- A client can't fake a completed session by lying about elapsed time — the server compares against its own clock.
- The exact same completion path is used whether a quest finishes via the instant "mark done" button, the AI-guided Quest Walker, or a focus-session orbit timer — one function, three doors in.

**Client state is optimistic but not authoritative.** Zustand mirrors what the server just confirmed (via RPC return values) for instant UI feedback, but every number displayed traces back to a value the database actually computed.

**3D degrades gracefully.** WebGL support is detected before mounting the Canvas; a runtime error inside the 3D scene is caught by a dedicated error boundary; either way the 2D UI (Realm nodes, HUD, quest lists) keeps working with zero dependency on the 3D layer succeeding.

## Getting Started

```bash
git clone <this-repo-url>
cd Zephyr
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Note on 3D assets:** `.glb` model files are committed directly (not via Git LFS) — Vercel's default deploy does not fetch LFS content, which silently served pointer-file text in place of every model and broke all 3D rendering in production. Keep any new model under GitHub's 100MB per-file limit, or it can't be committed as a regular blob at all.

You'll need a Supabase project and a Groq API key first — see below.

## Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GROQ_API_KEY=your-groq-api-key
```

- Supabase: create a free project at [supabase.com](https://supabase.com) and copy the URL/keys from Project Settings → API.
- Groq: get a free API key at [console.groq.com](https://console.groq.com).

`GROQ_API_KEY` is never prefixed with `NEXT_PUBLIC_` and is only read inside server-side API routes — it never reaches the browser.

## Database Setup

The schema and all game logic live in `supabase/migrations/`, applied in order:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

This creates:
- `realms`, `quests`, `user_realm_progress`, `user_stats` tables (RLS-protected to `auth.uid()`, except the public-read `realms` table)
- The 8 seeded Realms with their attributes, guardians, and accent colors
- All RPC functions: `complete_quest`, `sync_passive_void`, `start_focus_session`, `cancel_focus_session`, `get_active_focus_session`, `next_recurrence_date`

## Project Structure

```
src/
  app/
    api/classify-quest/    # Server-side Groq call for the Add Quest AI flow
    api/classify-task/     # Server-side Groq call for the Quest Walker flow
    dashboard/             # The 3D World Map
    realms/[slug]/         # Per-realm quest list, themed visuals
    quest-walker/          # Guided AI-classify → 3D orbit-timer flow
    today/                 # Unified cross-realm task list, quick-add, search
  components/
    three/                 # All react-three-fiber scene components
    FocusSessionOverlay.tsx, GuardianToast.tsx, CelebrationOverlay.tsx, ...
  lib/
    realms.ts              # Client-safe Realm/Attribute reference
    realmThemes.ts          # Per-realm visual identity (gradients, silhouettes)
    guardianLines.ts        # Static Guardian flavor text
    questDefaults.ts        # Difficulty → XP/Shard mapping, repeat-rule helpers
  store/useGameStore.ts     # Zustand optimistic game state
supabase/
  migrations/               # All schema + RPC function definitions, in order
public/models/               # .glb assets (environment, realm towers, character)
```

## Accessibility

Built to be fully operable without a mouse:
- Every interactive element (Realm nodes, quest actions, modals, duration pickers) is a real focusable `<button>`/`<a>`, not a styled `<div>`.
- Visible focus rings throughout; the default outline is never removed without a themed replacement.
- Modals trap focus and close on `Escape`, returning focus to the triggering element.
- Icon-only buttons carry `aria-label`s.
- Dynamic feedback (level-ups, session completion, errors) is announced via `aria-live` regions, kept sparse so screen readers aren't spammed.
- All new motion (background parallax, particle drift, ambient bobbing) respects `prefers-reduced-motion`.

## Known Limitations / Future Work

- Only 2 of the 8 Realms (Astral Library, Enchanted Woods) currently have a live 3D Tower/landmark wired into the World Map; the rest render no landmark yet. Xyran Frontier has a model but it's only used in the quest-walker focus scene, not the shared World Map Canvas — adding it there previously crashed the entire scene once its Realm was awakened, so it stays out until re-verified.
- Timeless Realm and Celestial Kingdom's source models (~105–119MB each) exceed GitHub's 100MB per-file limit for a regular commit and were removed from the repo entirely — they need Draco/meshopt compression and texture downscaling before they can be added back at all.
- The Groq free tier has rate limits; classification gracefully falls back to a manual Realm picker if a call fails, but heavy concurrent demo traffic could hit that fallback more often.
- No native mobile app — the web app is responsive, but the 3D World Map's camera controls are tuned primarily for mouse/trackpad and touch-drag on tablets.
- A shard-spending economy (a "shop") is scaffolded conceptually but not yet implemented.
