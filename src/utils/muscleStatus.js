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
