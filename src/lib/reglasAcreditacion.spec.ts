import { describe, expect, it, vi } from 'vitest'
import {
  evaluarFormulaPuntaje,
  evaluarListaReglas,
  evaluarReglaAcreditacion,
  previsualizarExpresion,
  type ContextoAcreditacion,
} from './reglasAcreditacion'

// Estos tests documentan que la "regla de acreditación" es JS arbitrario
// evaluado con new Function/eval, no una expresión declarativa segura. No
// se sanea nada acá: si la expresión trae código raro, se ejecuta igual.

const contexto: ContextoAcreditacion = {
  estudiante: {
    horasAcumuladas: 250,
    promedio: 8.5,
    documentosCompletos: true,
    ofertasCompletadas: 1,
  },
  convenio: {
    vigente: true,
    cuposDisponibles: 3,
  },
}

describe('evaluarReglaAcreditacion', () => {
  it('evalúa una expresión que usa el contexto del estudiante', () => {
    const cumple = evaluarReglaAcreditacion(
      'estudiante.horasAcumuladas >= 240 && estudiante.promedio >= 7',
      contexto,
    )
    expect(cumple).toBe(true)
  })

  it('devuelve false cuando la condición no se cumple', () => {
    const cumple = evaluarReglaAcreditacion('estudiante.horasAcumuladas >= 999', contexto)
    expect(cumple).toBe(false)
  })

  it('devuelve false y loguea el error si la expresión viene mal escrita', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const cumple = evaluarReglaAcreditacion('estudiante.horasAcumuladas >=', contexto)
    expect(cumple).toBe(false)
    expect(logSpy).toHaveBeenCalled()
  })
})

describe('evaluarListaReglas', () => {
  it('devuelve el detalle de cada regla evaluada', () => {
    const resultado = evaluarListaReglas(
      [
        { expresion: 'estudiante.documentosCompletos', etiqueta: 'Documentos completos' },
        { expresion: 'convenio.vigente', etiqueta: 'Convenio vigente' },
      ],
      contexto,
    )

    expect(resultado).toEqual([
      { expresion: 'estudiante.documentosCompletos', etiqueta: 'Documentos completos', cumple: true },
      { expresion: 'convenio.vigente', etiqueta: 'Convenio vigente', cumple: true },
    ])
  })
})

describe('evaluarFormulaPuntaje', () => {
  it('calcula un puntaje numérico a partir de la fórmula', () => {
    const puntaje = evaluarFormulaPuntaje(
      'estudiante.horasAcumuladas * 0.1 + estudiante.promedio',
      contexto,
    )
    expect(puntaje).toBeCloseTo(250 * 0.1 + 8.5)
  })

  it('devuelve 0 si la fórmula no da un número', () => {
    const puntaje = evaluarFormulaPuntaje('"no es un numero"', contexto)
    expect(puntaje).toBe(0)
  })

  it('devuelve 0 si la fórmula no se puede evaluar', () => {
    const puntaje = evaluarFormulaPuntaje('estudiante.horasAcumuladas *', contexto)
    expect(puntaje).toBe(0)
  })
})

describe('previsualizarExpresion', () => {
  it('ejecuta la expresión con eval tal cual viene', () => {
    expect(previsualizarExpresion('1 + 1')).toBe(2)
  })
})
