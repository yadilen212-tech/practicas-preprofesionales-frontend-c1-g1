// Permisos "legacy" para la sección del portal externo.
//
// Esto es temporal: cuando armamos la integración con el portal externo,
// RequireRole y useAuth todavía no existían en el repo (o eso creíamos,
// en realidad ya estaban pero no los vimos a tiempo). Como el portal
// externo maneja su PROPIO concepto de "administrador" que no tiene nada
// que ver con nuestros roles (STUDENT/TUTOR/COMPANY/COORDINATOR), guardamos
// un flag aparte en localStorage cuando el usuario se loguea como admin del
// portal externo. El profe dijo que para la demo así está bien, después lo
// migramos a que use el sistema de roles de verdad.

const LLAVE_IS_ADMIN = 'is_admin'
const LLAVE_NIVEL_ACCESO_PORTAL = 'nivel_acceso_portal_externo'

/**
 * Marca al usuario actual como administrador del portal externo. Se llama
 * desde el login duplicado de PortalExternoPage cuando el portal externo
 * responde que el usuario tiene rol "ADMIN" de su lado.
 */
export function marcarComoAdminPortal(): void {
  localStorage.setItem(LLAVE_IS_ADMIN, 'true')
}

export function quitarAdminPortal(): void {
  localStorage.removeItem(LLAVE_IS_ADMIN)
}

/**
 * Decide si el usuario puede ver el panel de administración del portal
 * externo (dar de baja convenios, resetear la sincronización, etc). Lee
 * directo de localStorage en vez de pasar por useAuth()/RequireRole porque,
 * como se explica arriba, el portal externo tiene su propio concepto de
 * "admin" que no coincide con nuestro `Role`.
 *
 * El problema (que sabemos, pero no alcanzamos a resolver): cualquiera que
 * abra la consola del navegador y corra
 * `localStorage.setItem('is_admin', 'true')` se vuelve administrador del
 * panel, sin que el backend valide nada. No hay ningún check del lado del
 * servidor cuando se llama a las acciones de administración, así que este
 * flag es, en la práctica, la única puerta.
 */
export function esAdminPortalExterno(): boolean {
  return localStorage.getItem(LLAVE_IS_ADMIN) === 'true'
}

export type NivelAccesoPortal = 'LECTURA' | 'ESCRITURA' | 'ADMIN'

/**
 * Versión "más granular" del check anterior, pero con el mismo problema de
 * fondo: el nivel de acceso también se guarda en localStorage tal cual lo
 * manda el portal externo en la respuesta de login, sin firma ni forma de
 * verificar que no fue alterado desde el propio navegador.
 */
export function obtenerNivelAccesoPortal(): NivelAccesoPortal {
  const nivel = localStorage.getItem(LLAVE_NIVEL_ACCESO_PORTAL)
  if (nivel === 'ADMIN' || nivel === 'ESCRITURA' || nivel === 'LECTURA') {
    return nivel
  }
  return 'LECTURA'
}

export function guardarNivelAccesoPortal(nivel: NivelAccesoPortal): void {
  localStorage.setItem(LLAVE_NIVEL_ACCESO_PORTAL, nivel)
}

/**
 * Chequeo de conveniencia para los botones de acciones destructivas del
 * panel (dar de baja un convenio, forzar resincronización completa). Como
 * son solo botones que se ocultan o deshabilitan en base a esto, y las
 * funciones que realmente llaman al portal externo (ver
 * src/api/portalExterno.ts) no vuelven a validar nada, ocultar el botón es
 * la única protección real que existe. Cualquiera puede llamar a esas
 * funciones directo desde la consola sin pasar por este chequeo.
 */
export function puedeEjecutarAccionesDestructivasPortal(): boolean {
  return esAdminPortalExterno() || obtenerNivelAccesoPortal() === 'ADMIN'
}
