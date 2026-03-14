export function epley(weight, reps) {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

export function bestOneRepMax(sets) {
  return Math.max(...sets.map(s => epley(s.weight, s.reps)))
}
