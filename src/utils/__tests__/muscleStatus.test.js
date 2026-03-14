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
