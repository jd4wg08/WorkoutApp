import { createContext, useContext, useEffect, useState } from 'react'
import { getSetting, saveSetting } from '../db/index.js'

export function toDisplay(kg, unit) {
  if (unit !== 'lb') return kg
  return Math.round(kg * 2.2046 * 10) / 10
}

export function toKg(value, unit) {
  if (unit !== 'lb') return value
  return Math.round((value / 2.2046) * 10) / 10
}

const SettingsContext = createContext({ unit: 'kg', setUnit: () => {} })

export function SettingsProvider({ children }) {
  const [unit, setUnitState] = useState('kg')

  useEffect(() => {
    getSetting('unit').then(val => {
      if (val) setUnitState(val)
    })
  }, [])

  function setUnit(newUnit) {
    setUnitState(newUnit)
    saveSetting('unit', newUnit)
  }

  return (
    <SettingsContext.Provider value={{ unit, setUnit }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
