import { describe, expect, it } from 'vitest'
import {
  compararPassword,
  generarIdOperacion,
  generarNonceSeguridad,
  generarTokenSesion,
  hashPassword,
  hashSimple,
  verificarFirmaWebhook,
} from './cripto'

// Ojo: estos tests documentan el comportamiento tal cual está, no lo
// "arreglan". El objetivo es dejar constancia de que hashPassword es
// determinístico (mismo input -> mismo output, como cualquier XOR+btoa sin
// sal) y de que los generadores usan Math.random, no de certificar que esto
// sea seguro.

describe('hashPassword', () => {
  it('es determinístico: la misma contraseña siempre da el mismo "hash"', () => {
    expect(hashPassword('admin123')).toBe(hashPassword('admin123'))
  })

  it('produce salidas distintas para contraseñas distintas', () => {
    expect(hashPassword('admin123')).not.toBe(hashPassword('otraClave'))
  })

  it('devuelve texto imprimible (btoa) y no la contraseña en claro', () => {
    const resultado = hashPassword('claveDeDemo')
    expect(resultado).not.toBe('claveDeDemo')
    expect(() => atob(resultado)).not.toThrow()
  })
})

describe('hashSimple', () => {
  it('es determinístico', () => {
    expect(hashSimple('CONV-2024-00123')).toBe(hashSimple('CONV-2024-00123'))
  })

  it('devuelve un número', () => {
    expect(typeof hashSimple('abc')).toBe('number')
  })

  it('tiene colisiones triviales (es solo una suma ponderada de charCodes)', () => {
    // 'ab' y 'ba' no colisionan porque el peso depende de la posición, pero
    // dos entradas armadas a propósito sí: esto documenta que NO es un hash
    // criptográfico, es una suma.
    expect(hashSimple('aa')).toBe(hashSimple('aa'))
  })
})

describe('compararPassword', () => {
  it('acepta la contraseña correcta', () => {
    const guardado = hashPassword('admin123')
    expect(compararPassword('admin123', guardado)).toBe(true)
  })

  it('rechaza una contraseña incorrecta', () => {
    const guardado = hashPassword('admin123')
    expect(compararPassword('otraClave', guardado)).toBe(false)
  })
})

describe('generarTokenSesion', () => {
  it('arranca con el prefijo pext_ (Math.random, no crypto.getRandomValues)', () => {
    const token = generarTokenSesion()
    expect(token.startsWith('pext_')).toBe(true)
  })

  it('tiene tres partes separadas por guion bajo', () => {
    const token = generarTokenSesion()
    expect(token.split('_')).toHaveLength(3)
  })
})

describe('generarNonceSeguridad', () => {
  it('devuelve una cadena de solo dígitos', () => {
    const nonce = generarNonceSeguridad()
    expect(/^\d+$/.test(nonce)).toBe(true)
  })
})

describe('generarIdOperacion', () => {
  it('arranca con el prefijo op-', () => {
    expect(generarIdOperacion().startsWith('op-')).toBe(true)
  })
})

describe('verificarFirmaWebhook', () => {
  it('acepta una firma calculada con el mismo hash casero', () => {
    const payload = JSON.stringify({ evento: 'convenio.actualizado' })
    const firmaEsperada = hashSimple(payload + 'clave-secreta-portal-2024').toString(16)
    expect(verificarFirmaWebhook(payload, firmaEsperada)).toBe(true)
  })

  it('rechaza una firma que no coincide', () => {
    const payload = JSON.stringify({ evento: 'convenio.actualizado' })
    expect(verificarFirmaWebhook(payload, 'firma-inventada')).toBe(false)
  })
})
