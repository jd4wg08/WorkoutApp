import { useState, useEffect } from 'react'
import {
  getPrograms, getExercises, createProgram,
  updateProgram, deleteProgram, setActiveProgram
} from '../db/index.js'
import DayGrid from '../components/DayGrid.jsx'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function daySummary(program) {
  if (!program.days || program.days.length === 0) return 'No days configured'
  return program.days
    .filter(d => d.exercises.length > 0)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map(d => DAYS[d.dayOfWeek])
    .join(', ') || 'No days configured'
}

export default function Programs() {
  const [programs, setPrograms] = useState([])
  const [exercises, setExercises] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDays, setEditDays] = useState([])
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    load()
    getExercises().then(setExercises)
  }, [])

  async function load() {
    setPrograms(await getPrograms())
  }

  async function handleNew() {
    const id = await createProgram('New Program')
    const freshPrograms = await getPrograms()
    setPrograms(freshPrograms)
    // Use the freshly fetched record so edit panel reflects true DB state
    const newRecord = freshPrograms.find(p => p.id === id)
    startEdit(newRecord)
  }

  function startEdit(program) {
    setEditingId(program.id)
    setEditName(program.name)
    setEditDays(program.days || [])
    setConfirmDelete(false)
  }

  async function handleSave() {
    await updateProgram(editingId, { name: editName, days: editDays })
    setEditingId(null)
    load()
  }

  async function handleDelete() {
    await deleteProgram(editingId)
    setEditingId(null)
    setConfirmDelete(false)
    load()
  }

  async function handleSetActive(id) {
    await setActiveProgram(id)
    load()
  }

  // ── Edit panel ───────────────────────────────────────────────────────────
  if (editingId !== null) {
    const canDelete = programs.length > 1

    return (
      <div>
        <h1>Edit Program</h1>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
            Program name
          </label>
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            style={{ fontSize: 18, fontWeight: 600, width: 300 }}
          />
        </div>

        <DayGrid
          exercises={exercises}
          days={editDays}
          onChange={setEditDays}
        />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="primary" onClick={handleSave}>Save</button>
          <button className="ghost" onClick={() => setEditingId(null)}>Cancel</button>

          {canDelete && !confirmDelete && (
            <button
              className="ghost"
              style={{ marginLeft: 'auto', color: 'var(--red)' }}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          )}
          {confirmDelete && (
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Delete this program?</span>
              <button className="ghost" style={{ color: 'var(--red)' }} onClick={handleDelete}>Yes, delete</button>
              <button className="ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
            </span>
          )}
        </div>
      </div>
    )
  }

  // ── List panel ───────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1>Programs</h1>
        <button className="primary" onClick={handleNew}>+ New Program</button>
      </div>

      {programs.length === 0 && (
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>No programs yet. Create one to get started.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {programs.map(program => (
          <div key={program.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <strong style={{ fontSize: 16 }}>{program.name}</strong>
                {program.isActive && (
                  <span style={{
                    background: 'var(--green)', color: '#fff',
                    fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600
                  }}>
                    Active
                  </span>
                )}
              </div>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{daySummary(program)}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ghost" onClick={() => startEdit(program)}>Edit</button>
              {!program.isActive && (
                <button className="ghost" onClick={() => handleSetActive(program.id)}>Set Active</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
