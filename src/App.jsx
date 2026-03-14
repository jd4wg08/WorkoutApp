import { useState, useEffect } from 'react'
import { seedExercises } from './db/index.js'
import Dashboard from './views/Dashboard.jsx'
import ProgramBuilder from './views/ProgramBuilder.jsx'
import LogWorkout from './views/LogWorkout.jsx'
import Progress from './views/Progress.jsx'

const VIEWS = ['Dashboard', 'Program', 'Log Workout', 'Progress']

export default function App() {
  const [view, setView] = useState('Dashboard')

  useEffect(() => {
    seedExercises().catch(e => console.error('Seed failed:', e))
  }, [])

  return (
    <>
      <nav>
        {VIEWS.map(v => (
          <button
            key={v}
            className={view === v ? 'active' : ''}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
      </nav>
      <main>
        {view === 'Dashboard'    && <Dashboard />}
        {view === 'Program'      && <ProgramBuilder />}
        {view === 'Log Workout'  && <LogWorkout onDone={() => setView('Dashboard')} />}
        {view === 'Progress'     && <Progress />}
      </main>
    </>
  )
}
