import { useState, useEffect } from 'react'
import { getExercises, addExercise, deleteExercise } from '../db/index.js'
import { useSettings } from '../context/SettingsContext.jsx'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes']

function MuscleCheckboxes({ label, selected, onChange }) {
  function toggle(muscle) {
    onChange(
      selected.includes(muscle)
        ? selected.filter(m => m !== muscle)
        : [...selected, muscle]
    )
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {MUSCLE_GROUPS.map(m => (
          <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.includes(m)}
              onChange={() => toggle(m)}
            />
            {m}
          </label>
        ))}
      </div>
    </div>
  )
}

export default function Settings() {
  const { unit, setUnit } = useSettings()
  const [exercises, setExercises] = useState([])
  const [newName, setNewName] = useState('')
  const [newPrimary, setNewPrimary] = useState([])
  const [newSecondary, setNewSecondary] = useState([])
  const [errors, setErrors] = useState({}) // exerciseId → error message

  useEffect(() => { loadExercises() }, [])

  async function loadExercises() {
    const all = await getExercises()
    setExercises(all.filter(e => e.custom))
  }

  async function handleAdd() {
    await addExercise({ name: newName.trim(), primary: newPrimary, secondary: newSecondary })
    setNewName('')
    setNewPrimary([])
    setNewSecondary([])
    loadExercises()
  }

  async function handleDelete(id) {
    try {
      await deleteExercise(id)
      setErrors(prev => { const next = { ...prev }; delete next[id]; return next })
      loadExercises()
    } catch {
      setErrors(prev => ({ ...prev, [id]: 'Used in a program — remove it there first.' }))
    }
  }

  const canAdd = newName.trim().length > 0 && newPrimary.length > 0

  return (
    <div>
      <h1>Settings</h1>

      {/* Unit preference */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 16 }}>Units</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={unit === 'kg' ? 'primary' : 'ghost'}
            onClick={() => setUnit('kg')}
          >
            KG
          </button>
          <button
            className={unit === 'lb' ? 'primary' : 'ghost'}
            onClick={() => setUnit('lb')}
          >
            LB
          </button>
        </div>
      </section>

      {/* Custom exercises */}
      <section className="card">
        <h2 style={{ marginBottom: 16 }}>Custom Exercises</h2>

        {exercises.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
            No custom exercises yet.
          </p>
        )}

        {exercises.map(ex => (
          <div key={ex.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ flex: 1 }}>{ex.name}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{ex.primary.join(', ')}</span>
              <button className="ghost" onClick={() => handleDelete(ex.id)}>×</button>
            </div>
            {errors[ex.id] && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>
                {errors[ex.id]}
              </div>
            )}
          </div>
        ))}

        <hr style={{ margin: '16px 0', borderColor: 'var(--border)' }} />

        <h3 style={{ marginBottom: 12, fontSize: 15 }}>Add Exercise</h3>

        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Exercise name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ width: 280 }}
          />
        </div>

        <MuscleCheckboxes label="Primary muscles (required)" selected={newPrimary} onChange={setNewPrimary} />
        <MuscleCheckboxes label="Secondary muscles (optional)" selected={newSecondary} onChange={setNewSecondary} />

        <button className="primary" disabled={!canAdd} onClick={handleAdd}>
          Add Exercise
        </button>
      </section>
    </div>
  )
}
