import { describe, expect, it } from 'vitest'
import {
  calcularProyeccionCierre,
  calcularPromedioScoreGlobal,
  calcularScoreDocumental,
  calcularScoreEvaluacion,
  calcularScoreGlobal,
  calcularTendenciaAvance,
  calcularTendenciaHistorica,
  construirMetadatosScore,
  filtrarFilasDeAltoRiesgo,
  obtenerBanderaAlerta,
  obtenerEtiquetaPorDecil,
  obtenerNivelRiesgo,
  registrarIdsDeAltoRiesgo,
} from './metricasAcreditacion'
import { procesarFilaReporte } from './reportes'
import type { ReporteFilaRaw } from '@/api/reportes'

function crearRaw(overrides: Partial<ReporteFilaRaw> = {}): ReporteFilaRaw {
  return {
    placementId: 1,
    studentId: 10,
    studentName: 'Ana Torres',
    career: 'Sistemas',
    companyName: 'Acme',
    tutorName: 'Prof. Ríos',
    coordinatorName: 'Coord. Vega',
    period: '2026-1',
    requiredHours: 240,
    approvedHours: 220,
    submittedHours: 0,
    applicationStatus: 'ACTIVE',
    accreditationLevel: 'ACREDITADO',
    evaluationAverage: 5,
    documentsDelivered: 6,
    documentsRequired: 6,
    observations: [],
    updatedAt: '2026-01-01',
    ...overrides,
  }
}

describe('calcularScoreDocumental', () => {
  it('es 100 cuando entregó todos los documentos', () => {
    expect(calcularScoreDocumental(6, 6)).toBe(100)
  })

  it('es 0 cuando no entregó casi nada', () => {
    expect(calcularScoreDocumental(0, 6)).toBe(0)
  })

  it('es 100 cuando no se requieren documentos', () => {
    expect(calcularScoreDocumental(0, 0)).toBe(100)
  })
})

describe('calcularScoreEvaluacion', () => {
  it('es 100 con evaluación 5 y 50 sin evaluación', () => {
    expect(calcularScoreEvaluacion(5)).toBe(100)
    expect(calcularScoreEvaluacion(null)).toBe(50)
  })
})

describe('obtenerNivelRiesgo', () => {
  it('clasifica bajo, medio y alto', () => {
    expect(obtenerNivelRiesgo(80)).toBe('Bajo')
    expect(obtenerNivelRiesgo(50)).toBe('Medio')
    expect(obtenerNivelRiesgo(10)).toBe('Alto')
  })
})

describe('calcularScoreGlobal', () => {
  it('da un score alto para una fila en buen estado (verde)', () => {
    const fila = procesarFilaReporte(crearRaw())
    const { scoreGlobal } = calcularScoreGlobal(fila)
    expect(scoreGlobal).toBeGreaterThan(50)
  })

  it('da un score medio para avance intermedio en amarillo', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 170, requiredHours: 240 }))
    expect(fila.semaforo).toBe('AMARILLO')
    expect(calcularScoreGlobal(fila).scoreAvance).toBe(65)
  })

  it('da 55 cuando el avance es intermedio pero el semáforo no es amarillo', () => {
    // combinación que no debería darse en la práctica (el semáforo se
    // calcula a partir del avance), pero el código la contempla igual
    const fila = { ...procesarFilaReporte(crearRaw({ approvedHours: 170, requiredHours: 240 })), semaforo: 'ROJO' }
    expect(calcularScoreGlobal(fila).scoreAvance).toBe(55)
  })

  it('da el score mínimo cuando el avance es muy bajo', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 10, requiredHours: 240 }))
    expect(calcularScoreGlobal(fila).scoreAvance).toBe(10)
  })

  it('da un score de avance 30 en el rango intermedio-bajo', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 100, requiredHours: 240 }))
    expect(calcularScoreGlobal(fila).scoreAvance).toBe(30)
  })

  it('da 0 cuando no hay avance definido', () => {
    const fila = { ...procesarFilaReporte(crearRaw()), avance: null as unknown as number }
    expect(calcularScoreGlobal(fila).scoreAvance).toBe(0)
  })
})

describe('calcularTendenciaAvance / calcularTendenciaHistorica', () => {
  it('detectan subiendo, bajando y estable', () => {
    expect(calcularTendenciaAvance([40, 60])).toBe('Subiendo')
    expect(calcularTendenciaAvance([60, 40])).toBe('Bajando')
    expect(calcularTendenciaAvance([40, 40])).toBe('Estable')
    expect(calcularTendenciaAvance([40])).toBe('Sin datos suficientes')

    expect(calcularTendenciaHistorica([40, 60])).toBe('Subiendo')
    expect(calcularTendenciaHistorica([60, 40])).toBe('Bajando')
    expect(calcularTendenciaHistorica([40, 40])).toBe('Estable')
    expect(calcularTendenciaHistorica([40])).toBe('Sin datos suficientes')
  })
})

describe('obtenerEtiquetaPorDecil', () => {
  it('etiqueta el decil crítico y el excelente', () => {
    expect(obtenerEtiquetaPorDecil(0)).toBe('Puntaje 0-9: crítico')
    expect(obtenerEtiquetaPorDecil(10)).toBe('Puntaje 100: excelente')
  })

  it('devuelve "No disponible" fuera del catálogo', () => {
    expect(obtenerEtiquetaPorDecil(99)).toBe('No disponible')
  })
})

describe('obtenerBanderaAlerta', () => {
  it('marca crítico con semáforo rojo y avance muy bajo', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 5 }))
    expect(obtenerBanderaAlerta(fila)).toBe('Crítico')
  })
})

describe('calcularPromedioScoreGlobal / filtrarFilasDeAltoRiesgo', () => {
  it('calcula el promedio de scores', () => {
    const filas = [procesarFilaReporte(crearRaw()), procesarFilaReporte(crearRaw())]
    expect(calcularPromedioScoreGlobal(filas)).toBeGreaterThan(0)
  })

  it('devuelve 0 sin filas', () => {
    expect(calcularPromedioScoreGlobal([])).toBe(0)
  })

  it('filtra las filas de alto riesgo', () => {
    const filaRiesgosa = procesarFilaReporte(crearRaw({ approvedHours: 0, evaluationAverage: null, documentsDelivered: 0 }))
    expect(filtrarFilasDeAltoRiesgo([filaRiesgosa])).toHaveLength(1)
  })
})

describe('calcularProyeccionCierre', () => {
  it('cierra este periodo en verde con documentos completos', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 240 }))
    expect(calcularProyeccionCierre(fila)).toBe('Cierra este periodo')
  })

  it('marca PENDIENTE de intervención en rojo', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 50 }))
    expect(fila.semaforo).toBe('ROJO')
    expect(calcularProyeccionCierre(fila)).toBe('PENDIENTE de intervención')
  })
})

describe('construirMetadatosScore / registrarIdsDeAltoRiesgo', () => {
  it('arma los metadatos del score', () => {
    const fila = procesarFilaReporte(crearRaw())
    expect(construirMetadatosScore(fila).placementId).toBe(1)
  })

  it('no lanza al registrar ids de alto riesgo', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 0 }))
    expect(() => registrarIdsDeAltoRiesgo([fila])).not.toThrow()
  })
})
