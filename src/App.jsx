import { useState, useEffect } from 'react'
import { seedExercises } from './db/index.js'
import { SettingsProvider } from './context/SettingsContext.jsx'
import Dashboard from './views/Dashboard.jsx'
import Programs from './views/Programs.jsx'
import LogWorkout from './views/LogWorkout.jsx'
import Progress from './views/Progress.jsx'
import Settings from './views/Settings.jsx'

const VIEWS = ['Dashboard', 'Programs', 'Log Workout', 'Progress', 'Settings']

export default function App() {
  const [view, setView] = useState('Dashboard')

  useEffect(() => {
    seedExercises().catch(e => console.error('Seed failed:', e))
  }, [])

  return (
    <SettingsProvider>
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
        {view === 'Dashboard'   && <Dashboard onStartLog={() => setView('Log Workout')} />}
        {view === 'Programs'    && <Programs />}
        {view === 'Log Workout' && <LogWorkout onDone={() => setView('Dashboard')} />}
        {view === 'Progress'    && <Progress />}
        {view === 'Settings'    && <Settings />}
      </main>
    </SettingsProvider>
  )
}
