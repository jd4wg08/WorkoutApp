# Settings, Programs, Custom Exercises & Body Diagram — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a unit toggle (kg/lb), named program presets, custom exercises, and a muscle-group body diagram to the workout tracker.

**Architecture:** IndexedDB upgraded to v2 with `programs` and `settings` stores (old `program` store migrated and deleted). A React context provides the unit preference app-wide. Four new files are created (SettingsContext, Programs view, Settings view, BodyDiagram component) and three existing views are updated.

**Tech Stack:** React 19, Vite, idb v8, Vitest, Recharts

---

## Chunk 1: Seed + DB Layer

### Task 1: Update seed data with `custom` flag

**Files:**
- Modify: `src/db/seed.js`

- [ ] **Step 1: Add `custom: false` to every exercise in EXERCISES**

  Every entry in the array needs `custom: false` added. Open `src/db/seed.js` and update all 26 entries to include the flag. The resulting file should look like:

  ```js
  export const EXERCISES = [
    { id: 1,  name: 'Bench Press',               primary: ['Chest'],       secondary: ['Triceps'],             custom: false },
    { id: 2,  name: 'Incline Bench Press',        primary: ['Chest'],       secondary: ['Shoulders', 'Triceps'], custom: false },
    { id: 3,  name: 'Dumbbell Fly',              primary: ['Chest'],       secondary: [],                      custom: false },
    { id: 4,  name: 'Squat',                     primary: ['Quads'],       secondary: ['Hamstrings', 'Glutes'], custom: false },
    { id: 5,  name: 'Leg Press',                 primary: ['Quads'],       secondary: ['Hamstrings', 'Glutes'], custom: false },
    { id: 6,  name: 'Lunge',                     primary: ['Quads'],       secondary: ['Glutes'],              custom: false },
    { id: 7,  name: 'Romanian Deadlift',          primary: ['Hamstrings'],  secondary: ['Glutes'],              custom: false },
    { id: 8,  name: 'Leg Curl',                  primary: ['Hamstrings'],  secondary: [],                      custom: false },
    { id: 9,  name: 'Deadlift',                  primary: ['Back'],        secondary: ['Hamstrings', 'Glutes'], custom: false },
    { id: 10, name: 'Lat Pulldown',              primary: ['Back'],        secondary: ['Biceps'],              custom: false },
    { id: 11, name: 'Pull-up',                   primary: ['Back'],        secondary: ['Biceps'],              custom: false },
    { id: 12, name: 'Barbell Row',               primary: ['Back'],        secondary: ['Biceps'],              custom: false },
    { id: 13, name: 'Seated Cable Row',          primary: ['Back'],        secondary: ['Biceps'],              custom: false },
    { id: 14, name: 'Overhead Press',            primary: ['Shoulders'],   secondary: ['Triceps'],             custom: false },
    { id: 15, name: 'Lateral Raise',             primary: ['Shoulders'],   secondary: [],                      custom: false },
    { id: 16, name: 'Face Pull',                 primary: ['Shoulders'],   secondary: [],                      custom: false },
    { id: 17, name: 'Barbell Curl',              primary: ['Biceps'],      secondary: [],                      custom: false },
    { id: 18, name: 'Dumbbell Curl',             primary: ['Biceps'],      secondary: [],                      custom: false },
    { id: 19, name: 'Hammer Curl',               primary: ['Biceps'],      secondary: [],                      custom: false },
    { id: 20, name: 'Tricep Pushdown',           primary: ['Triceps'],     secondary: [],                      custom: false },
    { id: 21, name: 'Skull Crusher',             primary: ['Triceps'],     secondary: [],                      custom: false },
    { id: 22, name: 'Overhead Tricep Extension', primary: ['Triceps'],     secondary: [],                      custom: false },
    { id: 23, name: 'Hip Thrust',                primary: ['Glutes'],      secondary: ['Hamstrings'],          custom: false },
    { id: 24, name: 'Glute Bridge',              primary: ['Glutes'],      secondary: ['Hamstrings'],          custom: false },
    { id: 25, name: 'Calf Raise',                primary: [],              secondary: [],                      custom: false },
    { id: 26, name: 'Plank',                     primary: [],              secondary: [],                      custom: false },
  ]
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/db/seed.js
  git commit -m "feat: add custom flag to seed exercises"
  ```

---

### Task 2: Upgrade IndexedDB to v2 and add all new functions

**Files:**
- Modify: `src/db/index.js`

- [ ] **Step 1: Replace `src/db/index.js` entirely**

  The new file must handle migration from v1 (old `program` store) to v2 (new `programs` + `settings` stores). Key constraints:
  - The upgrade callback must NOT call `getProgram()` — that calls `openDB`, which deadlocks while a DB open is in progress
  - Use `tx.objectStore('program').getAll()` to read old data before deleting the store
  - The idb library supports async upgrade callbacks — it holds the transaction open until the returned promise resolves, so `await` inside upgrade is safe
  - Read old data FIRST, then delete the old store, then create new stores, then write migrated data — in this order

  ```js
  import { openDB } from 'idb'
  import { EXERCISES } from './seed.js'

  const DB_NAME = 'workout-tracker'
  const DB_VERSION = 2

  function getDB() {
    return openDB(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, newVersion, tx) {
        if (oldVersion < 2) {
          // Step 1: Read old program data BEFORE deleting the store
          let oldDays = []
          if (db.objectStoreNames.contains('program')) {
            oldDays = await tx.objectStore('program').getAll()
            // Step 2: Delete old store after reading
            db.deleteObjectStore('program')
          }

          // Step 3: Create new stores
          db.createObjectStore('programs', { keyPath: 'id', autoIncrement: true })
          db.createObjectStore('settings', { keyPath: 'key' })

          // Step 4: Write migrated data into new programs store
          if (oldDays.length > 0) {
            await tx.objectStore('programs').add({
              name: 'My Program',
              isActive: true,
              days: oldDays,
            })
          }

          // exercises and logs stores exist for users upgrading from v1;
          // for fresh installs (oldVersion === 0), they must be created here
          if (!db.objectStoreNames.contains('exercises')) {
            db.createObjectStore('exercises', { keyPath: 'id' })
          }
          if (!db.objectStoreNames.contains('logs')) {
            const logs = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true })
            logs.createIndex('by-exercise', 'exerciseId')
          }
        }
      },
    })
  }

  // ─── Exercises ───────────────────────────────────────────────────────────────

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

  export async function addExercise({ name, primary, secondary }) {
    const db = await getDB()
    const id = Date.now() + Math.floor(Math.random() * 1000)
    // Use add (not put) so a collision throws visibly rather than silently overwriting
    await db.add('exercises', { id, name, primary, secondary, custom: true })
  }

  export async function deleteExercise(id) {
    const programs = await getPrograms()
    const inUse = programs.some(p =>
      p.days.some(d => d.exercises.some(e => e.exerciseId === id))
    )
    if (inUse) throw new Error('Exercise is used in a program')
    const db = await getDB()
    await db.delete('exercises', id)
  }

  // ─── Programs ────────────────────────────────────────────────────────────────

  export async function getPrograms() {
    const db = await getDB()
    return db.getAll('programs')
  }

  export async function getActiveProgram() {
    const programs = await getPrograms()
    return programs.find(p => p.isActive)
  }

  export async function createProgram(name) {
    const db = await getDB()
    return db.add('programs', {
      name,
      isActive: false,
      days: [],
    })
  }

  export async function updateProgram(id, data) {
    const db = await getDB()
    const existing = await db.get('programs', id)
    await db.put('programs', { ...existing, ...data })
  }

  export async function deleteProgram(id) {
    const db = await getDB()
    await db.delete('programs', id)
  }

  export async function setActiveProgram(id) {
    const db = await getDB()
    const tx = db.transaction('programs', 'readwrite')
    const all = await tx.store.getAll()
    await Promise.all(
      all.map(p => tx.store.put({ ...p, isActive: p.id === id }))
    )
    await tx.done
  }

  // ─── Settings ────────────────────────────────────────────────────────────────

  export async function getSetting(key) {
    const db = await getDB()
    const record = await db.get('settings', key)
    return record?.value
  }

  export async function saveSetting(key, value) {
    const db = await getDB()
    await db.put('settings', { key, value })
  }

  // ─── Logs ────────────────────────────────────────────────────────────────────

  export async function getLogs() {
    const db = await getDB()
    return db.getAll('logs')
  }

  export async function getLogsByExercise(exerciseId) {
    const db = await getDB()
    return db.getAllFromIndex('logs', 'by-exercise', exerciseId)
  }

  export async function saveLog(log) {
    const db = await getDB()
    return db.add('logs', log)
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/db/index.js
  git commit -m "feat: upgrade DB to v2 with programs, settings stores and new functions"
  ```

---

## Chunk 2: Settings Context + Unit Conversion

### Task 3: Write unit conversion tests

**Files:**
- Create: `src/context/__tests__/unitConversion.test.js`

- [ ] **Step 1: Create the test file**

  ```js
  import { describe, test, expect } from 'vitest'
  import { toDisplay, toKg } from '../SettingsContext.jsx'

  describe('toDisplay', () => {
    test('returns kg value unchanged when unit is kg', () => {
      expect(toDisplay(100, 'kg')).toBe(100)
    })

    test('converts kg to lb rounded to 1 decimal', () => {
      expect(toDisplay(100, 'lb')).toBe(220.5)
    })

    test('converts 80kg to lb', () => {
      expect(toDisplay(80, 'lb')).toBe(176.4)
    })

    test('handles 0', () => {
      expect(toDisplay(0, 'lb')).toBe(0)
    })
  })

  describe('toKg', () => {
    test('returns value unchanged when unit is kg', () => {
      expect(toKg(100, 'kg')).toBe(100)
    })

    test('converts lb to kg rounded to 1 decimal', () => {
      expect(toKg(220.5, 'lb')).toBe(100)
    })

    test('converts 176.4lb to 80kg', () => {
      expect(toKg(176.4, 'lb')).toBe(80)
    })

    test('handles 0', () => {
      expect(toKg(0, 'lb')).toBe(0)
    })
  })
  ```

- [ ] **Step 2: Run test to confirm it fails**

  ```bash
  cd /Users/jacquaro/Documents/CODE/Test_Site_Nick && npx vitest run src/context/__tests__/unitConversion.test.js
  ```

  Expected: FAIL — `Cannot find module '../SettingsContext.jsx'`

### Task 4: Implement SettingsContext

**Files:**
- Create: `src/context/SettingsContext.jsx`

- [ ] **Step 1: Create the context file**

  ```jsx
  import { createContext, useContext, useEffect, useState } from 'react'
  import { getSetting, saveSetting } from '../db/index.js'

  export function toDisplay(kg, unit) {
    if (unit !== 'lb') return kg
    return Math.round(kg * 2.2046 * 10) / 10
  }

  export function toKg(value, unit) {
    if (unit !== 'lb') return value
    return Math.round((value / 2.2046) * 10) / 10
  }

  const SettingsContext = createContext({ unit: 'kg', setUnit: () => {} })

  export function SettingsProvider({ children }) {
    const [unit, setUnitState] = useState('kg')

    useEffect(() => {
      getSetting('unit').then(val => {
        if (val) setUnitState(val)
      })
    }, [])

    function setUnit(newUnit) {
      setUnitState(newUnit)
      saveSetting('unit', newUnit)
    }

    return (
      <SettingsContext.Provider value={{ unit, setUnit }}>
        {children}
      </SettingsContext.Provider>
    )
  }

  export function useSettings() {
    return useContext(SettingsContext)
  }
  ```

- [ ] **Step 2: Run the unit conversion tests — they should pass**

  ```bash
  cd /Users/jacquaro/Documents/CODE/Test_Site_Nick && npx vitest run src/context/__tests__/unitConversion.test.js
  ```

  Expected: all 8 tests PASS

- [ ] **Step 3: Run the full test suite to check nothing regressed**

  ```bash
  cd /Users/jacquaro/Documents/CODE/Test_Site_Nick && npx vitest run
  ```

  Expected: all existing tests still pass

- [ ] **Step 4: Commit**

  ```bash
  git add src/context/SettingsContext.jsx src/context/__tests__/unitConversion.test.js
  git commit -m "feat: add SettingsContext with unit conversion helpers and tests"
  ```

---

## Chunk 3: DayGrid Component + App Routing

### Task 5: Extract DayGrid from ProgramBuilder

**Files:**
- Create: `src/components/DayGrid.jsx`
- Delete: `src/views/ProgramBuilder.jsx`

The 7-day grid logic in `ProgramBuilder.jsx` (the grid JSX + addExercise/removeExercise/updateExercise) becomes a standalone component. `ProgramBuilder.jsx` is deleted because `Programs.jsx` (Task 6) fully replaces it.

- [ ] **Step 1: Create `src/components/DayGrid.jsx`**

  ```jsx
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // days: [{ dayOfWeek: 0-6, exercises: [{ exerciseId, sets, reps }] }]
  // exercises: full exercise list from DB
  // onChange: (newDays) => void
  export default function DayGrid({ exercises, days, onChange }) {
    function emptyDay(dayOfWeek) {
      return { dayOfWeek, exercises: [] }
    }

    function fullDays() {
      return DAYS.map((_, i) => days.find(d => d.dayOfWeek === i) || emptyDay(i))
    }

    // Always emit only days that have at least one exercise (sparse format)
    // so the programs store stays clean and consumers can rely on exercises.length > 0
    function emit(fullArray) {
      onChange(fullArray.filter(d => d.exercises.length > 0))
    }

    function addExercise(dayIndex) {
      const all = fullDays()
      const updated = all.map((d, i) =>
        i !== dayIndex ? d : {
          ...d,
          exercises: [...d.exercises, { exerciseId: exercises[0]?.id, sets: 3, reps: 8 }]
        }
      )
      emit(updated)
    }

    function removeExercise(dayIndex, exIndex) {
      const all = fullDays()
      const updated = all.map((d, i) =>
        i !== dayIndex ? d : {
          ...d,
          exercises: d.exercises.filter((_, j) => j !== exIndex)
        }
      )
      emit(updated)
    }

    function updateExercise(dayIndex, exIndex, field, value) {
      const all = fullDays()
      const updated = all.map((d, i) =>
        i !== dayIndex ? d : {
          ...d,
          exercises: d.exercises.map((e, j) =>
            j !== exIndex ? e : { ...e, [field]: Number(value) }
          )
        }
      )
      emit(updated)
    }

    const displayed = fullDays()

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 24 }}>
        {displayed.map((day, dayIndex) => (
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
            <button
              className="ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => addExercise(dayIndex)}
              disabled={exercises.length === 0}
            >
              + Add
            </button>
          </div>
        ))}
      </div>
    )
  }
  ```

- [ ] **Step 2: Delete `src/views/ProgramBuilder.jsx`**

  ```bash
  git rm src/views/ProgramBuilder.jsx
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/DayGrid.jsx
  git commit -m "feat: extract DayGrid component, delete ProgramBuilder"
  ```

### Task 6: Update App.jsx navigation

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace `src/App.jsx`**

  ```jsx
  import { useState, useEffect } from 'react'
  import { seedExercises } from './db/index.js'
  import { SettingsProvider } from './context/SettingsContext.jsx'
  import Dashboard from './views/Dashboard.jsx'
  import Programs from './views/Programs.jsx'
  import LogWorkout from './views/LogWorkout.jsx'
  import Progress from './views/Progress.jsx'
  import Settings from './views/Settings.jsx'

  const VIEWS = ['Dashboard', 'Programs', 'Log Workout', 'Progress', 'Settings']

  export default function App() {
    const [view, setView] = useState('Dashboard')

    useEffect(() => {
      seedExercises().catch(e => console.error('Seed failed:', e))
    }, [])

    return (
      <SettingsProvider>
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
          {view === 'Dashboard'   && <Dashboard onStartLog={() => setView('Log Workout')} />}
          {view === 'Programs'    && <Programs />}
          {view === 'Log Workout' && <LogWorkout onDone={() => setView('Dashboard')} />}
          {view === 'Progress'    && <Progress />}
          {view === 'Settings'    && <Settings />}
        </main>
      </SettingsProvider>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/App.jsx
  git commit -m "feat: update App nav with Programs and Settings tabs, wrap with SettingsProvider"
  ```

---

## Chunk 4: Programs View

### Task 7: Create Programs.jsx

**Files:**
- Create: `src/views/Programs.jsx`

- [ ] **Step 1: Create the file**

  This view has two panels: a list of saved program presets, and an edit panel (shown when creating or editing one).

  ```jsx
  import { useState, useEffect } from 'react'
  import {
    getPrograms, getExercises, createProgram,
    updateProgram, deleteProgram, setActiveProgram
  } from '../db/index.js'
  import DayGrid from '../components/DayGrid.jsx'

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function daySummary(program) {
    if (!program.days || program.days.length === 0) return 'No days configured'
    return program.days
      .filter(d => d.exercises.length > 0)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map(d => DAYS[d.dayOfWeek])
      .join(', ') || 'No days configured'
  }

  export default function Programs() {
    const [programs, setPrograms] = useState([])
    const [exercises, setExercises] = useState([])
    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [editDays, setEditDays] = useState([])
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
      load()
      getExercises().then(setExercises)
    }, [])

    async function load() {
      setPrograms(await getPrograms())
    }

    async function handleNew() {
      const id = await createProgram('New Program')
      const freshPrograms = await getPrograms()
      setPrograms(freshPrograms)
      // Use the freshly fetched record so edit panel reflects true DB state
      const newRecord = freshPrograms.find(p => p.id === id)
      startEdit(newRecord)
    }

    function startEdit(program) {
      setEditingId(program.id)
      setEditName(program.name)
      setEditDays(program.days || [])
      setConfirmDelete(false)
    }

    async function handleSave() {
      await updateProgram(editingId, { name: editName, days: editDays })
      setEditingId(null)
      load()
    }

    async function handleDelete() {
      await deleteProgram(editingId)
      setEditingId(null)
      setConfirmDelete(false)
      load()
    }

    async function handleSetActive(id) {
      await setActiveProgram(id)
      load()
    }

    // ── Edit panel ───────────────────────────────────────────────────────────
    if (editingId !== null) {
      const canDelete = programs.length > 1

      return (
        <div>
          <h1>Edit Program</h1>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
              Program name
            </label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={{ fontSize: 18, fontWeight: 600, width: 300 }}
            />
          </div>

          <DayGrid
            exercises={exercises}
            days={editDays}
            onChange={setEditDays}
          />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="primary" onClick={handleSave}>Save</button>
            <button className="ghost" onClick={() => setEditingId(null)}>Cancel</button>

            {canDelete && !confirmDelete && (
              <button
                className="ghost"
                style={{ marginLeft: 'auto', color: 'var(--red)' }}
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </button>
            )}
            {confirmDelete && (
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Delete this program?</span>
                <button className="ghost" style={{ color: 'var(--red)' }} onClick={handleDelete}>Yes, delete</button>
                <button className="ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </span>
            )}
          </div>
        </div>
      )
    }

    // ── List panel ───────────────────────────────────────────────────────────
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1>Programs</h1>
          <button className="primary" onClick={handleNew}>+ New Program</button>
        </div>

        {programs.length === 0 && (
          <div className="card">
            <p style={{ color: 'var(--muted)' }}>No programs yet. Create one to get started.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {programs.map(program => (
            <div key={program.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <strong style={{ fontSize: 16 }}>{program.name}</strong>
                  {program.isActive && (
                    <span style={{
                      background: 'var(--green)', color: '#fff',
                      fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600
                    }}>
                      Active
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>{daySummary(program)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ghost" onClick={() => startEdit(program)}>Edit</button>
                {!program.isActive && (
                  <button className="ghost" onClick={() => handleSetActive(program.id)}>Set Active</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/views/Programs.jsx
  git commit -m "feat: Programs view with list and edit panels"
  ```

---

## Chunk 5: Settings View

### Task 8: Create Settings.jsx

**Files:**
- Create: `src/views/Settings.jsx`

- [ ] **Step 1: Create the file**

  ```jsx
  import { useState, useEffect } from 'react'
  import { getExercises, addExercise, deleteExercise } from '../db/index.js'
  import { useSettings } from '../context/SettingsContext.jsx'

  const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes']

  function MuscleCheckboxes({ label, selected, onChange }) {
    function toggle(muscle) {
      onChange(
        selected.includes(muscle)
          ? selected.filter(m => m !== muscle)
          : [...selected, muscle]
      )
    }
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MUSCLE_GROUPS.map(m => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.includes(m)}
                onChange={() => toggle(m)}
              />
              {m}
            </label>
          ))}
        </div>
      </div>
    )
  }

  export default function Settings() {
    const { unit, setUnit } = useSettings()
    const [exercises, setExercises] = useState([])
    const [newName, setNewName] = useState('')
    const [newPrimary, setNewPrimary] = useState([])
    const [newSecondary, setNewSecondary] = useState([])
    const [errors, setErrors] = useState({}) // exerciseId → error message

    useEffect(() => { loadExercises() }, [])

    async function loadExercises() {
      const all = await getExercises()
      setExercises(all.filter(e => e.custom))
    }

    async function handleAdd() {
      await addExercise({ name: newName.trim(), primary: newPrimary, secondary: newSecondary })
      setNewName('')
      setNewPrimary([])
      setNewSecondary([])
      loadExercises()
    }

    async function handleDelete(id) {
      try {
        await deleteExercise(id)
        setErrors(prev => { const next = { ...prev }; delete next[id]; return next })
        loadExercises()
      } catch {
        setErrors(prev => ({ ...prev, [id]: 'Used in a program — remove it there first.' }))
      }
    }

    const canAdd = newName.trim().length > 0 && newPrimary.length > 0

    return (
      <div>
        <h1>Settings</h1>

        {/* Unit preference */}
        <section className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16 }}>Units</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={unit === 'kg' ? 'primary' : 'ghost'}
              onClick={() => setUnit('kg')}
            >
              KG
            </button>
            <button
              className={unit === 'lb' ? 'primary' : 'ghost'}
              onClick={() => setUnit('lb')}
            >
              LB
            </button>
          </div>
        </section>

        {/* Custom exercises */}
        <section className="card">
          <h2 style={{ marginBottom: 16 }}>Custom Exercises</h2>

          {exercises.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
              No custom exercises yet.
            </p>
          )}

          {exercises.map(ex => (
            <div key={ex.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1 }}>{ex.name}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{ex.primary.join(', ')}</span>
                <button className="ghost" onClick={() => handleDelete(ex.id)}>×</button>
              </div>
              {errors[ex.id] && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
                  {errors[ex.id]}
                </div>
              )}
            </div>
          ))}

          <hr style={{ margin: '16px 0', borderColor: 'var(--border)' }} />

          <h3 style={{ marginBottom: 12, fontSize: 15 }}>Add Exercise</h3>

          <div style={{ marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Exercise name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              style={{ width: 280 }}
            />
          </div>

          <MuscleCheckboxes label="Primary muscles (required)" selected={newPrimary} onChange={setNewPrimary} />
          <MuscleCheckboxes label="Secondary muscles (optional)" selected={newSecondary} onChange={setNewSecondary} />

          <button className="primary" disabled={!canAdd} onClick={handleAdd}>
            Add Exercise
          </button>
        </section>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/views/Settings.jsx
  git commit -m "feat: Settings view with unit toggle and custom exercise manager"
  ```

---

## Chunk 6: BodyDiagram Component

### Task 9: Create BodyDiagram SVG component

**Files:**
- Create: `src/components/BodyDiagram.jsx`

The component renders two simplified body silhouettes (front and back) side by side in an inline SVG. Each muscle group corresponds to SVG shapes. Shapes matching a muscle in the `musclesHit` prop are filled red.

- [ ] **Step 1: Create `src/components/BodyDiagram.jsx`**

  Coordinate system: `viewBox="0 0 280 200"`. Front figure centered at x=70, back figure at x=210. Figure height ~190px with small top margin.

  ```jsx
  const HIGHLIGHT = '#ef4444'
  const REST = '#3a3a3a'
  const SILHOUETTE = '#2a2a2a'

  function fill(muscle, musclesHit) {
    return musclesHit.includes(muscle) ? HIGHLIGHT : REST
  }

  export default function BodyDiagram({ musclesHit = [] }) {
    const f = (m) => fill(m, musclesHit)

    return (
      <svg
        viewBox="0 0 280 200"
        width="100%"
        style={{ maxWidth: 480, display: 'block', margin: '0 auto' }}
        aria-label="Muscle diagram"
      >
        {/* ── FRONT VIEW (center x=70) ─────────────────────────────── */}
        <text x="70" y="10" textAnchor="middle" fill="#666" fontSize="9">FRONT</text>

        {/* Head */}
        <ellipse cx="70" cy="25" rx="13" ry="15" fill={SILHOUETTE} />

        {/* Neck */}
        <rect x="66" y="38" width="8" height="9" rx="2" fill={SILHOUETTE} />

        {/* Left shoulder (front delt) */}
        <ellipse cx="48" cy="51" rx="12" ry="7" fill={f('Shoulders')} />
        {/* Right shoulder */}
        <ellipse cx="92" cy="51" rx="12" ry="7" fill={f('Shoulders')} />

        {/* Chest */}
        <path d="M 55 46 Q 70 58 85 46 L 87 70 Q 70 80 53 70 Z" fill={f('Chest')} />

        {/* Left bicep */}
        <ellipse cx="41" cy="67" rx="7" ry="14" fill={f('Biceps')} />
        {/* Right bicep */}
        <ellipse cx="99" cy="67" rx="7" ry="14" fill={f('Biceps')} />

        {/* Left forearm */}
        <ellipse cx="39" cy="91" rx="5" ry="12" fill={SILHOUETTE} />
        {/* Right forearm */}
        <ellipse cx="101" cy="91" rx="5" ry="12" fill={SILHOUETTE} />

        {/* Midsection / core */}
        <rect x="55" y="70" width="30" height="20" rx="3" fill={SILHOUETTE} />

        {/* Hip connector */}
        <rect x="55" y="89" width="30" height="8" rx="2" fill={SILHOUETTE} />

        {/* Left quad */}
        <ellipse cx="62" cy="123" rx="13" ry="22" fill={f('Quads')} />
        {/* Right quad */}
        <ellipse cx="78" cy="123" rx="13" ry="22" fill={f('Quads')} />

        {/* Left shin */}
        <ellipse cx="61" cy="162" rx="9" ry="15" fill={SILHOUETTE} />
        {/* Right shin */}
        <ellipse cx="79" cy="162" rx="9" ry="15" fill={SILHOUETTE} />

        {/* Left foot */}
        <ellipse cx="61" cy="181" rx="10" ry="5" fill={SILHOUETTE} />
        {/* Right foot */}
        <ellipse cx="79" cy="181" rx="10" ry="5" fill={SILHOUETTE} />

        {/* ── BACK VIEW (center x=210) ─────────────────────────────── */}
        <text x="210" y="10" textAnchor="middle" fill="#666" fontSize="9">BACK</text>

        {/* Head */}
        <ellipse cx="210" cy="25" rx="13" ry="15" fill={SILHOUETTE} />

        {/* Neck */}
        <rect x="206" y="38" width="8" height="9" rx="2" fill={SILHOUETTE} />

        {/* Left shoulder (rear delt) */}
        <ellipse cx="188" cy="51" rx="12" ry="7" fill={f('Shoulders')} />
        {/* Right shoulder */}
        <ellipse cx="232" cy="51" rx="12" ry="7" fill={f('Shoulders')} />

        {/* Back (lats + traps) */}
        <path d="M 193 46 Q 210 54 227 46 L 229 88 Q 210 96 191 88 Z" fill={f('Back')} />

        {/* Left tricep */}
        <ellipse cx="181" cy="67" rx="7" ry="14" fill={f('Triceps')} />
        {/* Right tricep */}
        <ellipse cx="239" cy="67" rx="7" ry="14" fill={f('Triceps')} />

        {/* Left forearm (back) */}
        <ellipse cx="179" cy="91" rx="5" ry="12" fill={SILHOUETTE} />
        {/* Right forearm (back) */}
        <ellipse cx="241" cy="91" rx="5" ry="12" fill={SILHOUETTE} />

        {/* Glutes */}
        <ellipse cx="200" cy="103" rx="13" ry="11" fill={f('Glutes')} />
        <ellipse cx="220" cy="103" rx="13" ry="11" fill={f('Glutes')} />

        {/* Left hamstring */}
        <ellipse cx="200" cy="133" rx="13" ry="22" fill={f('Hamstrings')} />
        {/* Right hamstring */}
        <ellipse cx="220" cy="133" rx="13" ry="22" fill={f('Hamstrings')} />

        {/* Left calf (back) */}
        <ellipse cx="199" cy="164" rx="9" ry="15" fill={SILHOUETTE} />
        {/* Right calf (back) */}
        <ellipse cx="221" cy="164" rx="9" ry="15" fill={SILHOUETTE} />

        {/* Left foot */}
        <ellipse cx="199" cy="181" rx="10" ry="5" fill={SILHOUETTE} />
        {/* Right foot */}
        <ellipse cx="221" cy="181" rx="10" ry="5" fill={SILHOUETTE} />
      </svg>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/components/BodyDiagram.jsx
  git commit -m "feat: BodyDiagram SVG component with front/back muscle highlighting"
  ```

---

## Chunk 7: Update Existing Views

### Task 10: Update Dashboard.jsx

**Files:**
- Modify: `src/views/Dashboard.jsx`

Changes: switch from `getProgram()` to `getActiveProgram()`, compute `musclesHit` for today's day, add `<BodyDiagram />` in today's section. The `nextHitDay` helper must also work against the new program shape (`program.days` array on the active program object).

**Day indexing convention:** `dayOfWeek()` is defined locally as `(new Date().getDay() + 6) % 7`. This converts JS's Sunday=0 to Monday=0, producing Mon=0…Sun=6 — matching both the `DAYS = ['Mon'…'Sun']` array and the `dayOfWeek` values stored in the programs store. Do not import it; define it directly in the file.

- [ ] **Step 1: Replace `src/views/Dashboard.jsx`**

  ```jsx
  import { useState, useEffect } from 'react'
  import { getExercises, getActiveProgram, getLogs } from '../db/index.js'
  import { muscleStatus, getMuscleLastHit } from '../utils/muscleStatus.js'
  import BodyDiagram from '../components/BodyDiagram.jsx'

  const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes']
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  function dayOfWeek() {
    return (new Date().getDay() + 6) % 7
  }

  function nextHitDay(muscle, programDays, exercises) {
    const today = dayOfWeek()
    const days = [...Array(7).keys()].map(i => (today + i + 1) % 7)
    for (const d of days) {
      const day = programDays.find(p => p.dayOfWeek === d)
      if (!day) continue
      const hits = day.exercises.some(({ exerciseId }) => {
        const ex = exercises.find(e => e.id === exerciseId)
        return ex && (ex.primary.includes(muscle) || ex.secondary.includes(muscle))
      })
      if (hits) return DAYS[d]
    }
    return null
  }

  export default function Dashboard({ onStartLog }) {
    const [exercises, setExercises] = useState([])
    const [activeProgram, setActiveProgram] = useState(null)
    const [logs, setLogs] = useState([])

    useEffect(() => {
      Promise.all([getExercises(), getActiveProgram(), getLogs()]).then(([exs, prog, ls]) => {
        setExercises(exs)
        setActiveProgram(prog || null)
        setLogs(ls)
      })
    }, [])

    const programDays = activeProgram?.days || []
    const todayProgram = programDays.find(p => p.dayOfWeek === dayOfWeek())
    const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))

    const musclesHit = todayProgram
      ? [...new Set(
          todayProgram.exercises.flatMap(({ exerciseId }) => {
            const ex = exMap[exerciseId]
            return ex ? [...(ex.primary || []), ...(ex.secondary || [])] : []
          })
        )]
      : []

    return (
      <div>
        <h1>Dashboard</h1>

        {/* Muscle group grid */}
        <h2>Muscle Groups</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
          {MUSCLE_GROUPS.map(muscle => {
            const lastHit = getMuscleLastHit(muscle, logs, exercises)
            const status = muscleStatus(lastHit)
            const next = nextHitDay(muscle, programDays, exercises)
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
        {!activeProgram ? (
          <div className="card">
            <p style={{ color: 'var(--muted)' }}>
              No program active — set one up in <strong>Programs</strong>.
            </p>
          </div>
        ) : todayProgram ? (
          <div className="card">
            <BodyDiagram musclesHit={musclesHit} />

            <p style={{ marginBottom: 12, marginTop: 16, color: 'var(--muted)', fontSize: 13 }}>
              {todayProgram.exercises.length} exercise{todayProgram.exercises.length !== 1 ? 's' : ''} scheduled
            </p>
            {todayProgram.exercises.map(({ exerciseId, sets, reps }) => (
              <div key={exerciseId} style={{ marginBottom: 6, fontSize: 14 }}>
                {exMap[exerciseId]?.name} — {sets}×{reps}
              </div>
            ))}
            <button className="primary" style={{ marginTop: 16 }} onClick={onStartLog}>
              Start Logging
            </button>
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

- [ ] **Step 2: Commit**

  ```bash
  git add src/views/Dashboard.jsx
  git commit -m "feat: update Dashboard to use active program and show BodyDiagram"
  ```

---

### Task 11: Update LogWorkout.jsx

**Files:**
- Modify: `src/views/LogWorkout.jsx`

Changes: switch to `getActiveProgram()`, apply unit conversion to weight display and on save.

- [ ] **Step 1: Replace `src/views/LogWorkout.jsx`**

  ```jsx
  import { useState, useEffect } from 'react'
  import { getExercises, getActiveProgram, saveLog } from '../db/index.js'
  import { epley } from '../utils/oneRepMax.js'
  import { useSettings, toDisplay, toKg } from '../context/SettingsContext.jsx'

  function today() {
    return new Date().toISOString().split('T')[0]
  }

  function dayOfWeek() {
    return (new Date().getDay() + 6) % 7
  }

  export default function LogWorkout({ onDone }) {
    const { unit } = useSettings()
    const [exercises, setExercises] = useState([])
    const [programDay, setProgramDay] = useState(null)
    const [logs, setLogs] = useState({})
    const [done, setDone] = useState(false)

    useEffect(() => {
      Promise.all([getExercises(), getActiveProgram()]).then(([exs, prog]) => {
        setExercises(exs)
        const day = prog?.days?.find(p => p.dayOfWeek === dayOfWeek())
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

    // 1RM uses kg internally — convert entered weight before epley
    function getOneRepMax(exerciseId) {
      const sets = (logs[exerciseId] || []).filter(s => s.weight && s.reps)
      if (sets.length === 0) return null
      return Math.max(...sets.map(s => epley(toKg(Number(s.weight), unit), Number(s.reps))))
    }

    async function handleFinish() {
      const date = today()
      const promises = Object.entries(logs).map(([exerciseId, sets]) => {
        const completedSets = sets.filter(s => s.weight && s.reps)
        if (completedSets.length === 0) return null
        return saveLog({
          date,
          exerciseId: Number(exerciseId),
          // Always save in kg
          sets: completedSets.map(s => ({
            weight: toKg(Number(s.weight), unit),
            reps: Number(s.reps)
          }))
        })
      }).filter(Boolean)
      await Promise.all(promises)
      setDone(true)
      setTimeout(onDone, 1200)
    }

    const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))
    const unitLabel = unit.toUpperCase()

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
          // Display 1RM in user's unit
          const ormDisplay = orm ? toDisplay(orm, unit) : null
          return (
            <div key={exerciseId} className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <h2>{ex?.name}</h2>
                {ormDisplay && (
                  <span style={{ color: 'var(--accent)', fontSize: 13 }}>
                    1RM est. {ormDisplay} {unitLabel}
                  </span>
                )}
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '32px 100px 80px 1fr',
                gap: 8, alignItems: 'center', marginBottom: 8, color: 'var(--muted)', fontSize: 12
              }}>
                <span>Set</span>
                <span>Weight ({unitLabel})</span>
                <span>Reps</span>
                <span></span>
              </div>
              {(logs[exerciseId] || []).map((s, i) => {
                const setOrm = s.weight && s.reps
                  ? toDisplay(epley(toKg(Number(s.weight), unit), Number(s.reps)), unit)
                  : null
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '32px 100px 80px 1fr',
                    gap: 8, alignItems: 'center', marginBottom: 6
                  }}>
                    <span style={{ color: 'var(--muted)' }}>{i + 1}</span>
                    <input
                      type="number" min="0"
                      placeholder={unit === 'lb' ? 'e.g. 176' : 'e.g. 80'}
                      value={s.weight}
                      onChange={e => updateSet(exerciseId, i, 'weight', e.target.value)}
                    />
                    <input
                      type="number" min="1"
                      placeholder={`e.g. ${reps}`}
                      value={s.reps}
                      onChange={e => updateSet(exerciseId, i, 'reps', e.target.value)}
                    />
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {setOrm ? `→ ${setOrm} ${unitLabel} 1RM` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
        <button className="primary" onClick={handleFinish}>Finish & Save</button>
      </div>
    )
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add src/views/LogWorkout.jsx
  git commit -m "feat: LogWorkout uses active program and respects unit setting"
  ```

---

### Task 12: Update Progress.jsx

**Files:**
- Modify: `src/views/Progress.jsx`

Change: unit-aware y-axis label and tooltip formatter. Chart data stays in kg; conversion happens at render time via Recharts formatter props.

- [ ] **Step 1: Replace `src/views/Progress.jsx`**

  ```jsx
  import { useState, useEffect } from 'react'
  import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
  import { getExercises, getLogsByExercise } from '../db/index.js'
  import { bestOneRepMax } from '../utils/oneRepMax.js'
  import { projectOneRepMax } from '../utils/projection.js'
  import { useSettings, toDisplay } from '../context/SettingsContext.jsx'

  export default function Progress() {
    const { unit } = useSettings()
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
        const combined = [
          ...history.map(h => ({ date: h.date, actual: h.oneRepMax, projected: null })),
          ...projected.map(p => ({ date: p.date, actual: null, projected: p.projected })),
        ]
        setChartData(combined)
      })
    }, [selectedId])

    const selectedEx = exercises.find(e => e.id === selectedId)
    const hasData = chartData.some(d => d.actual !== null)
    const unitLabel = unit.toUpperCase()

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
            <p style={{ color: 'var(--muted)' }}>
              No data yet for {selectedEx?.name}. Log some workouts first.
            </p>
          </div>
        ) : (
          <div className="card">
            <h2 style={{ marginBottom: 20 }}>{selectedEx?.name} — 1RM over time</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} />
                <YAxis
                  tick={{ fill: '#888', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  unit={` ${unitLabel}`}
                  tickFormatter={v => toDisplay(v, unit)}
                />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6 }}
                  labelStyle={{ color: '#888' }}
                  {/* Returns [displayValue, dataKeyName]. undefined for name = use default. */}
                  formatter={(value) => value !== null ? [`${toDisplay(value, unit)} ${unitLabel}`, undefined] : [null, undefined]}
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

- [ ] **Step 2: Run the full test suite**

  ```bash
  cd /Users/jacquaro/Documents/CODE/Test_Site_Nick && npx vitest run
  ```

  Expected: all tests pass (unit conversion tests + existing utils tests)

- [ ] **Step 3: Commit**

  ```bash
  git add src/views/Progress.jsx
  git commit -m "feat: Progress chart respects unit setting via Recharts formatter"
  ```

---

## Final Check

- [ ] **Run dev server and manually verify:**

  ```bash
  cd /Users/jacquaro/Documents/CODE/Test_Site_Nick && npm run dev
  ```

  Check:
  1. Nav shows: Dashboard | Programs | Log Workout | Progress | Settings
  2. Programs tab lists any migrated programs, "+ New Program" creates one, edit/save/delete/set-active work
  3. Settings tab toggles KG/LB; the selection persists after page reload
  4. Settings tab shows custom exercise add form; added exercises appear in the exercise selector in Programs
  5. Dashboard shows BodyDiagram when there's a workout today (red regions for muscles hit)
  6. LogWorkout column header and 1RM suffix update when unit changes; logged weight converts back to kg in DB
  7. Progress y-axis and tooltip show lb values when unit is lb

- [ ] **Run full test suite one final time**

  ```bash
  cd /Users/jacquaro/Documents/CODE/Test_Site_Nick && npx vitest run
  ```

  Expected: all tests pass
