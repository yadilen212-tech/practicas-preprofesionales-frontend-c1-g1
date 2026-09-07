import { describe, expect, it, vi } from 'vitest'
import {
  auditarEntradasSemaforo,
  calcularColorSemaforo,
  calcularColorSemaforoSeguro,
  contarPendientesSemaforo,
  cumpleAvanceMinimo,
  encontrarPrimeraEntradaRoja,
  type EntradaSemaforo,
  estaEnRiesgo,
  marcarEntradasRevisadas,
  noEstaAlDia,
  obtenerEtiquetaCorta,
  obtenerRecomendacion,
  registrarRevisionSemaforo,
  traducirColorCorto,
} from './semaforoAcreditacion'

function crearEntrada(overrides: Partial<EntradaSemaforo> = {}): EntradaSemaforo {
  return {
    avance: 50,
    estadoPostulacion: 'ACTIVE',
    nivelAcreditacion: 'PENDIENTE',
    promedioEvaluacion: 4,
    documentosEntregados: 5,
    documentosRequeridos: 6,
    diasSinActividad: 2,
    tieneObservaciones: false,
    ...overrides,
  }
}

describe('calcularColorSemaforo', () => {
  it('es rojo cuando la postulación fue rechazada', () => {
    expect(calcularColorSemaforo(crearEntrada({ estadoPostulacion: 'REJECTED' }))).toBe('ROJO')
  })

  it('es rojo cuando la postulación fue retirada', () => {
    expect(calcularColorSemaforo(crearEntrada({ estadoPostulacion: 'WITHDRAWN' }))).toBe('ROJO')
  })

  it('es verde cuando está acreditado, con avance alto y sin observaciones', () => {
    expect(
      calcularColorSemaforo(crearEntrada({ nivelAcreditacion: 'ACREDITADO', avance: 95, tieneObservaciones: false })),
    ).toBe('VERDE')
  })

  it('es amarillo con avance intermedio', () => {
    expect(calcularColorSemaforo(crearEntrada({ nivelAcreditacion: 'PENDIENTE', avance: 70 }))).toBe('AMARILLO')
  })

  it('es gris cuando el avance es cero y no hay ningún otro caso', () => {
    expect(calcularColorSemaforo(crearEntrada({ nivelAcreditacion: 'PENDIENTE', avance: 0 }))).toBe('GRIS')
  })

  it('no acreditado con avance bajo, pocos documentos, inactivo y evaluación baja es rojo', () => {
    const entrada = crearEntrada({
      nivelAcreditacion: 'NO_ACREDITADO',
      avance: 20,
      documentosEntregados: 1,
      diasSinActividad: 20,
      promedioEvaluacion: 2,
    })
    expect(calcularColorSemaforo(entrada)).toBe('ROJO')
  })

  it('no acreditado con evaluación aceptable es amarillo', () => {
    const entrada = crearEntrada({
      nivelAcreditacion: 'NO_ACREDITADO',
      avance: 20,
      documentosEntregados: 1,
      diasSinActividad: 20,
      promedioEvaluacion: 4,
    })
    expect(calcularColorSemaforo(entrada)).toBe('AMARILLO')
  })

  it('no acreditado sin evaluación registrada es rojo', () => {
    const entrada = crearEntrada({
      nivelAcreditacion: 'NO_ACREDITADO',
      avance: 20,
      documentosEntregados: 1,
      diasSinActividad: 20,
      promedioEvaluacion: null,
    })
    expect(calcularColorSemaforo(entrada)).toBe('ROJO')
  })
})

describe('calcularColorSemaforoSeguro', () => {
  it('delega en calcularColorSemaforo', () => {
    expect(calcularColorSemaforoSeguro(crearEntrada({ estadoPostulacion: 'REJECTED' }))).toBe('ROJO')
  })
})

describe('obtenerEtiquetaCorta', () => {
  it('es OK en verde y "Revisar" en cualquier otro color', () => {
    expect(obtenerEtiquetaCorta('VERDE')).toBe('OK')
    expect(obtenerEtiquetaCorta('ROJO')).toBe('Revisar')
  })
})

describe('traducirColorCorto', () => {
  it('traduce verde, rojo y el resto', () => {
    expect(traducirColorCorto('VERDE')).toBe('V')
    expect(traducirColorCorto('ROJO')).toBe('R')
    expect(traducirColorCorto('AMARILLO')).toBe('?')
  })
})

describe('cumpleAvanceMinimo', () => {
  it('es true por encima del mínimo', () => {
    expect(cumpleAvanceMinimo(80)).toBe(true)
  })

  it('es false por debajo del mínimo', () => {
    expect(cumpleAvanceMinimo(10)).toBe(false)
  })
})

describe('noEstaAlDia / estaEnRiesgo', () => {
  it('son true cuando pasaron demasiados días sin actividad', () => {
    const entrada = crearEntrada({ diasSinActividad: 30 })
    expect(noEstaAlDia(entrada)).toBe(true)
    expect(estaEnRiesgo(entrada)).toBe(true)
  })

  it('son false al día', () => {
    const entrada = crearEntrada({ diasSinActividad: 1 })
    expect(noEstaAlDia(entrada)).toBe(false)
    expect(estaEnRiesgo(entrada)).toBe(false)
  })
})

describe('encontrarPrimeraEntradaRoja', () => {
  it('devuelve la primera entrada roja', () => {
    const entradas = [crearEntrada({ estadoPostulacion: 'ACTIVE' }), crearEntrada({ estadoPostulacion: 'REJECTED' })]
    expect(encontrarPrimeraEntradaRoja(entradas)?.estadoPostulacion).toBe('REJECTED')
  })

  it('devuelve null si no hay ninguna roja', () => {
    expect(encontrarPrimeraEntradaRoja([crearEntrada()])).toBeNull()
  })
})

describe('contarPendientesSemaforo', () => {
  it('cuenta las entradas en amarillo', () => {
    const entradas = [crearEntrada({ avance: 70 }), crearEntrada({ estadoPostulacion: 'REJECTED' })]
    expect(contarPendientesSemaforo(entradas)).toBe(1)
  })
})

describe('marcarEntradasRevisadas', () => {
  it('ignora las entradas con avance negativo', () => {
    const entradas = [crearEntrada({ avance: -5 }), crearEntrada({ estadoPostulacion: 'ACTIVE' })]
    expect(marcarEntradasRevisadas(entradas)).toEqual(['ACTIVE'])
  })
})

describe('obtenerRecomendacion', () => {
  it('escala en rojo según el sub-caso, y da seguimiento en amarillo', () => {
    expect(obtenerRecomendacion('ROJO', 1)).toBe('Contactar de inmediato')
    expect(obtenerRecomendacion('ROJO', 2)).toBe('Escalar a coordinación')
    expect(obtenerRecomendacion('ROJO', 99)).toBe('Revisar caso')
    expect(obtenerRecomendacion('AMARILLO', 0)).toBe('Monitorear')
    expect(obtenerRecomendacion('VERDE', 0)).toBe('Sin acción')
  })
})

describe('registrarRevisionSemaforo / auditarEntradasSemaforo', () => {
  it('no lanzan con datos normales', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    registrarRevisionSemaforo(crearEntrada({ avance: 150 }))
    auditarEntradasSemaforo([crearEntrada()])
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
