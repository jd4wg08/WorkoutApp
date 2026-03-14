# Workout Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-only, desktop-focused React SPA for creating workout programs, logging sessions, tracking 1RM, and projecting strength progression.

**Architecture:** Single-page React + Vite app with state-based navigation (no router). All data stored in IndexedDB via the `idb` library. Computed values (1RM, muscle status, projections) are pure functions derived at render time.

**Tech Stack:** React 18, Vite, idb, Recharts, Vitest (unit tests for pure utilities only), plain CSS dark theme.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/App.css`

**Step 1: Initialize git and scaffold Vite project**

```bash
cd /Users/jacquaro/Documents/CODE/Test_Site_Nick
git init
npm create vite@latest . -- --template react
```
When prompted "Current directory is not empty" — select "Ignore files and continue".

**Step 2: Install dependencies**

```bash
npm install idb recharts
npm install -D vitest jsdom @vitest/ui
```

**Step 3: Update vite.config.js to add test config**

Replace the contents of `vite.config.js` with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

**Step 4: Add test script to package.json**

Add to the `"scripts"` section:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 5: Clear boilerplate**

Delete: `src/assets/`, `public/vite.svg`

Replace `src/App.css` with empty file (we'll fill it in Task 6).

Replace `src/App.jsx` with:
```jsx
export default function App() {
  return <div>Workout Tracker</div>
}
```

Replace `src/index.css` with empty file.

**Step 6: Verify app runs**

```bash
npm run dev
```
Expected: browser opens, shows "Workout Tracker".

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold React + Vite project"
```

---

## Task 2: Database Layer

**Files:**
- Create: `src/db/seed.js`
- Create: `src/db/index.js`

**Step 1: Create seed data**

Create `src/db/seed.js`:

```js
export const EXERCISES = [
  { id: 1,  name: 'Bench Press',               primary: ['Chest'],       secondary: ['Triceps'] },
  { id: 2,  name: 'Incline Bench Press',        primary: ['Chest'],       secondary: ['Shoulders', 'Triceps'] },
  { id: 3,  name: 'Dumbbell Fly',              primary: ['Chest'],       secondary: [] },
  { id: 4,  name: 'Squat',                     primary: ['Quads'],       secondary: ['Hamstrings', 'Glutes'] },
  { id: 5,  name: 'Leg Press',                 primary: ['Quads'],       secondary: ['Hamstrings', 'Glutes'] },
  { id: 6,  name: 'Lunge',                     primary: ['Quads'],       secondary: ['Glutes'] },
  { id: 7,  name: 'Romanian Deadlift',          primary: ['Hamstrings'],  secondary: ['Glutes'] },
  { id: 8,  name: 'Leg Curl',                  primary: ['Hamstrings'],  secondary: [] },
  { id: 9,  name: 'Deadlift',                  primary: ['Back'],        secondary: ['Hamstrings', 'Glutes'] },
  { id: 10, name: 'Lat Pulldown',              primary: ['Back'],        secondary: ['Biceps'] },
  { id: 11, name: 'Pull-up',                   primary: ['Back'],        secondary: ['Biceps'] },
  { id: 12, name: 'Barbell Row',               primary: ['Back'],        secondary: ['Biceps'] },
  { id: 13, name: 'Seated Cable Row',          primary: ['Back'],        secondary: ['Biceps'] },
  { id: 14, name: 'Overhead Press',            primary: ['Shoulders'],   secondary: ['Triceps'] },
  { id: 15, name: 'Lateral Raise',             primary: ['Shoulders'],   secondary: [] },
  { id: 16, name: 'Face Pull',                 primary: ['Shoulders'],   secondary: [] },
  { id: 17, name: 'Barbell Curl',              primary: ['Biceps'],      secondary: [] },
  { id: 18, name: 'Dumbbell Curl',             primary: ['Biceps'],      secondary: [] },
  { id: 19, name: 'Hammer Curl',               primary: ['Biceps'],      secondary: [] },
  { id: 20, name: 'Tricep Pushdown',           primary: ['Triceps'],     secondary: [] },
  { id: 21, name: 'Skull Crusher',             primary: ['Triceps'],     secondary: [] },
  { id: 22, name: 'Overhead Tricep Extension', primary: ['Triceps'],     secondary: [] },
  { id: 23, name: 'Hip Thrust',                primary: ['Glutes'],      secondary: ['Hamstrings'] },
  { id: 24, name: 'Glute Bridge',              primary: ['Glutes'],      secondary: ['Hamstrings'] },
  { id: 25, name: 'Calf Raise',                primary: [],              secondary: [] },
  { id: 26, name: 'Plank',                     primary: [],              secondary: [] },
]
```

**Step 2: Create database module**

Create `src/db/index.js`:

```js
import { openDB } from 'idb'
import { EXERCISES } from './seed.js'

const DB_NAME = 'workout-tracker'
const DB_VERSION = 1

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('exercises')) {
        db.createObjectStore('exercises', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('program')) {
        db.createObjectStore('program', { keyPath: 'dayOfWeek' })
      }
      if (!db.objectStoreNames.contains('logs')) {
        const logs = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true })
        logs.createIndex('by-exercise', 'exerciseId')
      }
    },
  })
}

export async function seedExercises() {
  const db = await getDB()
  const count = await db.count('exercises')
  if (count > 0) return
  const tx = db.transaction('exercises', 'readwrite')
  await Promise.all(EXERCISES.map(e => tx.store.put(e)))
  await tx.done
}

export async function getExercises() {
  const db = await getDB()
  return db.getAll('exercises')
}

export async function getProgram() {
  const db = await getDB()
  return db.getAll('program')
}

export async function saveProgram(days) {
  // days: [{ dayOfWeek: 0-6, exercises: [{ exerciseId, sets, reps }] }]
  const db = await getDB()
  const tx = db.transaction('program', 'readwrite')
  await tx.store.clear()
  await Promise.all(days.map(d => tx.store.put(d)))
  await tx.done
}

export async function getLogs() {
  const db = await getDB()
  return db.getAll('logs')
}

export async function getLogsByExercise(exerciseId) {
  const db = await getDB()
  return db.getAllFromIndex('logs', 'by-exercise', exerciseId)
}

export async function saveLog(log) {
  // log: { date: 'YYYY-MM-DD', exerciseId, sets: [{ weight, reps }] }
  const db = await getDB()
  return db.add('logs', log)
}
```

**Step 3: Commit**

```bash
git add src/db/
git commit -m "feat: add IndexedDB layer with exercise seed data"
```

---

## Task 3: 1RM Utility + Tests

**Files:**
- Create: `src/utils/oneRepMax.js`
- Create: `src/utils/__tests__/oneRepMax.test.js`

**Step 1: Write the failing tests**

Create `src/utils/__tests__/oneRepMax.test.js`:

```js
import { epley, bestOneRepMax } from '../oneRepMax.js'

test('epley returns weight as-is for 1 rep', () => {
  expect(epley(100, 1)).toBe(100)
})

test('epley calculates correctly for multiple reps', () => {
  // 80kg x 10 reps = 80 * (1 + 10/30) = 80 * 1.333 = 106.67 → 107
  expect(epley(80, 10)).toBe(107)
})

test('bestOneRepMax returns highest 1RM across sets', () => {
  const sets = [
    { weight: 80, reps: 10 }, // 1RM = 107
    { weight: 90, reps: 5 },  // 1RM = 105
    { weight: 100, reps: 1 }, // 1RM = 100
  ]
  expect(bestOneRepMax(sets)).toBe(107)
})

test('bestOneRepMax handles single set', () => {
  expect(bestOneRepMax([{ weight: 100, reps: 5 }])).toBe(117)
})
```

**Step 2: Run tests — expect failure**

```bash
npm test
```
Expected: FAIL — "Cannot find module '../oneRepMax.js'"

**Step 3: Implement the utility**

Create `src/utils/oneRepMax.js`:

```js
export function epley(weight, reps) {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

export function bestOneRepMax(sets) {
  return Math.max(...sets.map(s => epley(s.weight, s.reps)))
}
```

**Step 4: Run tests — expect pass**

```bash
npm test
```
Expected: 4 tests PASS

**Step 5: Commit**

```bash
git add src/utils/
git commit -m "feat: add 1RM utility with Epley formula"
```

---

## Task 4: Muscle Status Utility + Tests

**Files:**
- Create: `src/utils/muscleStatus.js`
- Create: `src/utils/__tests__/muscleStatus.test.js`

**Step 1: Write failing tests**

Create `src/utils/__tests__/muscleStatus.test.js`:

```js
import { muscleStatus, getMuscleLastHit } from '../muscleStatus.js'

test('never hit returns "never"', () => {
  expect(muscleStatus(null)).toBe('never')
})

test('hit within 4 days returns "green"', () => {
  const date = new Date()
  date.setDate(date.getDate() - 3)
  expect(muscleStatus(date.toISOString().split('T')[0])).toBe('green')
})

test('hit 5-7 days ago returns "yellow"', () => {
  const date = new Date()
  date.setDate(date.getDate() - 6)
  expect(muscleStatus(date.toISOString().split('T')[0])).toBe('yellow')
})

test('hit 8+ days ago returns "red"', () => {
  const date = new Date()
  date.setDate(date.getDate() - 10)
  expect(muscleStatus(date.toISOString().split('T')[0])).toBe('red')
})

test('getMuscleLastHit finds latest date for a muscle group across logs and exercises', () => {
  const exercises = [
    { id: 1, primary: ['Chest'], secondary: ['Triceps'] },
    { id: 2, primary: ['Back'],  secondary: [] },
  ]
  const logs = [
    { exerciseId: 1, date: '2026-03-10', sets: [] },
    { exerciseId: 1, date: '2026-03-12', sets: [] },
    { exerciseId: 2, date: '2026-03-08', sets: [] },
  ]
  expect(getMuscleLastHit('Chest', logs, exercises)).toBe('2026-03-12')
  expect(getMuscleLastHit('Triceps', logs, exercises)).toBe('2026-03-12')
  expect(getMuscleLastHit('Back', logs, exercises)).toBe('2026-03-08')
  expect(getMuscleLastHit('Quads', logs, exercises)).toBeNull()
})
```

**Step 2: Run tests — expect failure**

```bash
npm test
```
Expected: FAIL

**Step 3: Implement**

Create `src/utils/muscleStatus.js`:

```js
export function muscleStatus(lastHitDate) {
  if (!lastHitDate) return 'never'
  const days = Math.floor((Date.now() - new Date(lastHitDate)) / 86400000)
  if (days <= 4) return 'green'
  if (days <= 7) return 'yellow'
  return 'red'
}

export function getMuscleLastHit(muscle, logs, exercises) {
  const relevantExerciseIds = exercises
    .filter(e => e.primary.includes(muscle) || e.secondary.includes(muscle))
    .map(e => e.id)

  const dates = logs
    .filter(l => relevantExerciseIds.includes(l.exerciseId))
    .map(l => l.date)

  if (dates.length === 0) return null
  return dates.sort().at(-1)
}
```

**Step 4: Run tests — expect pass**

```bash
npm test
```
Expected: all tests PASS

**Step 5: Commit**

```bash
git add src/utils/
git commit -m "feat: add muscle status utility"
```

---

## Task 5: Projection Utility + Tests

**Files:**
- Create: `src/utils/projection.js`
- Create: `src/utils/__tests__/projection.test.js`

**Step 1: Write failing tests**

Create `src/utils/__tests__/projection.test.js`:

```js
import { linearRegression, projectOneRepMax } from '../projection.js'

test('linearRegression returns correct slope and intercept', () => {
  // Points: (0,100), (1,105), (2,110) — perfect line, slope=5, intercept=100
  const { m, b } = linearRegression([100, 105, 110])
  expect(m).toBeCloseTo(5, 1)
  expect(b).toBeCloseTo(100, 1)
})

test('projectOneRepMax returns empty array for fewer than 2 data points', () => {
  expect(projectOneRepMax([{ date: '2026-01-01', oneRepMax: 100 }])).toEqual([])
})

test('projectOneRepMax returns 8 projected points by default', () => {
  const data = [
    { date: '2026-01-01', oneRepMax: 100 },
    { date: '2026-01-08', oneRepMax: 102 },
    { date: '2026-01-15', oneRepMax: 104 },
  ]
  const result = projectOneRepMax(data)
  expect(result).toHaveLength(8)
  expect(result[0]).toHaveProperty('date')
  expect(result[0]).toHaveProperty('projected')
})

test('projectOneRepMax projects increasing values for improving trend', () => {
  const data = [
    { date: '2026-01-01', oneRepMax: 100 },
    { date: '2026-01-08', oneRepMax: 105 },
    { date: '2026-01-15', oneRepMax: 110 },
  ]
  const result = projectOneRepMax(data)
  expect(result[0].projected).toBeGreaterThan(110)
  expect(result[7].projected).toBeGreaterThan(result[0].projected)
})
```

**Step 2: Run tests — expect failure**

```bash
npm test
```
Expected: FAIL

**Step 3: Implement**

Create `src/utils/projection.js`:

```js
export function linearRegression(ys) {
  const n = ys.length
  const xs = ys.map((_, i) => i)
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0)
  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const b = (sumY - m * sumX) / n
  return { m, b }
}

export function projectOneRepMax(dataPoints, weeksAhead = 8) {
  if (dataPoints.length < 2) return []
  const ys = dataPoints.map(d => d.oneRepMax)
  const { m, b } = linearRegression(ys)
  const n = dataPoints.length
  return Array.from({ length: weeksAhead }, (_, i) => {
    const x = n + i
    const projected = Math.max(0, Math.round(m * x + b))
    const date = new Date()
    date.setDate(date.getDate() + (i + 1) * 7)
    return { date: date.toISOString().split('T')[0], projected }
  })
}
```

**Step 4: Run tests — expect pass**

```bash
npm test
```
Expected: all tests PASS

**Step 5: Commit**

```bash
git add src/utils/
git commit -m "feat: add 1RM projection utility with linear regression"
```

---

## Task 6: App Shell + Dark Theme CSS

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/App.css`
- Modify: `src/main.jsx`

**Step 1: Write App.css dark theme**

Replace `src/App.css` with:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0f0f0f;
  --surface: #1a1a1a;
  --border: #2a2a2a;
  --text: #e0e0e0;
  --muted: #888;
  --accent: #4f8ef7;
  --green: #22c55e;
  --yellow: #eab308;
  --red: #ef4444;
  --never: #444;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 15px;
  min-height: 100vh;
}

nav {
  display: flex;
  gap: 4px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

nav button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

nav button:hover { color: var(--text); background: var(--border); }
nav button.active { background: var(--accent); color: #fff; }

main { padding: 32px 40px; max-width: 1100px; }

h1 { font-size: 22px; font-weight: 600; margin-bottom: 24px; }
h2 { font-size: 17px; font-weight: 600; margin-bottom: 16px; }

button.primary {
  padding: 10px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}
button.primary:hover { opacity: 0.85; }

button.ghost {
  padding: 6px 12px;
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
button.ghost:hover { color: var(--text); border-color: var(--muted); }

input, select {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 7px 10px;
  font-size: 14px;
  outline: none;
}
input:focus, select:focus { border-color: var(--accent); }

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px;
}

.status-green  { background: var(--green); }
.status-yellow { background: var(--yellow); }
.status-red    { background: var(--red); }
.status-never  { background: var(--never); }
```

**Step 2: Update main.jsx**

Replace `src/main.jsx` with:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './App.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
```

**Step 3: Write App shell with navigation**

Replace `src/App.jsx` with:

```jsx
import { useState, useEffect } from 'react'
import { seedExercises } from './db/index.js'
import Dashboard from './views/Dashboard.jsx'
import ProgramBuilder from './views/ProgramBuilder.jsx'
import LogWorkout from './views/LogWorkout.jsx'
import Progress from './views/Progress.jsx'

const VIEWS = ['Dashboard', 'Program', 'Log Workout', 'Progress']

export default function App() {
  const [view, setView] = useState('Dashboard')

  useEffect(() => {
    seedExercises().catch(e => console.error('Seed failed:', e))
  }, [])

  return (
    <>
      <nav>
        {VIEWS.map(v => (
          <button
            key={v}
            className={view === v ? 'active' : ''}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
      </nav>
      <main>
        {view === 'Dashboard'    && <Dashboard />}
        {view === 'Program'      && <ProgramBuilder />}
        {view === 'Log Workout'  && <LogWorkout onDone={() => setView('Dashboard')} />}
        {view === 'Progress'     && <Progress />}
      </main>
    </>
  )
}
```

**Step 4: Create placeholder view files**

Create `src/views/Dashboard.jsx`:
```jsx
export default function Dashboard() { return <div><h1>Dashboard</h1></div> }
```

Create `src/views/ProgramBuilder.jsx`:
```jsx
export default function ProgramBuilder() { return <div><h1>Program Builder</h1></div> }
```

Create `src/views/LogWorkout.jsx`:
```jsx
export default function LogWorkout({ onDone }) { return <div><h1>Log Workout</h1></div> }
```

Create `src/views/Progress.jsx`:
```jsx
export default function Progress() { return <div><h1>Progress</h1></div> }
```

**Step 5: Verify app runs with nav**

```bash
npm run dev
```
Expected: 4 nav buttons visible, each shows placeholder heading when clicked.

**Step 6: Commit**

```bash
git add src/
git commit -m "feat: app shell with dark theme and nav routing"
```

---

## Task 7: Program Builder View

**Files:**
- Modify: `src/views/ProgramBuilder.jsx`

**Step 1: Implement ProgramBuilder**

Replace `src/views/ProgramBuilder.jsx` with:

```jsx
import { useState, useEffect } from 'react'
import { getExercises, getProgram, saveProgram } from '../db/index.js'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function emptyDay(dayOfWeek) {
  return { dayOfWeek, exercises: [] }
}

export default function ProgramBuilder() {
  const [exercises, setExercises] = useState([])
  const [days, setDays] = useState(DAYS.map((_, i) => emptyDay(i)))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([getExercises(), getProgram()]).then(([exs, prog]) => {
      setExercises(exs)
      if (prog.length > 0) {
        setDays(DAYS.map((_, i) => prog.find(p => p.dayOfWeek === i) || emptyDay(i)))
      }
    })
  }, [])

  function addExercise(dayIndex) {
    setDays(days.map((d, i) =>
      i !== dayIndex ? d : {
        ...d,
        exercises: [...d.exercises, { exerciseId: exercises[0]?.id, sets: 3, reps: 8 }]
      }
    ))
  }

  function removeExercise(dayIndex, exIndex) {
    setDays(days.map((d, i) =>
      i !== dayIndex ? d : {
        ...d,
        exercises: d.exercises.filter((_, j) => j !== exIndex)
      }
    ))
  }

  function updateExercise(dayIndex, exIndex, field, value) {
    setDays(days.map((d, i) =>
      i !== dayIndex ? d : {
        ...d,
        exercises: d.exercises.map((e, j) =>
          j !== exIndex ? e : { ...e, [field]: field === 'exerciseId' ? Number(value) : Number(value) }
        )
      }
    ))
  }

  async function handleSave() {
    const activeDays = days.filter(d => d.exercises.length > 0)
    await saveProgram(activeDays)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h1>Program Builder</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 24 }}>
        {days.map((day, dayIndex) => (
          <div key={dayIndex} className="card" style={{ minHeight: 160 }}>
            <h2 style={{ marginBottom: 12 }}>{DAYS[dayIndex]}</h2>
            {day.exercises.map((ex, exIndex) => (
              <div key={exIndex} style={{ marginBottom: 10 }}>
                <select
                  value={ex.exerciseId}
                  onChange={e => updateExercise(dayIndex, exIndex, 'exerciseId', e.target.value)}
                  style={{ width: '100%', marginBottom: 4 }}
                >
                  {exercises.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input
                    type="number" min="1" max="10"
                    value={ex.sets}
                    onChange={e => updateExercise(dayIndex, exIndex, 'sets', e.target.value)}
                    style={{ width: 48 }}
                  />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>×</span>
                  <input
                    type="number" min="1" max="30"
                    value={ex.reps}
                    onChange={e => updateExercise(dayIndex, exIndex, 'reps', e.target.value)}
                    style={{ width: 48 }}
                  />
                  <button className="ghost" onClick={() => removeExercise(dayIndex, exIndex)}>×</button>
                </div>
              </div>
            ))}
            <button className="ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => addExercise(dayIndex)}>
              + Add
            </button>
          </div>
        ))}
      </div>
      <button className="primary" onClick={handleSave}>
        {saved ? 'Saved!' : 'Save Program'}
      </button>
    </div>
  )
}
```

**Step 2: Manual test**

Open the app, go to Program. Add exercises to a few days, hit Save. Reload the page, go back to Program — exercises should persist.

**Step 3: Commit**

```bash
git add src/views/ProgramBuilder.jsx
git commit -m "feat: program builder with 7-day grid and IndexedDB persistence"
```

---

## Task 8: Log Workout View

**Files:**
- Modify: `src/views/LogWorkout.jsx`

**Step 1: Implement LogWorkout**

Replace `src/views/LogWorkout.jsx` with:

```jsx
import { useState, useEffect } from 'react'
import { getExercises, getProgram, saveLog } from '../db/index.js'
import { epley } from '../utils/oneRepMax.js'

function today() {
  return new Date().toISOString().split('T')[0]
}

function dayOfWeek() {
  // 0=Sun in JS, convert to Mon=0
  return (new Date().getDay() + 6) % 7
}

export default function LogWorkout({ onDone }) {
  const [exercises, setExercises] = useState([])
  const [programDay, setProgramDay] = useState(null)
  const [logs, setLogs] = useState({}) // exerciseId → [{ weight, reps }]
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([getExercises(), getProgram()]).then(([exs, prog]) => {
      setExercises(exs)
      const day = prog.find(p => p.dayOfWeek === dayOfWeek())
      setProgramDay(day || null)
      if (day) {
        const initial = {}
        day.exercises.forEach(({ exerciseId, sets }) => {
          initial[exerciseId] = Array.from({ length: sets }, () => ({ weight: '', reps: '' }))
        })
        setLogs(initial)
      }
    })
  }, [])

  function updateSet(exerciseId, setIndex, field, value) {
    setLogs(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i !== setIndex ? s : { ...s, [field]: value }
      )
    }))
  }

  function getOneRepMax(exerciseId) {
    const sets = (logs[exerciseId] || []).filter(s => s.weight && s.reps)
    if (sets.length === 0) return null
    return Math.max(...sets.map(s => epley(Number(s.weight), Number(s.reps))))
  }

  async function handleFinish() {
    const date = today()
    const promises = Object.entries(logs).map(([exerciseId, sets]) => {
      const completedSets = sets.filter(s => s.weight && s.reps)
      if (completedSets.length === 0) return null
      return saveLog({
        date,
        exerciseId: Number(exerciseId),
        sets: completedSets.map(s => ({ weight: Number(s.weight), reps: Number(s.reps) }))
      })
    }).filter(Boolean)
    await Promise.all(promises)
    setDone(true)
    setTimeout(onDone, 1200)
  }

  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))

  if (!programDay) {
    return (
      <div>
        <h1>Log Workout</h1>
        <p style={{ color: 'var(--muted)' }}>No workout scheduled for today. Edit your program to add one.</p>
      </div>
    )
  }

  if (done) {
    return <div><h1>Workout logged!</h1></div>
  }

  return (
    <div>
      <h1>Log Workout</h1>
      {programDay.exercises.map(({ exerciseId, sets, reps }) => {
        const ex = exMap[exerciseId]
        const orm = getOneRepMax(exerciseId)
        return (
          <div key={exerciseId} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h2>{ex?.name}</h2>
              {orm && <span style={{ color: 'var(--accent)', fontSize: 13 }}>1RM est. {orm} kg</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 80px 80px 1fr', gap: 8, alignItems: 'center', marginBottom: 8, color: 'var(--muted)', fontSize: 12 }}>
              <span>Set</span><span>Weight (kg)</span><span>Reps</span><span></span>
            </div>
            {(logs[exerciseId] || []).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 80px 80px 1fr', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: 'var(--muted)' }}>{i + 1}</span>
                <input
                  type="number" min="0" placeholder={`e.g. 80`}
                  value={s.weight}
                  onChange={e => updateSet(exerciseId, i, 'weight', e.target.value)}
                />
                <input
                  type="number" min="1" placeholder={`e.g. ${reps}`}
                  value={s.reps}
                  onChange={e => updateSet(exerciseId, i, 'reps', e.target.value)}
                />
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {s.weight && s.reps ? `→ ${epley(Number(s.weight), Number(s.reps))} kg 1RM` : ''}
                </span>
              </div>
            ))}
          </div>
        )
      })}
      <button className="primary" onClick={handleFinish}>Finish & Save</button>
    </div>
  )
}
```

**Step 2: Manual test**

- Set up a program first (Task 7)
- Go to Log Workout — should show today's exercises with set rows
- Enter weight and reps — 1RM should update live
- Click Finish — should redirect to Dashboard

**Step 3: Commit**

```bash
git add src/views/LogWorkout.jsx
git commit -m "feat: log workout view with live 1RM display"
```

---

## Task 9: Dashboard View

**Files:**
- Modify: `src/views/Dashboard.jsx`

**Step 1: Implement Dashboard**

Replace `src/views/Dashboard.jsx` with:

```jsx
import { useState, useEffect } from 'react'
import { getExercises, getProgram, getLogs } from '../db/index.js'
import { muscleStatus, getMuscleLastHit } from '../utils/muscleStatus.js'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes']

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dayOfWeek() {
  return (new Date().getDay() + 6) % 7
}

function nextHitDay(muscle, program, exercises) {
  const today = dayOfWeek()
  const days = [...Array(7).keys()].map(i => (today + i + 1) % 7)
  for (const d of days) {
    const day = program.find(p => p.dayOfWeek === d)
    if (!day) continue
    const hits = day.exercises.some(({ exerciseId }) => {
      const ex = exercises.find(e => e.id === exerciseId)
      return ex && (ex.primary.includes(muscle) || ex.secondary.includes(muscle))
    })
    if (hits) return DAYS[d]
  }
  return null
}

export default function Dashboard() {
  const [exercises, setExercises] = useState([])
  const [program, setProgram] = useState([])
  const [logs, setLogs] = useState([])

  useEffect(() => {
    Promise.all([getExercises(), getProgram(), getLogs()]).then(([exs, prog, ls]) => {
      setExercises(exs)
      setProgram(prog)
      setLogs(ls)
    })
  }, [])

  const todayProgram = program.find(p => p.dayOfWeek === dayOfWeek())
  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Muscle group grid */}
      <h2>Muscle Groups</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {MUSCLE_GROUPS.map(muscle => {
          const lastHit = getMuscleLastHit(muscle, logs, exercises)
          const status = muscleStatus(lastHit)
          const next = nextHitDay(muscle, program, exercises)
          return (
            <div key={muscle} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  background: status === 'green' ? 'var(--green)'
                    : status === 'yellow' ? 'var(--yellow)'
                    : status === 'red' ? 'var(--red)'
                    : 'var(--never)'
                }} />
                <strong style={{ fontSize: 14 }}>{muscle}</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {lastHit ? `Last: ${lastHit}` : 'Never hit'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {next ? `Next: ${next}` : 'Not scheduled'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Today's workout */}
      <h2>Today</h2>
      {todayProgram ? (
        <div className="card">
          <p style={{ marginBottom: 12, color: 'var(--muted)', fontSize: 13 }}>
            {todayProgram.exercises.length} exercise{todayProgram.exercises.length !== 1 ? 's' : ''} scheduled
          </p>
          {todayProgram.exercises.map(({ exerciseId, sets, reps }) => (
            <div key={exerciseId} style={{ marginBottom: 6, fontSize: 14 }}>
              {exMap[exerciseId]?.name} — {sets}×{reps}
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>Rest day. No exercises scheduled.</p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Manual test**

- Log a workout (Task 8), then view Dashboard
- Muscle group dots should reflect logged exercises
- Today's card should show scheduled exercises (or rest day message)

**Step 3: Commit**

```bash
git add src/views/Dashboard.jsx
git commit -m "feat: dashboard with muscle group status grid and today's workout"
```

---

## Task 10: Progress View

**Files:**
- Modify: `src/views/Progress.jsx`

**Step 1: Implement Progress**

Replace `src/views/Progress.jsx` with:

```jsx
import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getExercises, getLogsByExercise } from '../db/index.js'
import { bestOneRepMax } from '../utils/oneRepMax.js'
import { projectOneRepMax } from '../utils/projection.js'

export default function Progress() {
  const [exercises, setExercises] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    getExercises().then(exs => {
      setExercises(exs)
      if (exs.length > 0) setSelectedId(exs[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    getLogsByExercise(selectedId).then(logs => {
      const sorted = logs.sort((a, b) => a.date.localeCompare(b.date))
      const history = sorted.map(l => ({
        date: l.date,
        oneRepMax: bestOneRepMax(l.sets),
      }))
      const projected = projectOneRepMax(history)
      const projMap = Object.fromEntries(projected.map(p => [p.date, p.projected]))
      const combined = [
        ...history.map(h => ({ date: h.date, actual: h.oneRepMax, projected: null })),
        ...projected.map(p => ({ date: p.date, actual: null, projected: p.projected })),
      ]
      setChartData(combined)
    })
  }, [selectedId])

  const selectedEx = exercises.find(e => e.id === selectedId)
  const hasData = chartData.some(d => d.actual !== null)

  return (
    <div>
      <h1>Progress</h1>

      <div style={{ marginBottom: 24 }}>
        <select
          value={selectedId || ''}
          onChange={e => setSelectedId(Number(e.target.value))}
          style={{ minWidth: 200 }}
        >
          {exercises.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {!hasData ? (
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>No data yet for {selectedEx?.name}. Log some workouts first.</p>
        </div>
      ) : (
        <div className="card">
          <h2 style={{ marginBottom: 20 }}>{selectedEx?.name} — 1RM over time</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: '#888', fontSize: 11 }} tickLine={false} axisLine={false} unit=" kg" />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6 }}
                labelStyle={{ color: '#888' }}
              />
              <Legend wrapperStyle={{ fontSize: 13, color: '#888' }} />
              <Line
                type="monotone" dataKey="actual" name="Actual 1RM"
                stroke="#4f8ef7" strokeWidth={2} dot={{ r: 4, fill: '#4f8ef7' }}
                connectNulls={false}
              />
              <Line
                type="monotone" dataKey="projected" name="Projected"
                stroke="#888" strokeWidth={1.5} strokeDasharray="5 4"
                dot={false} connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Manual test**

- Log multiple workouts on different days for the same exercise
- Go to Progress, select that exercise
- Should show a line chart with actual 1RM points and a dashed projected line extending 8 weeks

**Step 3: Commit**

```bash
git add src/views/Progress.jsx
git commit -m "feat: progress view with Recharts 1RM history and projection"
```

---

## Task 11: Final Polish & Verification

**Step 1: Run all unit tests**

```bash
npm test
```
Expected: all tests PASS

**Step 2: Build for production**

```bash
npm run build
```
Expected: no errors, `dist/` folder created

**Step 3: End-to-end manual walkthrough**

1. Open app
2. Go to Program → add exercises to 3+ days → Save
3. Go to Log Workout → enter weights and reps → Finish
4. Go to Dashboard → verify muscle group dots are colored correctly
5. Go to Progress → select an exercise → verify chart shows logged data
6. Log 2 more workouts → Progress chart should show a projected trend line

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete workout tracker MVP"
```
