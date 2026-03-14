import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getExercises, getLogsByExercise } from '../db/index.js'
import { bestOneRepMax } from '../utils/oneRepMax.js'
import { projectOneRepMax } from '../utils/projection.js'
import { useSettings, toDisplay } from '../context/SettingsContext.jsx'

export default function Progress() {
  const { unit } = useSettings()
  const [exercises, setExercises] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    getExercises().then(exs => {
      setExercises(exs)
      if (exs.length > 0) setSelectedId(exs[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    getLogsByExercise(selectedId).then(logs => {
      const sorted = logs.sort((a, b) => a.date.localeCompare(b.date))
      const history = sorted.map(l => ({
        date: l.date,
        oneRepMax: bestOneRepMax(l.sets),
      }))
      const projected = projectOneRepMax(history)
      const combined = [
        ...history.map(h => ({ date: h.date, actual: h.oneRepMax, projected: null })),
        ...projected.map(p => ({ date: p.date, actual: null, projected: p.projected })),
      ]
      setChartData(combined)
    })
  }, [selectedId])

  const selectedEx = exercises.find(e => e.id === selectedId)
  const hasData = chartData.some(d => d.actual !== null)
  const unitLabel = unit.toUpperCase()

  return (
    <div>
      <h1>Progress</h1>

      <div style={{ marginBottom: 24 }}>
        <select
          value={selectedId || ''}
          onChange={e => setSelectedId(Number(e.target.value))}
          style={{ minWidth: 200 }}
        >
          {exercises.map(e => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      {!hasData ? (
        <div className="card">
          <p style={{ color: 'var(--muted)' }}>No data yet for {selectedEx?.name}. Log some workouts first.</p>
        </div>
      ) : (
        <div className="card">
          <h2 style={{ marginBottom: 20 }}>{selectedEx?.name} — 1RM over time</h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 11 }} tickLine={false} />
              <YAxis
                tick={{ fill: '#888', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                unit={` ${unitLabel}`}
                tickFormatter={v => toDisplay(v, unit)}
              />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 6 }}
                labelStyle={{ color: '#888' }}
                formatter={(value) => value !== null ? [`${toDisplay(value, unit)} ${unitLabel}`, undefined] : [null, undefined]}
              />
              <Legend wrapperStyle={{ fontSize: 13, color: '#888' }} />
              <Line
                type="monotone" dataKey="actual" name="Actual 1RM"
                stroke="#4f8ef7" strokeWidth={2} dot={{ r: 4, fill: '#4f8ef7' }}
                connectNulls={false}
              />
              <Line
                type="monotone" dataKey="projected" name="Projected"
                stroke="#888" strokeWidth={1.5} strokeDasharray="5 4"
                dot={false} connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
