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
