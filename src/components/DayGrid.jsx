const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// days: sparse array [{ dayOfWeek: 0-6, exercises: [{ exerciseId, sets, reps }] }]
// exercises: full exercise list from DB
// onChange: (newDays) => void — emits sparse array (only days with exercises)
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
