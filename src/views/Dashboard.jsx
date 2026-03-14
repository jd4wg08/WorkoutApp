import { useState, useEffect } from 'react'
import { getExercises, getProgram, getLogs } from '../db/index.js'
import { muscleStatus, getMuscleLastHit } from '../utils/muscleStatus.js'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes']

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function dayOfWeek() {
  return (new Date().getDay() + 6) % 7
}

function nextHitDay(muscle, program, exercises) {
  const today = dayOfWeek()
  const days = [...Array(7).keys()].map(i => (today + i + 1) % 7)
  for (const d of days) {
    const day = program.find(p => p.dayOfWeek === d)
    if (!day) continue
    const hits = day.exercises.some(({ exerciseId }) => {
      const ex = exercises.find(e => e.id === exerciseId)
      return ex && (ex.primary.includes(muscle) || ex.secondary.includes(muscle))
    })
    if (hits) return DAYS[d]
  }
  return null
}

export default function Dashboard() {
  const [exercises, setExercises] = useState([])
  const [program, setProgram] = useState([])
  const [logs, setLogs] = useState([])

  useEffect(() => {
    Promise.all([getExercises(), getProgram(), getLogs()]).then(([exs, prog, ls]) => {
      setExercises(exs)
      setProgram(prog)
      setLogs(ls)
    })
  }, [])

  const todayProgram = program.find(p => p.dayOfWeek === dayOfWeek())
  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Muscle group grid */}
      <h2>Muscle Groups</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {MUSCLE_GROUPS.map(muscle => {
          const lastHit = getMuscleLastHit(muscle, logs, exercises)
          const status = muscleStatus(lastHit)
          const next = nextHitDay(muscle, program, exercises)
          return (
            <div key={muscle} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                  background: status === 'green' ? 'var(--green)'
                    : status === 'yellow' ? 'var(--yellow)'
                    : status === 'red' ? 'var(--red)'
                    : 'var(--never)'
                }} />
                <strong style={{ fontSize: 14 }}>{muscle}</strong>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {lastHit ? `Last: ${lastHit}` : 'Never hit'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {next ? `Next: ${next}` : 'Not scheduled'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Today's workout */}
      <h2>Today</h2>
      {todayProgram ? (
        <div className="card">
          <p style={{ marginBottom: 12, color: 'var(--muted)', fontSize: 13 }}>
            {todayProgram.exercises.length} exercise{todayProgram.exercises.length !== 1 ? 's' : ''} scheduled
          </p>
          {todayProgram.exercises.map(({ exerciseId, sets, reps }) => (
            <div key={exerciseId} style={{ marginBottom: 6, fontSize: 14 }}>
              {exMap[exerciseId]?.name} — {sets}×{reps}
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>Rest day. No exercises scheduled.</p>
        </div>
      )}
    </div>
  )
}
