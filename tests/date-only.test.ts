import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseDateOnly, serializeDateOnly } from '@/lib/date-only'

afterEach(() => vi.unstubAllEnvs())

describe('Datas de calendário sem horário', () => {
  it.each(['America/Sao_Paulo', 'America/Los_Angeles', 'Pacific/Kiritimati'])(
    'preserva o dia no fuso %s',
    (timezone) => {
      vi.stubEnv('TZ', timezone)
      const selected = new Date(2028, 1, 29)
      expect(serializeDateOnly(selected)).toBe('2028-02-29')
      const restored = parseDateOnly('2028-02-29')
      expect(restored?.getDate()).toBe(29)
      expect(restored?.getMonth()).toBe(1)
      expect(serializeDateOnly(restored)).toBe('2028-02-29')
    },
  )

  it.each(['2026-02-29', '2026-13-01', '2026-10-08T00:00:00Z', '', null])(
    'não transforma %s em outra data',
    (value) => {
      expect(parseDateOnly(value)).toBeUndefined()
    },
  )

  it('limpar a seleção mantém o contrato de campo opcional', () => {
    expect(serializeDateOnly(undefined)).toBe('')
  })
})
