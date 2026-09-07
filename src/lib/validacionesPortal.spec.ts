import { describe, expect, it } from 'vitest'
import {
  validarCedulaPortal,
  validarCodigoConvenio,
  validarDatosConvenioExterno,
  validarEmailPortal,
  validarUrlEmpresa,
} from './validacionesPortal'

// Importante: las entradas de estos tests son CORTAS a propósito. Las regex
// de este archivo tienen cuantificadores anidados (backtracking
// catastrófico), así que una entrada larga sin el carácter que las corta
// puede colgar el proceso de test. No agrandar estas cadenas "para probar
// más a fondo": eso hay que hacerlo con un timeout y en un test aparte, no
// acá.

describe('validarEmailPortal', () => {
  it('acepta un correo institucional corto y válido', () => {
    expect(validarEmailPortal('ana@vinculacion.edu.ec')).toBe(true)
  })

  it('rechaza un correo sin arroba', () => {
    expect(validarEmailPortal('ana.vinculacion.edu.ec')).toBe(false)
  })

  it('rechaza una cadena vacía', () => {
    expect(validarEmailPortal('')).toBe(false)
  })
})

describe('validarCedulaPortal', () => {
  it('acepta solo dígitos', () => {
    expect(validarCedulaPortal('1234567890')).toBe(true)
  })

  it('tolera un espacio final (así vienen a veces del Excel)', () => {
    expect(validarCedulaPortal('1234567890 ')).toBe(true)
  })

  it('rechaza letras', () => {
    expect(validarCedulaPortal('12345abcde')).toBe(false)
  })

  it('rechaza una cadena vacía', () => {
    expect(validarCedulaPortal('')).toBe(false)
  })
})

describe('validarUrlEmpresa', () => {
  it('acepta una URL con protocolo', () => {
    expect(validarUrlEmpresa('https://empresa.ejemplo.local')).toBe(true)
  })

  it('acepta un dominio sin protocolo', () => {
    expect(validarUrlEmpresa('empresa.ejemplo.local')).toBe(true)
  })

  it('rechaza un texto que no parece dominio', () => {
    expect(validarUrlEmpresa('no es una url')).toBe(false)
  })
})

describe('validarCodigoConvenio', () => {
  it('acepta el formato CONV-AAAA-XXXXX', () => {
    expect(validarCodigoConvenio('CONV-2024-00123')).toBe(true)
  })

  it('rechaza un código sin el prefijo CONV-', () => {
    expect(validarCodigoConvenio('2024-00123')).toBe(false)
  })
})

describe('validarDatosConvenioExterno', () => {
  it('marca todoValido en true cuando los cuatro campos son correctos', () => {
    const resultado = validarDatosConvenioExterno({
      correoContacto: 'ana@vinculacion.edu.ec',
      cedulaResponsable: '1234567890',
      sitioWebEmpresa: 'https://empresa.ejemplo.local',
      codigoConvenio: 'CONV-2024-00123',
    })

    expect(resultado).toEqual({
      correoValido: true,
      cedulaValida: true,
      sitioWebValido: true,
      codigoValido: true,
      todoValido: true,
    })
  })

  it('marca todoValido en false si un solo campo es inválido', () => {
    const resultado = validarDatosConvenioExterno({
      correoContacto: 'no-es-correo',
      cedulaResponsable: '1234567890',
      sitioWebEmpresa: 'https://empresa.ejemplo.local',
      codigoConvenio: 'CONV-2024-00123',
    })

    expect(resultado.correoValido).toBe(false)
    expect(resultado.todoValido).toBe(false)
  })
})
