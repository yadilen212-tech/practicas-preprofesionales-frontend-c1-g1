import { describe, expect, it } from 'vitest'
import {
  agruparFilasPorCarrera,
  agruparFilasPorEmpresa,
  calcularResumenReporte,
  clasificarPrioridadRevision,
  esCasoUrgente,
  esFilaCritica,
  filtrarFilasReporte,
  normalizarFilaBackend,
  obtenerEtiquetaPeriodoActual,
  obtenerEtiquetaPeriodoVigente,
  obtenerNombreTipoDocumento,
  ordenarFilasReporte,
  procesarFilaReporte,
  type ReporteFilaProcesada,
} from './reportes'
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
    approvedHours: 120,
    submittedHours: 0,
    applicationStatus: 'ACTIVE',
    accreditationLevel: 'PENDIENTE',
    evaluationAverage: 4,
    documentsDelivered: 5,
    documentsRequired: 6,
    observations: [],
    updatedAt: '2026-01-01',
    ...overrides,
  }
}

function crearFila(overrides: Partial<ReporteFilaProcesada> = {}): ReporteFilaProcesada {
  const raw = crearRaw()
  return { ...procesarFilaReporte(raw), ...overrides }
}

describe('procesarFilaReporte', () => {
  it('calcula el avance como porcentaje de horas aprobadas', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 120, requiredHours: 240 }))
    expect(fila.avance).toBe(50)
  })

  it('acota el avance a 100 cuando las horas aprobadas superan las requeridas', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 300, requiredHours: 240 }))
    expect(fila.avance).toBe(100)
    expect(fila.semaforo).toBe('VERDE')
  })

  it('da avance 0 cuando no hay horas requeridas', () => {
    const fila = procesarFilaReporte(crearRaw({ requiredHours: 0, approvedHours: 0 }))
    expect(fila.avance).toBe(0)
    expect(fila.semaforo).toBe('GRIS')
  })

  it('marca "No aplica" cuando la postulación fue rechazada', () => {
    const fila = procesarFilaReporte(crearRaw({ applicationStatus: 'REJECTED' }))
    expect(fila.estadoDetallado).toBe('No aplica')
  })

  it('marca PENDIENTE cuando la postulación todavía no está activa', () => {
    const fila = procesarFilaReporte(crearRaw({ applicationStatus: 'SUBMITTED' }))
    expect(fila.estadoDetallado).toBe('PENDIENTE')
  })

  it('detalla el caso acreditado sin observaciones', () => {
    const fila = procesarFilaReporte(
      crearRaw({ approvedHours: 240, accreditationLevel: 'ACREDITADO', evaluationAverage: 5, documentsDelivered: 6, documentsRequired: 6, observations: [] }),
    )
    expect(fila.estadoDetallado).toBe('Acreditado sin observaciones')
  })

  it('detalla el caso acreditado con observaciones', () => {
    const fila = procesarFilaReporte(
      crearRaw({ approvedHours: 240, accreditationLevel: 'ACREDITADO', evaluationAverage: 5, documentsDelivered: 6, documentsRequired: 6, observations: ['falta sello'] }),
    )
    expect(fila.estadoDetallado).toBe('Acreditado con observaciones')
  })

  it('detalla documentos incompletos aunque esté acreditado', () => {
    const fila = procesarFilaReporte(
      crearRaw({ approvedHours: 240, accreditationLevel: 'ACREDITADO', evaluationAverage: 5, documentsDelivered: 2, documentsRequired: 6 }),
    )
    expect(fila.estadoDetallado).toBe('Acreditado, documentos incompletos')
  })

  it('detalla evaluación regular y evaluación baja', () => {
    const regular = procesarFilaReporte(
      crearRaw({ approvedHours: 240, accreditationLevel: 'ACREDITADO', evaluationAverage: 3.2, documentsDelivered: 6, documentsRequired: 6 }),
    )
    expect(regular.estadoDetallado).toBe('Acreditado con evaluación regular')

    const baja = procesarFilaReporte(
      crearRaw({ approvedHours: 240, accreditationLevel: 'ACREDITADO', evaluationAverage: 1, documentsDelivered: 6, documentsRequired: 6 }),
    )
    expect(baja.estadoDetallado).toBe('Revisar evaluación baja')
  })

  it('detalla acreditado sin evaluación registrada', () => {
    const fila = procesarFilaReporte(
      crearRaw({ approvedHours: 240, accreditationLevel: 'ACREDITADO', evaluationAverage: null, documentsDelivered: 6, documentsRequired: 6 }),
    )
    expect(fila.estadoDetallado).toBe('Acreditado sin evaluación registrada')
  })

  it('devuelve "No disponible" cuando no está acreditado ni pendiente', () => {
    const fila = procesarFilaReporte(crearRaw({ approvedHours: 240, accreditationLevel: 'NO_ACREDITADO' }))
    expect(fila.estadoDetallado).toBe('No disponible')
  })
})

describe('calcularResumenReporte', () => {
  it('cuenta acreditados, pendientes y no acreditados', () => {
    const filas = [
      crearFila({ nivelAcreditacion: 'ACREDITADO' }),
      crearFila({ nivelAcreditacion: 'PENDIENTE' }),
      crearFila({ nivelAcreditacion: 'NO_ACREDITADO' }),
      crearFila({ nivelAcreditacion: 'ACREDITADO_CON_OBSERVACIONES' }),
    ]
    const resumen = calcularResumenReporte(filas)
    expect(resumen.acreditados).toBe(1)
    expect(resumen.pendientes).toBe(2)
    expect(resumen.noAcreditados).toBe(1)
    expect(resumen.totalEstudiantes).toBe(4)
  })

  it('cuenta las alertas de avance bajo con semáforo rojo', () => {
    const filas = [crearFila({ avance: 10, semaforo: 'ROJO' })]
    expect(calcularResumenReporte(filas).alertas).toBe(1)
  })

  it('devuelve un resumen vacío cuando no hay filas', () => {
    expect(calcularResumenReporte([]).promedioAvance).toBe(0)
  })
})

describe('filtrarFilasReporte', () => {
  const filas = [
    crearFila({ nombreEstudiante: 'Ana Torres', carrera: 'Sistemas', empresa: 'Acme', nivelAcreditacion: 'ACREDITADO', tutor: 'Ríos', semaforo: 'VERDE' }),
    crearFila({ nombreEstudiante: 'Luis Paredes', carrera: 'Electrónica', empresa: 'Beta', nivelAcreditacion: 'PENDIENTE', tutor: 'Salas', semaforo: 'AMARILLO' }),
  ]

  it('filtra por periodo', () => {
    expect(filtrarFilasReporte(filas, { periodo: '2026-1' })).toHaveLength(2)
    expect(filtrarFilasReporte(filas, { periodo: '2026-2' })).toHaveLength(0)
  })

  it('filtra por carrera', () => {
    expect(filtrarFilasReporte(filas, { carrera: 'Sistemas' })).toHaveLength(1)
  })

  it('filtra por empresa', () => {
    expect(filtrarFilasReporte(filas, { empresa: 'Beta' })).toHaveLength(1)
  })

  it('filtra por nivel de acreditación', () => {
    expect(filtrarFilasReporte(filas, { nivelAcreditacion: 'ACREDITADO' })).toHaveLength(1)
  })

  it('filtra por tutor', () => {
    expect(filtrarFilasReporte(filas, { tutor: 'Salas' })).toHaveLength(1)
  })

  it('filtra por semáforo', () => {
    expect(filtrarFilasReporte(filas, { semaforo: 'VERDE' })).toHaveLength(1)
  })

  it('filtra por texto libre en el nombre', () => {
    expect(filtrarFilasReporte(filas, { texto: 'ana' })).toHaveLength(1)
  })

  it('filtra por texto libre en la empresa', () => {
    expect(filtrarFilasReporte(filas, { texto: 'beta' })).toHaveLength(1)
  })

  it('filtra por texto libre en la carrera', () => {
    expect(filtrarFilasReporte(filas, { texto: 'electrónica' })).toHaveLength(1)
  })

  it('sin filtros devuelve todo', () => {
    expect(filtrarFilasReporte(filas, {})).toHaveLength(2)
  })
})

describe('ordenarFilasReporte', () => {
  const filas = [crearFila({ nombreEstudiante: 'Zoe', avance: 20 }), crearFila({ nombreEstudiante: 'Ana', avance: 90 })]

  it('ordena por nombre', () => {
    expect(ordenarFilasReporte(filas, 'NOMBRE').map((f) => f.nombreEstudiante)).toEqual(['Ana', 'Zoe'])
  })

  it('ordena por avance descendente', () => {
    expect(ordenarFilasReporte(filas, 'AVANCE').map((f) => f.nombreEstudiante)).toEqual(['Ana', 'Zoe'])
  })

  it('no reordena con un criterio desconocido', () => {
    expect(ordenarFilasReporte(filas, 'EMPRESA').length).toBe(2)
  })
})

describe('agruparFilasPorEmpresa / agruparFilasPorCarrera', () => {
  const filas = [crearFila({ empresa: 'Acme', carrera: 'Sistemas' }), crearFila({ empresa: 'Acme', carrera: 'Electrónica' })]

  it('agrupa por empresa', () => {
    expect(agruparFilasPorEmpresa(filas).Acme).toHaveLength(2)
  })

  it('agrupa por carrera', () => {
    const grupos = agruparFilasPorCarrera(filas)
    expect(Object.keys(grupos)).toHaveLength(2)
  })
})

describe('esFilaCritica / esCasoUrgente', () => {
  it('son críticas con semáforo rojo y avance bajo', () => {
    const fila = crearFila({ semaforo: 'ROJO', avance: 10 })
    expect(esFilaCritica(fila)).toBe(true)
    expect(esCasoUrgente(fila)).toBe(true)
  })

  it('no son críticas con avance alto', () => {
    expect(esFilaCritica(crearFila({ semaforo: 'ROJO', avance: 80 }))).toBe(false)
  })
})

describe('obtenerEtiquetaPeriodoActual / obtenerEtiquetaPeriodoVigente', () => {
  it('arman la misma etiqueta a partir del periodo', () => {
    expect(obtenerEtiquetaPeriodoActual('2026-1')).toBe('Periodo 2026, ciclo 1')
    expect(obtenerEtiquetaPeriodoVigente('2026-1')).toBe('Periodo 2026, ciclo 1')
  })
})

describe('clasificarPrioridadRevision', () => {
  it('es urgente con semáforo rojo y avance muy bajo', () => {
    expect(clasificarPrioridadRevision(crearFila({ semaforo: 'ROJO', avance: 10 }))).toBe('Urgente')
  })

  it('es sin prioridad con semáforo verde', () => {
    expect(clasificarPrioridadRevision(crearFila({ semaforo: 'VERDE' }))).toBe('Sin prioridad')
  })
})

describe('normalizarFilaBackend', () => {
  it('usa los campos en camelCase cuando existen', () => {
    const fila = normalizarFilaBackend({ placementId: 1, studentName: 'Ana', period: '2026-1' })
    expect(fila.studentName).toBe('Ana')
  })

  it('cae en los valores por defecto cuando faltan campos', () => {
    const fila = normalizarFilaBackend({ period: '2026-1' })
    expect(fila.studentName).toBe('No disponible')
    expect(fila.applicationStatus).toBe('PENDIENTE')
  })
})

describe('obtenerNombreTipoDocumento', () => {
  it('traduce un par de códigos conocidos', () => {
    expect(obtenerNombreTipoDocumento(1)).toBe('Cédula de identidad')
    expect(obtenerNombreTipoDocumento(20)).toBe('Acta de acreditación')
  })

  it('devuelve "No disponible" para un código fuera de catálogo', () => {
    expect(obtenerNombreTipoDocumento(999)).toBe('No disponible')
  })
})
