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
