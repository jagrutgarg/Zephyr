# Aetheria — The Realm Walker

*A gamified productivity app that turns your to-do list into a living fantasy world.*

Aetheria is a task manager structured like an RPG. Every task you add becomes a **Quest**, which AI classifies into one of 6 **Realms**. Each Realm has a Guardian and connects to a real-world attribute (Strength, Intellect, Vitality, Connection, Exploration, Discipline, Creativity, or Miscellany). By completing quests, you build Realm Towers, earn Shards, and fight off **the Void**—a corruption fueled by procrastination.

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

Aetheria is a world powered by your actions. Six Realms exist in a 3D ocean, each representing a part of your life:

| Realm | Attribute | Guardian |
|---|---|---|
| The Enchanted Woods | Strength | The Fairy Keeper |
| The Celestial Kingdom | Vitality | The Royal Dragon |
| The Astral Library | Intellect | The Archivist |
| Xyran Frontier | Exploration | The Star Wanderer |
| The Timeless Realm | Discipline | The Chronomancer |
| The Dreaming Isles | Creativity | The Dream Weaver |

As the Guardian, you keep these Realms alive safely. Ignore your tasks, and **the Void** grows, which dampens your rewards. Complete tasks, and the Towers rise, the Guardians react, and you help restore the world.

Looking past the fantasy layer, Aetheria is a functional task manager. The mechanics—classification, timers, streaks, and rewards—are designed so that staying productive feels rewarding.

## Core Features

### 🧠 AI-Powered Quests
Type a task normally—*"go for a run this evening"*—and a server-side LLM call classifies it into the correct Realm and estimates a difficulty. If the AI is unsure, you can manually select the Realm. The list of Realms is always pulled fresh from the database.

### 🌌 3D World Map
A WebGL scene built with `react-three-fiber` and `three.js`. Navigate an ocean map featuring floating Realm Towers, a starfield, and a particle vortex representing the Void. A Realm's Tower appears only after you complete your first quest there.

### ⏳ Focus Timer
Set a duration (15, 25, 45 minutes, or custom), and a character will orbit your Realm's Tower. The timer runs on the server, so it works seamlessly if you refresh, close the tab, or open a new one. When a session ends, the reward is applied automatically.

### 🔁 Recurring Quests
Quests can repeat daily or weekly. Once completed, the next occurrence is automatically created.

### 🌑 Void Penalty
The Void has consequences. If it passes 60%, your completion rewards decrease, dropping by up to 50% if the Void reaches 100%. This mechanic gives you a reason to stay on track.

### 🗣️ Guardian Reactions
Guardians offer deterministic, handwritten dialogue when you complete quests and level up.

### 🏆 Milestones
If you reach level 10 in all 6 Realms while keeping the Void at 0%, you trigger an "Aetheria Restored" event, giving you a tangible goal.

### ✅ Todo-App Usability
Aetheria aims to be a fast task manager first:
- **Today view** (`/today`): View all pending quests across all Realms.
- **Quick-add**: Type a title and hit Enter.
- **Search**: Filter instantly across titles and descriptions.
- **Fallback tools**: Manual Realm selection, due dates, editing, Calendar export, and one-click completion are always available.

### 👤 Accounts, Progression & Streaks
The app uses Supabase for email and password authentication. XP scaling makes high levels harder to reach. It also tracks daily streaks and adjusts login greetings based on your activity.

### 🎧 Ambient Audio
Background music plays while you use the app. Interaction sounds and a volume control are available. Settings save locally to your device.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| 3D | `three.js`, `@react-three/fiber`, `@react-three/drei` |
| Animation | Framer Motion |
| State | Zustand |
| Backend & DB | Supabase (PostgreSQL, Auth, RPC functions) |
| AI | Groq (`qwen/qwen3.8-27b`) server-side only |
| Styling | Tailwind CSS v4 & custom CSS |
| 3D Assets | Draco-compressed `.glb` files |

## Architecture

**The client does not contact AI directly.** Groq calls are managed in Next.js API routes using a secure server key.

**The database handles game logic.** Functions like leveling, Void growth, streaks, and focus-session timing run via PostgreSQL RPCs. This prevents client-side manipulation.

**Client state is optimistic.** The UI updates instantly using Zustand, while the actual data aligns with the server's calculations in the background.

**3D degrades gracefully.** The app checks for WebGL support. If the 3D scene fails, a boundary catches the error and the 2D interfaces will continue to work normally.

## Getting Started

```bash
git clone <this-repo-url>
cd Zephyr
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Note on 3D assets: `.glb` model files are committed directly. Ensure new models are under GitHub's 100MB per-file limit.

## Environment Variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GROQ_API_KEY=your-groq-api-key
```

Get a free Supabase project at [supabase.com](https://supabase.com) and a free Groq key at [console.groq.com](https://console.groq.com).

## Database Setup

Apply migrations located in `supabase/migrations/`:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

## Project Structure

```
src/
  app/
    api/             # Server-side AI logic
    dashboard/       # The 3D World Map
    realms/[slug]/   # Per-realm quest views
    quest-walker/    # Guided AI to focus timer flow
    today/           # Unified cross-realm task list
  components/
    three/           # react-three-fiber components
  lib/               # Constants, themes, and logic helpers
  store/             # Zustand state management
supabase/
  migrations/        # Schema and RPC functions
public/models/       # .glb asset files
```

## Accessibility

The app is entirely usable by keyboard and screen reader:
- Interactive elements use standard HTML elements like buttons and links.
- Focus rings display prominently.
- Modals trap focus and close on `Escape`.
- Animations stop when `prefers-reduced-motion` is active.

## Known Limitations / Future Work

- Only some Realms have live 3D models integrated into the World Map.
- Two source models exceeded GitHub's 100MB limit and require compression before they can be added back.
- The free Groq tier limits request rates, but the app falls back to a manual Realm picker if it fails.
- There is no mobile application, and 3D navigation is optimized for desktop interactions.
- A "shop" for spending Shards is planned but not complete.
