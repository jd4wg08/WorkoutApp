# Design: Settings, Programs, Custom Exercises & Body Diagram

**Date:** 2026-03-14
**Status:** Approved

---

## Overview

Add four interconnected features to the workout tracker:

1. **Unit toggle** (kg ↔ lb) in a new Settings tab
2. **Custom exercises** with name + muscle groups in Settings
3. **Named program presets** — multiple weekly schedules you can swap as active
4. **Human body diagram** on the Dashboard highlighting today's muscle groups in red

---

## 1. Data Layer

### DB version bump: 1 → 2

**Migration in `upgrade(db, oldVersion, newVersion, tx)`:**

The `idb` `upgrade` callback receives the transaction `tx` as its fourth argument. Reading the old `program` store during upgrade must use `tx.objectStore('program').getAll()` — NOT `getProgram()` (which would deadlock by calling `openDB` again). Pattern:

```js
upgrade(db, oldVersion, newVersion, tx) {
  if (oldVersion < 2) {
    // Read old store via the upgrade transaction before doing anything else
    const oldProgramRequest = tx.objectStore('program').getAll()
    // ... create new stores, then in a microtask use the old data
    db.deleteObjectStore('program')
    const programsStore = db.createObjectStore('programs', { keyPath: 'id', autoIncrement: true })
    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' })
    // Migration of old data happens after createObjectStore via tx
  }
}
```

Because `idb` wraps IDBRequest in promises, the migration reads the old store's records, deletes the old store, creates the new stores, then `put`s the migrated data — all within the same upgrade transaction.

**Old `program` store:** explicitly deleted via `db.deleteObjectStore('program')` during migration.

**Migration data transfer:** if the old `program` store had records, create one entry in `programs` named `"My Program"` with `isActive: true`, using the old days data. If the old store was empty, create no programs (first-run case).

---

**New store: `programs`**
```
{ id: autoIncrement, name: string, isActive: boolean, days: [{ dayOfWeek: 0-6, exercises: [{ exerciseId, sets, reps }] }] }
```
- Only one program has `isActive: true` at a time
- A minimum of one program must exist if the user has started using the app (enforced by UI — delete is blocked when only one program remains, regardless of active status)

**New store: `settings`**
```
{ key: string (keyPath), value: any }
```
- Default: `{ key: 'unit', value: 'kg' }` — written on first `getSetting('unit')` if absent

**Modified store: `exercises`**
- Add `custom: boolean` flag. Seed data all get `custom: false`. Custom user exercises get `custom: true`.
- Custom exercise IDs: use `Date.now() + Math.floor(Math.random() * 1000)` to guard against rapid-succession collisions. This is far above the seed range (1–26). The `exercises` store uses manual `keyPath: 'id'` (not autoIncrement), so `addExercise` computes the ID before calling `put`.

### New DB functions (`src/db/index.js`)

```
getSetting(key)              → value or undefined
saveSetting(key, value)      → void

getPrograms()                → Program[]
getActiveProgram()           → Program | undefined
createProgram(name)          → id  (isActive: false by default; first-run: caller sets active)
updateProgram(id, data)      → void  (partial update — merges name and/or days)
deleteProgram(id)            → void  (UI enforces: not called if only 1 program exists)
setActiveProgram(id)         → void  (single readwrite transaction: clear all isActive, set target)

addExercise({ name, primary, secondary })  → void  (id: Date.now(), custom: true)
deleteExercise(id)           → void  (UI enforces: only custom exercises; blocked if used in any program)
```

**`setActiveProgram` must use a single `readwrite` transaction** over `programs` that reads all records, clears `isActive` on each, sets it on the target, and writes all back in one `tx.done` — to avoid partial state if the page closes mid-write.

**`deleteExercise` pre-check:** before deleting, call `getPrograms()` and verify no program's `days[n].exercises` contains the target `exerciseId`. If it does, throw an error — the UI catches this and shows a warning to the user ("Remove this exercise from all programs before deleting.").

---

## 2. Settings Context

**New file: `src/context/SettingsContext.jsx`**

```jsx
const SettingsContext = createContext({ unit: 'kg', setUnit: () => {} })
export function SettingsProvider({ children }) { ... }
export function useSettings() { return useContext(SettingsContext) }
```

On mount, loads `unit` from IndexedDB via `getSetting('unit')`. Defaults to `'kg'` if absent.
On change, calls `saveSetting('unit', newUnit)` and updates state.

**Unit conversion helpers (exported from context file):**
```js
export function toDisplay(kg, unit) {
  return unit === 'lb' ? Math.round(kg * 2.2046 * 10) / 10 : kg
}
export function toKg(value, unit) {
  return unit === 'lb' ? Math.round((value / 2.2046) * 10) / 10 : value
}
```

**Conversion rule:** logs are always stored in **kg** internally.
- On **display**: call `toDisplay(storedKg, unit)`
- On **save** (LogWorkout's `handleFinish`): call `toKg(enteredValue, unit)` before passing to `saveLog`

---

## 3. Navigation

Update `App.jsx`:
- Rename `'Program'` → `'Programs'` in the `VIEWS` array and in the render conditional (`view === 'Programs'`)
- Add `'Settings'` to `VIEWS`
- Nav order: `Dashboard | Programs | Log Workout | Progress | Settings`
- Render: `{view === 'Programs' && <Programs />}` and `{view === 'Settings' && <Settings />}`

---

## 4. Programs View (`src/views/Programs.jsx`)

**List panel** (default state):
- Fetches all programs from `getPrograms()` on mount
- Lists each as a card: name, day summary (e.g. "Mon Wed Fri"), "Edit" button, "Set Active" button
- Active program shows a green "Active" badge; its "Set Active" button is hidden
- "+ New Program" button — creates a program via `createProgram("New Program")`, then enters edit mode for it

**Edit panel** (replaces list, no separate page):
- Editable name field at top
- The 7-day grid (extracted from `ProgramBuilder.jsx` — see refactor note below)
- "Save" button — calls `updateProgram(id, { name, days })`
- "Cancel" button — discards changes, returns to list
- "Delete" button — disabled/hidden when only 1 program exists; shows confirmation dialog ("Delete this program?") before calling `deleteProgram(id)`; after delete, returns to list

**`DayGrid.jsx` extraction:** the 7-day grid UI is extracted from `ProgramBuilder.jsx`'s render logic into `src/components/DayGrid.jsx`. This component takes `props: { exercises, days, onChange }` and renders the grid. Once extracted, `ProgramBuilder.jsx` itself is **deleted** — it is fully replaced by `Programs.jsx` + `DayGrid.jsx`. `DayGrid` does not depend on `ProgramBuilder` at runtime; `ProgramBuilder` is only the source from which its grid logic is lifted.

**Behavior:**
- `LogWorkout` calls `getActiveProgram()` instead of `getProgram()`
- `Dashboard` calls `getActiveProgram()` instead of `getProgram()`
- If no active program exists (fresh install, no programs created yet), both show a "No program active — set one up in Programs" message

---

## 5. Settings View (`src/views/Settings.jsx`)

Two sections:

### Unit Preference
- Toggle: two buttons `KG` / `LB`, active one highlighted
- Calls `setUnit(newUnit)` from `useSettings()`

### Custom Exercises
- Lists user-added exercises (filter `exercises` array by `custom === true`)
- Each row: name, primary muscles (comma-separated), delete button
- Delete button: calls `deleteExercise(id)`. If the exercise is in use in a program, shows inline error: "Used in a program — remove it there first."
- "Add Exercise" inline form (always visible below list):
  - Text input: Exercise name
  - Checkbox group: Primary muscle(s) — required, at least one
  - Checkbox group: Secondary muscle(s) — optional
  - Muscle options: `Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes` — these are the exact canonical strings used throughout the codebase (seed data, muscleStatus.js, Dashboard), so checkbox values must match exactly (case-sensitive)
  - "Add" button — disabled until name is non-empty and ≥1 primary muscle is checked
  - On success, clears the form and refreshes the exercise list

---

## 6. Body Diagram (`src/components/BodyDiagram.jsx`)

**Placement:** Dashboard, directly below the today header, displayed as a row with front silhouette (left) and back silhouette (right). Combined width fits within the card layout.

**Implementation:** A single inline SVG component (~300px wide total, ~200px tall). Simplified anatomical silhouette shapes using SVG `<path>` and `<ellipse>` elements. Each muscle region is a named group.

**Muscle → SVG region mapping** (no Abs — not in the seed data or muscle system):
| Muscle | View |
|--------|------|
| Chest | Front |
| Shoulders | Front + Back |
| Biceps | Front |
| Triceps | Back |
| Quads | Front |
| Back | Back (lats/traps) |
| Hamstrings | Back |
| Glutes | Back |

**Coloring logic:**
- Default fill: `#444` (resting muscle)
- Highlighted: `#ef4444` (red-500) — muscle name is in the `musclesHit` prop
- A muscle appears highlighted if it's in any exercise's `primary` or `secondary` array for today's active program day

**Props:** `musclesHit: string[]`

**Dashboard integration:** `getActiveProgram()` returns `{ id, name, isActive, days: [{ dayOfWeek, exercises }] }`. Dashboard accesses today's day via `activeProgram?.days?.find(d => d.dayOfWeek === todayIndex)`. The union of all `primary` and `secondary` arrays from today's day's exercises (looked up via the exercises map) is passed as `musclesHit` to `<BodyDiagram />`. If `getActiveProgram()` returns `undefined`, Dashboard shows a "No program active — set one up in Programs" message and skips `BodyDiagram`.

---

## 7. Weight Display Updates

**Rule:** entered weights are in the user's selected unit. On save, convert to kg with `toKg(value, unit)`. On display, convert from kg with `toDisplay(kg, unit)`.

**LogWorkout.jsx:**
- Column header: `Weight (${unit.toUpperCase()})`
- Input placeholder: `e.g. ${unit === 'lb' ? 176 : 80}`
- 1RM display suffix: `${unit.toUpperCase()} 1RM`
- `handleFinish`: wrap each `weight: toKg(Number(s.weight), unit)` before `saveLog`
- 1RM calculation: `getOneRepMax` calls `epley(weight, reps)` — weight must be in kg for this, so convert before calling: `epley(toKg(Number(s.weight), unit), Number(s.reps))`

**Progress.jsx:**
- `<YAxis unit={` ${unit.toUpperCase()}`} />`
- `<Tooltip formatter={(value) => [toDisplay(value, unit), unit.toUpperCase()]} />`
- The `chartData` values are stored 1RM in kg; convert at render via the formatter prop (not in state, so no re-fetch needed on unit change)

---

## 8. File Changes Summary

| File | Change |
|------|--------|
| `src/db/index.js` | DB v2 migration (read old store via upgrade tx, delete old store, create new stores), new functions |
| `src/db/seed.js` | Add `custom: false` to all seed exercises |
| `src/context/SettingsContext.jsx` | **New** — unit context, `toDisplay`, `toKg` helpers |
| `src/App.jsx` | Wrap with `<SettingsProvider>`, rename `'Program'` → `'Programs'`, add `'Settings'` tab and render conditional |
| `src/views/Programs.jsx` | **New** — program list + edit UI (uses `DayGrid`) |
| `src/views/Settings.jsx` | **New** — unit toggle + custom exercise manager |
| `src/components/DayGrid.jsx` | **New** — extracted 7-day grid from ProgramBuilder |
| `src/components/BodyDiagram.jsx` | **New** — SVG body with muscle highlighting |
| `src/views/ProgramBuilder.jsx` | **Deleted** — replaced by `Programs.jsx` + `DayGrid.jsx` |
| `src/views/Dashboard.jsx` | Switch to `getActiveProgram()`, compute `musclesHit`, add `<BodyDiagram />` |
| `src/views/LogWorkout.jsx` | Switch to `getActiveProgram()`, apply unit conversion on display and save |
| `src/views/Progress.jsx` | Apply unit conversion via Recharts formatter and YAxis unit prop |

---

## Out of Scope

- Syncing programs to cloud
- Reordering programs via drag-and-drop
- Per-exercise weight history in Settings
- Multiple active programs simultaneously
- Abs as a tracked muscle group (not in seed data or muscle status system)
