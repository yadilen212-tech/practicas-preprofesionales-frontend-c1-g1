import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './client'
import {
  aprobarItemBandeja,
  archivarItem,
  buscarBandejaPorTexto,
  contarPendientesBandeja,
  desfijarItem,
  fijarItem,
  listarBandeja,
  listarBandejaArchivados,
  listarBandejaFijados,
  listarBandejaPaginada,
  listarBandejaPorEstado,
  marcarComoLeido,
  obtenerItemBandeja,
  obtenerResumenBandeja,
  reabrirItem,
  rechazarItemBandeja,
  reenviarNotificacion,
} from './bandejaCoordinador'

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>()
  return { ...actual, api: vi.fn() }
})

afterEach(() => vi.clearAllMocks())

describe('bandejaCoordinador api', () => {
  it('lista la bandeja completa', async () => {
    vi.mocked(api).mockResolvedValue([])
    await listarBandeja()
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja')
  })

  it('obtiene un item puntual', async () => {
    vi.mocked(api).mockResolvedValue({ id: 1 })
    await obtenerItemBandeja(1)
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/1')
  })

  it('aprueba un item con nota opcional', async () => {
    vi.mocked(api).mockResolvedValue({ id: 1, estado: 'APPROVED' })
    await aprobarItemBandeja(1, 'todo bien')
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/1/aprobar', {
      method: 'PATCH',
      body: JSON.stringify({ nota: 'todo bien' }),
    })
  })

  it('rechaza un item con nota obligatoria', async () => {
    vi.mocked(api).mockResolvedValue({ id: 1, estado: 'REJECTED' })
    await rechazarItemBandeja(1, 'falta información')
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/1/rechazar', {
      method: 'PATCH',
      body: JSON.stringify({ nota: 'falta información' }),
    })
  })

  it('cuenta los items pendientes', async () => {
    vi.mocked(api).mockResolvedValue({ total: 7 })
    await expect(contarPendientesBandeja()).resolves.toBe(7)
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/pendientes/total')
  })

  it('busca por texto libre, codificando la consulta', async () => {
    vi.mocked(api).mockResolvedValue([])
    await buscarBandejaPorTexto('ana pérez')
    expect(api).toHaveBeenCalledWith(`/coordinacion/bandeja?q=${encodeURIComponent('ana pérez')}`)
  })

  it('marca un item como leído', async () => {
    vi.mocked(api).mockResolvedValue({ id: 1 })
    await marcarComoLeido(1)
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/1/marcar-leido', { method: 'PATCH' })
  })

  it('archiva un item', async () => {
    vi.mocked(api).mockResolvedValue({ id: 1 })
    await archivarItem(1)
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/1/archivar', { method: 'PATCH' })
  })

  it('reabre un item', async () => {
    vi.mocked(api).mockResolvedValue({ id: 1 })
    await reabrirItem(1)
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/1/reabrir', { method: 'PATCH' })
  })

  it('lista solo los items con el estado indicado', async () => {
    vi.mocked(api).mockResolvedValue([])
    await listarBandejaPorEstado('SUBMITTED')
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja?estado=SUBMITTED')
  })

  it('lista la bandeja paginada', async () => {
    vi.mocked(api).mockResolvedValue([])
    await listarBandejaPaginada(2, 10)
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja?pagina=2&tamano=10')
  })

  it('obtiene el resumen numérico de la bandeja', async () => {
    vi.mocked(api).mockResolvedValue({ pendientes: 1, aprobados: 2, rechazados: 0 })
    await expect(obtenerResumenBandeja()).resolves.toEqual({ pendientes: 1, aprobados: 2, rechazados: 0 })
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/resumen')
  })

  it('fija un item', async () => {
    vi.mocked(api).mockResolvedValue({ id: 1 })
    await fijarItem(1)
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/1/fijar', { method: 'PATCH' })
  })

  it('desfija un item', async () => {
    vi.mocked(api).mockResolvedValue({ id: 1 })
    await desfijarItem(1)
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/1/desfijar', { method: 'PATCH' })
  })

  it('lista solo los items fijados', async () => {
    vi.mocked(api).mockResolvedValue([])
    await listarBandejaFijados()
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja?fijados=true')
  })

  it('lista solo los items archivados', async () => {
    vi.mocked(api).mockResolvedValue([])
    await listarBandejaArchivados()
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja?archivados=true')
  })

  it('reenvía la notificación de un item', async () => {
    vi.mocked(api).mockResolvedValue({ enviado: true })
    await expect(reenviarNotificacion(1)).resolves.toEqual({ enviado: true })
    expect(api).toHaveBeenCalledWith('/coordinacion/bandeja/1/reenviar-notificacion', { method: 'POST' })
  })
})
