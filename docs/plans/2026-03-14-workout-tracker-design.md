# Workout Tracker — Design Document
_Date: 2026-03-14_

## Overview

A desktop-focused, local-only single-page web app for crafting workout programs, tracking muscle group status, logging sessions, monitoring 1RM, and projecting strength progression.

---

## Architecture

**Stack:** React + Vite (no backend, no auth)
**Storage:** IndexedDB via the `idb` library
**Charts:** Recharts
**Styling:** Plain CSS, dark theme, no UI framework

**Guiding principle:** Keep the codebase as simple as possible. No unnecessary abstractions, no premature generalization.

---

## Views (4 total, top nav bar)

### 1. Dashboard
- Muscle group grid: 8 colored squares (green/yellow/red) showing days since last hit and next scheduled session
- "Today's Workout" card if a session is scheduled, with a button to start logging

### 2. Program Builder
- 7 day columns (Mon–Sun), each toggled as rest or workout
- Workout days: list of exercises with target sets × reps
- Exercises selected from a pre-seeded list (~30 common lifts)
- No custom exercise builder

### 3. Log Workout
- Displays today's programmed exercises
- Per exercise: one row per set with weight + reps inputs
- Auto-calculates and displays 1RM as you type (Epley formula)

### 4. Progress
- Dropdown to select exercise
- Line chart: 1RM over time
- Projected trend line extended 8 weeks forward (linear regression)

---

## Data Model (IndexedDB)

### `exercises` table
```
id, name, primaryMuscles[], secondaryMuscles[]
```

### `program` table
```
id, dayOfWeek (0–6), exercises[{ exerciseId, sets, reps }]
```

### `logs` table
```
id, date, exerciseId, sets[{ weight, reps }]
```

### Computed values (derived, never stored)
- **1RM** — Epley formula: `weight × (1 + reps / 30)` from best set in a session
- **Last hit / Next hit** — derived from logs + program schedule
- **Projected 1RM** — linear trend from last 8 weeks of 1RM history per exercise

---

## Muscle Groups (8)

Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes

### Status Color Logic
- **Green** — hit within last 4 days
- **Yellow** — 5–7 days ago
- **Red** — 8+ days or never

---

## Pre-seeded Exercises (~30)

| Exercise | Primary | Secondary |
|---|---|---|
| Bench Press | Chest | Triceps |
| Incline Bench Press | Chest | Shoulders, Triceps |
| Dumbbell Fly | Chest | — |
| Squat | Quads | Hamstrings, Glutes |
| Leg Press | Quads | Hamstrings, Glutes |
| Lunge | Quads | Glutes |
| Romanian Deadlift | Hamstrings | Glutes |
| Leg Curl | Hamstrings | — |
| Deadlift | Back | Hamstrings, Glutes |
| Lat Pulldown | Back | Biceps |
| Pull-up | Back | Biceps |
| Barbell Row | Back | Biceps |
| Seated Cable Row | Back | Biceps |
| Overhead Press | Shoulders | Triceps |
| Lateral Raise | Shoulders | — |
| Face Pull | Shoulders | — |
| Barbell Curl | Biceps | — |
| Dumbbell Curl | Biceps | — |
| Hammer Curl | Biceps | — |
| Tricep Pushdown | Triceps | — |
| Skull Crusher | Triceps | — |
| Overhead Tricep Extension | Triceps | — |
| Hip Thrust | Glutes | Hamstrings |
| Glute Bridge | Glutes | Hamstrings |
| Calf Raise | — | — |
| Plank | — | — |

---

## Error Handling

Minimal. If IndexedDB fails, display a plain text error message. No retry logic, no fallbacks.

---

## Out of Scope

- Custom exercise creation
- User accounts / login
- Mobile support
- Export / import
- Notifications or reminders
- Multiple program support
