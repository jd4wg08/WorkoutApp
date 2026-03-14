import { useState, useEffect } from 'react'
import { getExercises, getActiveProgram, getLogs } from '../db/index.js'
import { muscleStatus, getMuscleLastHit } from '../utils/muscleStatus.js'
import BodyDiagram from '../components/BodyDiagram.jsx'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Mon=0 … Sun=6 (matches DAYS array and programs store dayOfWeek values)
function dayOfWeek() {
  return (new Date().getDay() + 6) % 7
}

function nextHitDay(muscle, programDays, exercises) {
  const today = dayOfWeek()
  const days = [...Array(7).keys()].map(i => (today + i + 1) % 7)
  for (const d of days) {
    const day = programDays.find(p => p.dayOfWeek === d)
    if (!day) continue
    const hits = day.exercises.some(({ exerciseId }) => {
      const ex = exercises.find(e => e.id === exerciseId)
      return ex && (ex.primary.includes(muscle) || ex.secondary.includes(muscle))
    })
    if (hits) return DAYS[d]
  }
  return null
}

export default function Dashboard({ onStartLog }) {
  const [exercises, setExercises] = useState([])
  const [activeProgram, setActiveProgram] = useState(null)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    Promise.all([getExercises(), getActiveProgram(), getLogs()]).then(([exs, prog, ls]) => {
      setExercises(exs)
      setActiveProgram(prog || null)
      setLogs(ls)
    })
  }, [])

  const programDays = activeProgram?.days || []
  const todayProgram = programDays.find(p => p.dayOfWeek === dayOfWeek())
  const exMap = Object.fromEntries(exercises.map(e => [e.id, e]))

  const musclesHit = todayProgram
    ? [...new Set(
        todayProgram.exercises.flatMap(({ exerciseId }) => {
          const ex = exMap[exerciseId]
          return ex ? [...(ex.primary || []), ...(ex.secondary || [])] : []
        })
      )]
    : []

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Muscle group grid */}
      <h2>Muscle Groups</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {MUSCLE_GROUPS.map(muscle => {
          const lastHit = getMuscleLastHit(muscle, logs, exercises)
          const status = muscleStatus(lastHit)
          const next = nextHitDay(muscle, programDays, exercises)
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
      {!activeProgram ? (
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>
            No program active — set one up in <strong>Programs</strong>.
          </p>
        </div>
      ) : todayProgram ? (
        <div className="card">
          <BodyDiagram musclesHit={musclesHit} />

          <p style={{ marginBottom: 12, marginTop: 16, color: 'var(--muted)', fontSize: 13 }}>
            {todayProgram.exercises.length} exercise{todayProgram.exercises.length !== 1 ? 's' : ''} scheduled
          </p>
          {todayProgram.exercises.map(({ exerciseId, sets, reps }) => (
            <div key={exerciseId} style={{ marginBottom: 6, fontSize: 14 }}>
              {exMap[exerciseId]?.name} — {sets}×{reps}
            </div>
          ))}
          <button className="primary" style={{ marginTop: 16 }} onClick={onStartLog}>
            Start Logging
          </button>
        </div>
      ) : (
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>Rest day. No exercises scheduled.</p>
        </div>
      )}
    </div>
  )
}
