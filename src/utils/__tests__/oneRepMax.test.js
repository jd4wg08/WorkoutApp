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

test('bestOneRepMax returns 0 for empty sets', () => {
  expect(bestOneRepMax([])).toBe(0)
})
