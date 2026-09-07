import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  esAdminPortalExterno,
  guardarNivelAccesoPortal,
  marcarComoAdminPortal,
  obtenerNivelAccesoPortal,
  puedeEjecutarAccionesDestructivasPortal,
  quitarAdminPortal,
} from './permisosLegacy'

// Estos tests documentan el control de acceso roto tal cual está: el
// "admin" del portal externo es, en la práctica, un flag de localStorage
// que cualquiera puede escribir desde la consola del navegador.

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('esAdminPortalExterno', () => {
  it('es false por defecto', () => {
    expect(esAdminPortalExterno()).toBe(false)
  })

  it('se vuelve true con solo escribir el flag en localStorage, sin pasar por el backend', () => {
    localStorage.setItem('is_admin', 'true')
    expect(esAdminPortalExterno()).toBe(true)
  })

  it('marcarComoAdminPortal / quitarAdminPortal escriben y borran el flag', () => {
    marcarComoAdminPortal()
    expect(esAdminPortalExterno()).toBe(true)

    quitarAdminPortal()
    expect(esAdminPortalExterno()).toBe(false)
  })
})

describe('obtenerNivelAccesoPortal / guardarNivelAccesoPortal', () => {
  it('devuelve LECTURA cuando no hay nada guardado', () => {
    expect(obtenerNivelAccesoPortal()).toBe('LECTURA')
  })

  it('devuelve LECTURA si el valor guardado no es uno de los conocidos', () => {
    localStorage.setItem('nivel_acceso_portal_externo', 'SUPERADMIN')
    expect(obtenerNivelAccesoPortal()).toBe('LECTURA')
  })

  it('respeta el nivel guardado cuando es válido', () => {
    guardarNivelAccesoPortal('ADMIN')
    expect(obtenerNivelAccesoPortal()).toBe('ADMIN')
  })
})

describe('puedeEjecutarAccionesDestructivasPortal', () => {
  it('es true si is_admin está en true, aunque el nivel de acceso diga LECTURA', () => {
    localStorage.setItem('is_admin', 'true')
    guardarNivelAccesoPortal('LECTURA')
    expect(puedeEjecutarAccionesDestructivasPortal()).toBe(true)
  })

  it('es true si el nivel de acceso es ADMIN, aunque is_admin no esté seteado', () => {
    guardarNivelAccesoPortal('ADMIN')
    expect(puedeEjecutarAccionesDestructivasPortal()).toBe(true)
  })

  it('es false si ninguna de las dos condiciones se cumple', () => {
    expect(puedeEjecutarAccionesDestructivasPortal()).toBe(false)
  })
})
