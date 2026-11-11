# Merry Explorers Modular Games Architecture

This directory (`src/games/`) is the central, modular workspace for all interactive classroom games and learning activities. Each game lives as an independent, self-contained module so you can easily develop, version, test, and maintain them without affecting other features in the codebase.

---

## 📁 Standard Game Folder Structure

When adding or updating a game, follow this standard pattern (using `number-trail` as the canonical reference):

```
src/games/
├── README.md                      <- This architecture & versioning guide
└── <game-name>/                   <- e.g. number-trail, colors-shapes, animal-sounds
    ├── index.ts                   <- Main public export (components, types, data, utilities)
    ├── types.ts                   <- All TypeScript interfaces & types specific to this game
    ├── data.ts                    <- Static game items, prompts, cheer phrases, presets
    ├── utils/                     <- Pure logic & calculation helpers (no React UI)
    │   ├── challenge-generator.ts <- Generates questions/rounds based on difficulty/modes
    │   └── scoring.ts             <- Points calculation, streaks, speed bonus, ranking
    └── components/                <- Modular React components for this game
        ├── <GameName>Workspace.tsx<- Main workspace with state machine (setup, playing, game_over)
        ├── <CoreComponentA>.tsx   <- Dedicated UI components (e.g. NumberCard, DotGrid)
        ├── <CoreComponentB>.tsx   <- Race tracks, character animations, visual prompts
        ├── PlayerSetupModal.tsx   <- Player selection (roster + guests), modes, difficulty
        ├── GameOverPodium.tsx     <- Victory podium, star counts, MongoDB session saving
        └── ConfettiEffect.tsx     <- Canvas confetti celebration effect
```

---

## 🚀 How to Version Games on Your Own

### 1. Module Versioning in `index.ts`
Every game's `index.ts` contains a header tag:
```ts
/**
 * Number Trail Game Module
 * Version: 1.0.0
 * Learning Objective: Preschool Number Recognition, Counting, Sequence, and Comparison (Ages 2-6)
 */
```
- **Patch (1.0.x)**: Minor UI tweaks, wording adjustments, audio tone refinements.
- **Minor (1.x.0)**: New challenge modes, added difficulty levels, new animal avatars.
- **Major (2.0.0)**: Breaking changes in player state shape or scoring schema.

### 2. Independent Data & Types
Because all types (`types.ts`) and data definitions (`data.ts`) reside inside the game's folder:
- Modifying number ranges, audio prompts, or avatars for `number-trail` will **never** break `body-parts` or any other game.
- You can duplicate a game directory (e.g., duplicate `number-trail` into `number-trail-v2` or `alphabet-trail`) without naming collisions.

---

## 🔌 Connecting a Game to Next.js

A game module needs only 4 lightweight connector files in the Next.js routing tree:

### 1. Teacher Page Route
`src/app/(auth)/teacher/activities/<game-name>/page.tsx`:
```tsx
import { NumberTrailWorkspace } from "@/games/number-trail";

export default function TeacherNumberTrailPage() {
  return <NumberTrailWorkspace mode="teacher" />;
}
```

### 2. Admin Page Route (Includes Analytics & History)
`src/app/(auth)/admin/activities/<game-name>/page.tsx`:
```tsx
import { NumberTrailWorkspace } from "@/games/number-trail";

export default function AdminNumberTrailPage() {
  return <NumberTrailWorkspace mode="admin" />;
}
```

### 3. Scores & Analytics API
`src/app/api/admin/activities/<game-name>/scores/route.ts`:
- **POST**: Saves session to MongoDB collection `activity_game_scores` with `gameType: "<game-name>"`.
- **GET**: Returns previous sessions and computes all-time leaderboard for this specific game.
- **DELETE**: Allows admin to delete erroneous or test sessions.

### 4. Class Roster API
`src/app/api/admin/activities/<game-name>/students/route.ts`:
- Fetches active Trailblazer students so teachers can pick them into the game with 1 click.

### 5. GamesHub Card
`src/components/activities/GamesHub.tsx`:
- Links to `${activityPath}/<game-name>`
- Shows game badge, age range, and thumbnail preview.

---

## 🎯 Existing Games

| Game ID | Name | Target Ages | Key Concepts | Location |
| :--- | :--- | :--- | :--- | :--- |
| `body-parts` | Body Parts Adventure | Ages 2–5 | Body parts recognition, action prompts | `src/components/admin/activities/body-parts/` |
| `number-trail` | Number Trail Adventure | Ages 2–6 | Recognition, count & match, sequence, more or less | `src/games/number-trail/` |

---

## 🛠️ Testing & Type Checking

To verify all games pass strict TypeScript checking at any time:
```bash
npx tsc --noEmit
```
