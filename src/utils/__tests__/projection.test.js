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
