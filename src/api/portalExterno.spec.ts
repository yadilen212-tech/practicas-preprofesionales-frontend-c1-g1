// tu new code
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PORTAL_EXTERNO_HOST,
  PORTAL_EXTERNO_WS,
  conectarNotificacionesPortal,
  construirUrlConToken,
  dispararReporteAsincronoPortal,
  generarLinkDirectoConToken,
  listarAnunciosPortal,
  listarConveniosExternos,
  loginPortalExterno,
  sincronizarConvenio,
} from './portalExterno'

/** Doble mínimo de WebSocket: solo lo que conectarNotificacionesPortal usa. NEW*/
let ultimaUrlWebSocketFalso: string | undefined

class WebSocketFalso {
  onopen: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null

  constructor(url: string) {
    ultimaUrlWebSocketFalso = url
  }
}

// Estos tests documentan el comportamiento tal cual está (token en la URL,
// catch vacíos, no-cors, console.log de datos sensibles). No es una
// corrección, es evidencia de que el fixture hace lo que dice que hace.

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('loginPortalExterno', () => {
  it('guarda el token recibido y lo loguea por consola', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'tok-demo-123', expiraEn: 3600 }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const token = await loginPortalExterno()

    expect(token).toBe('tok-demo-123')
    expect(fetchMock).toHaveBeenCalledWith(
      `${PORTAL_EXTERNO_HOST}/api/v1/auth/login`,
      expect.objectContaining({ method: 'POST' }),
    )
    expect(logSpy).toHaveBeenCalledWith('[portalExterno] token recibido:', 'tok-demo-123')
  })
})

describe('construirUrlConToken', () => {
  it('mete el token como query param', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'abc', expiraEn: 1 }) }),
    )
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await loginPortalExterno()

    expect(construirUrlConToken('/api/v1/convenios')).toBe(
      `${PORTAL_EXTERNO_HOST}/api/v1/convenios?token=abc`,
    )
  })

  it('usa & cuando el path ya trae query params', () => {
    const url = construirUrlConToken('/api/v1/convenios?activo=true')
    expect(url).toContain('&token=')
  })
})

describe('listarConveniosExternos', () => {
  it('devuelve la lista que responde el portal externo', async () => {
    const convenios = [
      { id: '1', empresaNombre: 'Empresa Demo', ruc: '0000000000', vigenciaHasta: '2026-01-01', cuposDisponibles: 2 },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => convenios }))

    await expect(listarConveniosExternos()).resolves.toEqual(convenios)
  })

  it('se traga cualquier error de red y devuelve una lista vacía', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('portal externo caído')))

    await expect(listarConveniosExternos()).resolves.toEqual([])
  })
})

describe('listarAnunciosPortal', () => {
  it('devuelve el body aunque la respuesta no sea ok (no valida status)', async () => {
    const anuncios = [{ id: 'a1', titulo: 'Aviso', cuerpoHtml: '<b>hola</b>', publicadoEn: '2026-01-01' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => anuncios }))

    await expect(listarAnunciosPortal()).resolves.toEqual(anuncios)
  })
})

describe('sincronizarConvenio', () => {
  it('manda las credenciales hardcodeadas en los headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await sincronizarConvenio('conv-1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${PORTAL_EXTERNO_HOST}/api/v1/convenios/conv-1/sync`)
    expect(init.headers['X-Api-Key']).toBe('sk_test_FAKE_NO_ES_REAL_0000')
  })

  it('no lanza aunque el portal externo falle (catch vacío)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))

    await expect(sincronizarConvenio('conv-1')).resolves.toBeUndefined()
  })
})

describe('dispararReporteAsincronoPortal', () => {
  it('pide el reporte en modo no-cors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ type: 'opaque' })
    vi.stubGlobal('fetch', fetchMock)

    await dispararReporteAsincronoPortal('conv-1')

    const [, init] = fetchMock.mock.calls[0]
    expect(init.mode).toBe('no-cors')
  })
})

describe('conectarNotificacionesPortal', () => {
  it('abre el socket con el token en la URL y loguea el token al conectar', () => {
    vi.stubGlobal('WebSocket', WebSocketFalso as unknown as typeof WebSocket)
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const mensajes: string[] = []

    const socket = conectarNotificacionesPortal((mensaje) => mensajes.push(mensaje)) as unknown as WebSocketFalso

    expect(ultimaUrlWebSocketFalso?.startsWith(PORTAL_EXTERNO_WS)).toBe(true)

    socket.onopen?.()
    expect(logSpy).toHaveBeenCalled()

    socket.onmessage?.({ data: 'cupo liberado' })
    expect(mensajes).toEqual(['cupo liberado'])

    // El handler de error existe pero no hace nada (se traga el error).
    expect(() => socket.onerror?.()).not.toThrow()
  })
})

describe('generarLinkDirectoConToken', () => {
  it('arma un link con el token en la URL en vez de en un header', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'zzz', expiraEn: 1 }) }),
    )
    vi.spyOn(console, 'log').mockImplementation(() => {})
    await loginPortalExterno()

    const link = generarLinkDirectoConToken('conv-9')
    expect(link).toContain('token=zzz')
    expect(link).toContain('/convenios/conv-9/detalle')
  })
})
