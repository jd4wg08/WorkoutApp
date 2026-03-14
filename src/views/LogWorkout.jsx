import { useState, useEffect } from 'react'
import { getExercises, getProgram, saveLog } from '../db/index.js'
import { epley } from '../utils/oneRepMax.js'

function today() {
  return new Date().toISOString().split('T')[0]
}

function dayOfWeek() {
  // 0=Sun in JS, convert to Mon=0
  return (new Date().getDay() + 6) % 7
}

export default function LogWorkout({ onDone }) {
  const [exercises, setExercises] = useState([])
  const [programDay, setProgramDay] = useState(null)
  const [logs, setLogs] = useState({}) // exerciseId → [{ weight, reps }]
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([getExercises(), getProgram()]).then(([exs, prog]) => {
      setExercises(exs)
      const day = prog.find(p => p.dayOfWeek === dayOfWeek())
      setProgramDay(day || null)
      if (day) {
        const initial = {}
        day.exercises.forEach(({ exerciseId, sets }) => {
          initial[exerciseId] = Array.from({ length: sets }, () => ({ weight: '', reps: '' }))
        })
        setLogs(initial)
      }
    })
  }, [])

  function updateSet(exerciseId, setIndex, field, value) {
    setLogs(prev => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((s, i) =>
        i !== setIndex ? s : { ...s, [field]: value }
      )
    }))
  }

  function getOneRepMax(exerciseId) {
    const sets = (logs[exerciseId] || []).filter(s => s.weight && s.reps)
    if (sets.length === 0) return null
    return Math.max(...sets.map(s => epley(Number(s.weight), Number(s.reps))))
  }

  async function handleFinish() {
    const date = today()
    const promises = Object.entries(logs).map(([exerciseId, sets]) => {
      const completedSets = sets.filter(s => s.weight && s.reps)
      if (completedSets.length === 0) return null
      return saveLog({
        date,
        exerciseId: Number(exerciseId),
        sets: completedSets.map(s => ({ weight: Number(s.weight), reps: Number(s.reps) }))
      })
    }).filter(Boolean)
    await Promise.all(promises)
    setDone(true)
    setTimeout(onDone, 1200)
  }

  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))

  if (!programDay) {
    return (
      <div>
        <h1>Log Workout</h1>
        <p style={{ color: 'var(--muted)' }}>No workout scheduled for today. Edit your program to add one.</p>
      </div>
    )
  }

  if (done) {
    return <div><h1>Workout logged!</h1></div>
  }

  return (
    <div>
      <h1>Log Workout</h1>
      {programDay.exercises.map(({ exerciseId, sets, reps }) => {
        const ex = exMap[exerciseId]
        const orm = getOneRepMax(exerciseId)
        return (
          <div key={exerciseId} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h2>{ex?.name}</h2>
              {orm && <span style={{ color: 'var(--accent)', fontSize: 13 }}>1RM est. {orm} kg</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '32px 80px 80px 1fr', gap: 8, alignItems: 'center', marginBottom: 8, color: 'var(--muted)', fontSize: 12 }}>
              <span>Set</span><span>Weight (kg)</span><span>Reps</span><span></span>
            </div>
            {(logs[exerciseId] || []).map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 80px 80px 1fr', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: 'var(--muted)' }}>{i + 1}</span>
                <input
                  type="number" min="0" placeholder={`e.g. 80`}
                  value={s.weight}
                  onChange={e => updateSet(exerciseId, i, 'weight', e.target.value)}
                />
                <input
                  type="number" min="1" placeholder={`e.g. ${reps}`}
                  value={s.reps}
                  onChange={e => updateSet(exerciseId, i, 'reps', e.target.value)}
                />
                <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                  {s.weight && s.reps ? `→ ${epley(Number(s.weight), Number(s.reps))} kg 1RM` : ''}
                </span>
              </div>
            ))}
          </div>
        )
      })}
      <button className="primary" onClick={handleFinish}>Finish & Save</button>
    </div>
  )
}
