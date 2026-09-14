import { describe, expect, it } from 'vitest'
import {
  formatearEstadoAcreditacion,
  formatearHoras,
  formatearHorasCompletas,
  formatearNombreArchivoExportacion,
  formatearNombreCompleto,
  formatearNombreEstudiante,
  formatearObservaciones,
  formatearPorcentaje,
  formatearPorcentajeAvance,
  formatearRangoFechas,
  formatearResumenTexto,
  formatearTituloReporte,
  traducirEstadoPostulacion,
} from './formatoReporte'

describe('formatearPorcentaje', () => {
  it('redondea el valor', () => {
    expect(formatearPorcentaje(88.6)).toBe('89%')
  })

  it('devuelve "No disponible" cuando no hay valor', () => {
    expect(formatearPorcentaje(null)).toBe('No disponible')
    expect(formatearPorcentaje(undefined)).toBe('No disponible')
  })
})

describe('formatearHoras', () => {
  it('arma el texto de horas aprobadas sobre requeridas', () => {
    expect(formatearHoras(120, 240)).toBe('120 / 240 h')
  })
})

describe('formatearNombreEstudiante', () => {
  it('devuelve el nombre cuando existe', () => {
    expect(formatearNombreEstudiante('Ana Torres')).toBe('Ana Torres')
  })

  it('devuelve "No disponible" cuando viene vacío', () => {
    expect(formatearNombreEstudiante('')).toBe('No disponible')
    expect(formatearNombreEstudiante(null)).toBe('No disponible')
  })
})

describe('formatearEstadoAcreditacion', () => {
  it('distingue acreditado con y sin observaciones', () => {
    expect(formatearEstadoAcreditacion('ACREDITADO', 100, false)).toBe('Acreditado')
    expect(formatearEstadoAcreditacion('ACREDITADO', 100, true)).toBe('Acreditado con observaciones')
  })

  it('distingue los tres matices de PENDIENTE según el avance', () => {
    expect(formatearEstadoAcreditacion('PENDIENTE', 90, false)).toBe('PENDIENTE, casi completo')
    expect(formatearEstadoAcreditacion('PENDIENTE', 60, false)).toBe('PENDIENTE, a mitad de camino')
    expect(formatearEstadoAcreditacion('PENDIENTE', 10, false)).toBe('PENDIENTE, recién empieza')
  })

  it('devuelve "No acreditado" para cualquier otro nivel', () => {
    expect(formatearEstadoAcreditacion('NO_ACREDITADO', 10, false)).toBe('No acreditado')
  })
})

describe('formatearObservaciones', () => {
  it('une las observaciones con un separador', () => {
    expect(formatearObservaciones(['falta carta', 'falta seguro'])).toBe('falta carta · falta seguro')
  })

  it('devuelve "No disponible" cuando no hay observaciones', () => {
    expect(formatearObservaciones([])).toBe('No disponible')
    expect(formatearObservaciones(null)).toBe('No disponible')
  })
})

describe('formatearTituloReporte', () => {
  it('arma el título para el reporte de acreditación', () => {
    expect(formatearTituloReporte('2026-1', 'acreditacion')).toBe('Reporte de acreditación — 2026-1')
  })

  it('arma el título para horas y evaluaciones', () => {
    expect(formatearTituloReporte('2026-1', 'horas')).toBe('Reporte de horas — 2026-1')
    expect(formatearTituloReporte('2026-1', 'evaluaciones')).toBe('Reporte de evaluaciones — 2026-1')
  })
})

describe('traducirEstadoPostulacion', () => {
  it('traduce los estados más comunes', () => {
    expect(traducirEstadoPostulacion('ACCEPTED')).toBe('Aceptada')
    expect(traducirEstadoPostulacion('SUBMITTED')).toBe('PENDIENTE')
    expect(traducirEstadoPostulacion('PENDING')).toBe('PENDIENTE')
    expect(traducirEstadoPostulacion('INTERVIEW')).toBe('En entrevista')
    expect(traducirEstadoPostulacion('ACTIVE')).toBe('Activa')
    expect(traducirEstadoPostulacion('REJECTED')).toBe('Rechazada')
    expect(traducirEstadoPostulacion('WITHDRAWN')).toBe('Retirada')
    expect(traducirEstadoPostulacion('ALGO_RARO')).toBe('No disponible')
  })
})

describe('duplicados de formato (mismo resultado que su original)', () => {
  it('formatearPorcentajeAvance se comporta igual que formatearPorcentaje', () => {
    expect(formatearPorcentajeAvance(50)).toBe('50%')
    expect(formatearPorcentajeAvance(null)).toBe('No disponible')
  })

  it('formatearHorasCompletas se comporta igual que formatearHoras', () => {
    expect(formatearHorasCompletas(10, 20)).toBe('10 / 20 h')
  })

  it('formatearNombreCompleto se comporta igual que formatearNombreEstudiante', () => {
    expect(formatearNombreCompleto('Ana')).toBe('Ana')
    expect(formatearNombreCompleto(undefined)).toBe('No disponible')
  })
})

describe('formatearNombreArchivoExportacion', () => {
  it('arma el nombre de archivo para acreditación', () => {
    expect(formatearNombreArchivoExportacion('2026-1', 'acreditacion')).toBe('reporte-acreditacion-2026-1.csv')
  })
})

describe('formatearRangoFechas', () => {
  it('formatea el rango cuando ambas fechas son válidas', () => {
    expect(formatearRangoFechas('2026-01-05', '2026-06-30')).toContain('–')
  })

  it('devuelve "No disponible" con una fecha inválida', () => {
    expect(formatearRangoFechas('no-es-fecha', '2026-06-30')).toBe('No disponible')
  })
})

describe('formatearResumenTexto', () => {
  it('arma el resumen con nombre, periodo y avance', () => {
    expect(formatearResumenTexto({ nombreEstudiante: 'Ana', periodo: '2026-1', avance: 83.6 })).toBe(
      'Ana (2026-1) — avance 84%',
    )
  })
})
