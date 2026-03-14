import { useState, useEffect } from 'react'
import { getExercises, getProgram, saveProgram } from '../db/index.js'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function emptyDay(dayOfWeek) {
  return { dayOfWeek, exercises: [] }
}

export default function ProgramBuilder() {
  const [exercises, setExercises] = useState([])
  const [days, setDays] = useState(DAYS.map((_, i) => emptyDay(i)))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([getExercises(), getProgram()]).then(([exs, prog]) => {
      setExercises(exs)
      if (prog.length > 0) {
        setDays(DAYS.map((_, i) => prog.find(p => p.dayOfWeek === i) || emptyDay(i)))
      }
    })
  }, [])

  function addExercise(dayIndex) {
    setDays(days.map((d, i) =>
      i !== dayIndex ? d : {
        ...d,
        exercises: [...d.exercises, { exerciseId: exercises[0]?.id, sets: 3, reps: 8 }]
      }
    ))
  }

  function removeExercise(dayIndex, exIndex) {
    setDays(days.map((d, i) =>
      i !== dayIndex ? d : {
        ...d,
        exercises: d.exercises.filter((_, j) => j !== exIndex)
      }
    ))
  }

  function updateExercise(dayIndex, exIndex, field, value) {
    setDays(days.map((d, i) =>
      i !== dayIndex ? d : {
        ...d,
        exercises: d.exercises.map((e, j) =>
          j !== exIndex ? e : { ...e, [field]: Number(value) }
        )
      }
    ))
  }

  async function handleSave() {
    const activeDays = days.filter(d => d.exercises.length > 0)
    await saveProgram(activeDays)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <h1>Program Builder</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12, marginBottom: 24 }}>
        {days.map((day, dayIndex) => (
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
            <button className="ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => addExercise(dayIndex)}>
              + Add
            </button>
          </div>
        ))}
      </div>
      <button className="primary" onClick={handleSave}>
        {saved ? 'Saved!' : 'Save Program'}
      </button>
    </div>
  )
}
