
// new test
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import { obtenerFilasReporte, obtenerResumenEmpresas } from './reportes'

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return { ...actual, api: vi.fn() }
})

afterEach(() => vi.clearAllMocks())

describe('reportes api', () => {
  it('pide las filas del reporte con el periodo como query', async () => {
    vi.mocked(api).mockResolvedValue([])
    await obtenerFilasReporte({ period: '2026-1' })
    expect(api).toHaveBeenCalledWith('/reportes/acreditacion?period=2026-1')
  })

  it('agrega la carrera al query cuando se pasa', async () => {
    vi.mocked(api).mockResolvedValue([])
    await obtenerFilasReporte({ period: '2026-1', career: 'Sistemas' })
    expect(api).toHaveBeenCalledWith('/reportes/acreditacion?period=2026-1&career=Sistemas')
  })

  it('pide el resumen de empresas del periodo', async () => {
    vi.mocked(api).mockResolvedValue({})
    await obtenerResumenEmpresas('2026-1')
    expect(api).toHaveBeenCalledWith('/reportes/empresas?period=2026-1')
  })
})
