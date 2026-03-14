import { describe, test, expect } from 'vitest'
import { toDisplay, toKg } from '../SettingsContext.jsx'

describe('toDisplay', () => {
  test('returns kg value unchanged when unit is kg', () => {
    expect(toDisplay(100, 'kg')).toBe(100)
  })

  test('converts kg to lb rounded to 1 decimal', () => {
    expect(toDisplay(100, 'lb')).toBe(220.5)
  })

  test('converts 80kg to lb', () => {
    expect(toDisplay(80, 'lb')).toBe(176.4)
  })

  test('handles 0', () => {
    expect(toDisplay(0, 'lb')).toBe(0)
  })
})

describe('toKg', () => {
  test('returns value unchanged when unit is kg', () => {
    expect(toKg(100, 'kg')).toBe(100)
  })

  test('converts lb to kg rounded to 1 decimal', () => {
    expect(toKg(220.5, 'lb')).toBe(100)
  })

  test('converts 176.4lb to 80kg', () => {
    expect(toKg(176.4, 'lb')).toBe(80)
  })

  test('handles 0', () => {
    expect(toKg(0, 'lb')).toBe(0)
  })
})
