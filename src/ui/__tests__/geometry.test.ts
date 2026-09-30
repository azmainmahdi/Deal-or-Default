import { expect, it } from 'vitest'
import { cellOf } from '../geometry'

it('lays squares out boustrophedon from the bottom-left', () => {
  expect(cellOf(1)).toEqual({ x: 0, y: 900 })
  expect(cellOf(10)).toEqual({ x: 900, y: 900 })
  expect(cellOf(11)).toEqual({ x: 900, y: 800 })
  expect(cellOf(20)).toEqual({ x: 0, y: 800 })
  expect(cellOf(100)).toEqual({ x: 0, y: 0 })
  const seen = new Set(Array.from({ length: 100 }, (_, i) => JSON.stringify(cellOf(i + 1))))
  expect(seen.size).toBe(100)
})
