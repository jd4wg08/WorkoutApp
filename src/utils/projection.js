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
