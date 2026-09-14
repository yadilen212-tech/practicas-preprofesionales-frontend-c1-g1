import { describe, expect, it, vi } from 'vitest'
import { construirMetadatosExportacion, descargarCsv, generarCsvReporte, generarLogExportacion } from './exportarCsv'
import type { ReporteFilaProcesada } from './reportes'

function crearFila(overrides: Partial<ReporteFilaProcesada> = {}): ReporteFilaProcesada {
  return {
    placementId: 1,
    nombreEstudiante: 'Ana Torres',
    carrera: 'Sistemas',
    empresa: 'Acme',
    tutor: 'Prof. Ríos',
    coordinador: 'Coord. Vega',
    periodo: '2026-1',
    horasAprobadas: 200,
    horasRequeridas: 240,
    avance: 83.3,
    estadoPostulacion: 'ACTIVE',
    nivelAcreditacion: 'PENDIENTE',
    promedioEvaluacion: 4.2,
    documentosEntregados: 5,
    documentosRequeridos: 6,
    observaciones: [],
    semaforo: 'AMARILLO',
    estadoDetallado: 'PENDIENTE',
    ...overrides,
  }
}

describe('generarCsvReporte', () => {
  it('genera el encabezado y una línea por fila', () => {
    const csv = generarCsvReporte([crearFila()])
    const lineas = csv.split('\n')
    expect(lineas[0]).toContain('Estudiante')
    expect(lineas[1]).toContain('Ana Torres')
    expect(lineas[1]).toContain('200/240')
  })

  it('usa "No disponible" cuando no hay observaciones', () => {
    const csv = generarCsvReporte([crearFila()])
    expect(csv).toContain('No disponible')
  })

  it('usa "No disponible" cuando el avance viene nulo o NaN', () => {
    const csvNulo = generarCsvReporte([crearFila({ avance: null as unknown as number })])
    const csvNaN = generarCsvReporte([crearFila({ avance: Number.NaN })])
    expect(csvNulo.split('\n')[1]).toContain('No disponible')
    expect(csvNaN.split('\n')[1]).toContain('No disponible')
  })
})

describe('descargarCsv', () => {
  it('crea un enlace de descarga y lo limpia', () => {
    // jsdom no trae createObjectURL/revokeObjectURL, hay que definirlas a mano
    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    // jsdom no soporta navegar a un blob: URL, esto evita el ruido en consola
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    descargarCsv('a,b\n1,2', 'reporte.csv')

    expect(createObjectURL).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')

    appendSpy.mockRestore()
    clickSpy.mockRestore()
  })
})

describe('construirMetadatosExportacion', () => {
  it('arma los metadatos con el periodo y el total de filas', () => {
    const metadatos = construirMetadatosExportacion('2026-1', 5)
    expect(metadatos.periodo).toBe('2026-1')
    expect(metadatos.totalFilas).toBe(5)
    expect(metadatos.formato).toBe('csv')
  })
})

describe('generarLogExportacion', () => {
  it('no lanza y deja constancia en consola', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    generarLogExportacion([crearFila()])
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
