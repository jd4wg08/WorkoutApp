import { useState, useEffect } from 'react'
import { getExercises, getActiveProgram, saveLog } from '../db/index.js'
import { epley } from '../utils/oneRepMax.js'
import { useSettings, toDisplay, toKg } from '../context/SettingsContext.jsx'

function today() {
  return new Date().toISOString().split('T')[0]
}

// Mon=0 … Sun=6 (matches programs store dayOfWeek values)
function dayOfWeek() {
  return (new Date().getDay() + 6) % 7
}

export default function LogWorkout({ onDone }) {
  const { unit } = useSettings()
  const [exercises, setExercises] = useState([])
  const [programDay, setProgramDay] = useState(null)
  const [logs, setLogs] = useState({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([getExercises(), getActiveProgram()]).then(([exs, prog]) => {
      setExercises(exs)
      const day = prog?.days?.find(p => p.dayOfWeek === dayOfWeek())
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

  // 1RM uses kg internally — convert entered weight before epley
  function getOneRepMax(exerciseId) {
    const sets = (logs[exerciseId] || []).filter(s => s.weight && s.reps)
    if (sets.length === 0) return null
    return Math.max(...sets.map(s => epley(toKg(Number(s.weight), unit), Number(s.reps))))
  }

  async function handleFinish() {
    const date = today()
    const promises = Object.entries(logs).map(([exerciseId, sets]) => {
      const completedSets = sets.filter(s => s.weight && s.reps)
      if (completedSets.length === 0) return null
      return saveLog({
        date,
        exerciseId: Number(exerciseId),
        // Always save in kg
        sets: completedSets.map(s => ({
          weight: toKg(Number(s.weight), unit),
          reps: Number(s.reps)
        }))
      })
    }).filter(Boolean)
    await Promise.all(promises)
    setDone(true)
    setTimeout(onDone, 1200)
  }

  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))
  const unitLabel = unit.toUpperCase()

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
        const ormDisplay = orm ? toDisplay(orm, unit) : null
        return (
          <div key={exerciseId} className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <h2>{ex?.name}</h2>
              {ormDisplay && (
                <span style={{ color: 'var(--accent)', fontSize: 13 }}>
                  1RM est. {ormDisplay} {unitLabel}
                </span>
              )}
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: '32px 100px 80px 1fr',
              gap: 8, alignItems: 'center', marginBottom: 8, color: 'var(--muted)', fontSize: 12
            }}>
              <span>Set</span>
              <span>Weight ({unitLabel})</span>
              <span>Reps</span>
              <span></span>
            </div>
            {(logs[exerciseId] || []).map((s, i) => {
              const setOrm = s.weight && s.reps
                ? toDisplay(epley(toKg(Number(s.weight), unit), Number(s.reps)), unit)
                : null
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '32px 100px 80px 1fr',
                  gap: 8, alignItems: 'center', marginBottom: 6
                }}>
                  <span style={{ color: 'var(--muted)' }}>{i + 1}</span>
                  <input
                    type="number" min="0"
                    placeholder={unit === 'lb' ? 'e.g. 176' : 'e.g. 80'}
                    value={s.weight}
                    onChange={e => updateSet(exerciseId, i, 'weight', e.target.value)}
                  />
                  <input
                    type="number" min="1"
                    placeholder={`e.g. ${reps}`}
                    value={s.reps}
                    onChange={e => updateSet(exerciseId, i, 'reps', e.target.value)}
                  />
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {setOrm ? `→ ${setOrm} ${unitLabel} 1RM` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
      <button className="primary" onClick={handleFinish}>Finish & Save</button>
    </div>
  )
}
