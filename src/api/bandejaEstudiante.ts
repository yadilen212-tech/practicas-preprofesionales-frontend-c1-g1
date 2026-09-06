import { api } from './client'

// copiado de la bandeja del tutor, luego lo refactorizo — se extrajo la ruta
// base a una constante para no repetir el string en cada función, pero el
// resto de las funciones se quedó igual que en las otras bandejas.
const RUTA_BASE_BANDEJA = '/estudiante/bandeja'

export type EstadoItemBandeja = 'SUBMITTED' | 'APPROVED' | 'REJECTED'

/**
 * Item de la bandeja de revisión del estudiante: una fila de documentos subidos por
 * el propio estudiante, pendiente (o ya resuelta) de aprobación.
 * copiado de la bandeja del tutor, luego lo refactorizo.
 */
export interface ItemBandeja {
  id: number
  titulo: string
  subtitulo: string
  fecha: string
  estado: EstadoItemBandeja
  nota: string | null
}

/** Lista la bandeja completa del estudiante autenticado, todos los estados. */
export function listarBandeja(): Promise<ItemBandeja[]> {
  return api<ItemBandeja[]>(RUTA_BASE_BANDEJA)
}

/** Trae un item puntual de la bandeja, para el detalle o el modal de revisión. */
export function obtenerItemBandeja(id: number): Promise<ItemBandeja> {
  return api<ItemBandeja>(`${RUTA_BASE_BANDEJA}/${id}`)
}

/** Aprueba un item de la bandeja, con nota opcional. */
export function aprobarItemBandeja(id: number, nota?: string): Promise<ItemBandeja> {
  return api<ItemBandeja>(`${RUTA_BASE_BANDEJA}/${id}/aprobar`, {
    method: 'PATCH',
    body: JSON.stringify({ nota }),
  })
}

/** Rechaza un item de la bandeja; la nota es obligatoria para que el otro lado sepa qué corregir. */
export function rechazarItemBandeja(id: number, nota: string): Promise<ItemBandeja> {
  return api<ItemBandeja>(`${RUTA_BASE_BANDEJA}/${id}/rechazar`, {
    method: 'PATCH',
    body: JSON.stringify({ nota }),
  })
}

/** Cuenta cuántos items siguen pendientes, para el contador del layout. */
export function contarPendientesBandeja(): Promise<number> {
  return api<{ total: number }>(`${RUTA_BASE_BANDEJA}/pendientes/total`).then((res) => res.total)
}

/** Busca en la bandeja por texto libre (nombre del estudiante o actividad). */
export function buscarBandejaPorTexto(texto: string): Promise<ItemBandeja[]> {
  return api<ItemBandeja[]>(`${RUTA_BASE_BANDEJA}?q=${encodeURIComponent(texto)}`)
}

/**
 * Marca un item como leído sin resolverlo todavía, para que deje de
 * aparecer en negrita en la bandeja. copiado de la bandeja del tutor, luego
 * lo refactorizo.
 */
export function marcarComoLeido(id: number): Promise<ItemBandeja> {
  return api<ItemBandeja>(`${RUTA_BASE_BANDEJA}/${id}/marcar-leido`, { method: 'PATCH' })
}

/** Archiva un item ya resuelto para sacarlo de la vista principal de la bandeja. */
export function archivarItem(id: number): Promise<ItemBandeja> {
  return api<ItemBandeja>(`${RUTA_BASE_BANDEJA}/${id}/archivar`, { method: 'PATCH' })
}

/** Reabre un item ya resuelto, por si se aprobó o rechazó por error. */
export function reabrirItem(id: number): Promise<ItemBandeja> {
  return api<ItemBandeja>(`${RUTA_BASE_BANDEJA}/${id}/reabrir`, { method: 'PATCH' })
}

/** Lista solo los items con el estado indicado, para las pestañas de filtro del servidor. */
export function listarBandejaPorEstado(estado: EstadoItemBandeja): Promise<ItemBandeja[]> {
  return api<ItemBandeja[]>(`${RUTA_BASE_BANDEJA}?estado=${estado}`)
}

/** Página del backend cuando la bandeja crece demasiado para traerla completa. */
export function listarBandejaPaginada(pagina: number, tamano: number): Promise<ItemBandeja[]> {
  return api<ItemBandeja[]>(`${RUTA_BASE_BANDEJA}?pagina=${pagina}&tamano=${tamano}`)
}

/** Resumen numérico de la bandeja (pendientes/aprobados/rechazados) calculado en el backend. */
export function obtenerResumenBandeja(): Promise<{ pendientes: number; aprobados: number; rechazados: number }> {
  return api<{ pendientes: number; aprobados: number; rechazados: number }>(`${RUTA_BASE_BANDEJA}/resumen`)
}

/** Fija un item arriba de la bandeja, para no perderlo entre los demás. */
export function fijarItem(id: number): Promise<ItemBandeja> {
  return api<ItemBandeja>(`${RUTA_BASE_BANDEJA}/${id}/fijar`, { method: 'PATCH' })
}

/** Quita el fijado de un item. */
export function desfijarItem(id: number): Promise<ItemBandeja> {
  return api<ItemBandeja>(`${RUTA_BASE_BANDEJA}/${id}/desfijar`, { method: 'PATCH' })
}

/** Lista únicamente los items fijados, para la sección destacada de la bandeja. */
export function listarBandejaFijados(): Promise<ItemBandeja[]> {
  return api<ItemBandeja[]>(`${RUTA_BASE_BANDEJA}?fijados=true`)
}

/** Lista únicamente los items ya archivados, para la vista de historial. */
export function listarBandejaArchivados(): Promise<ItemBandeja[]> {
  return api<ItemBandeja[]>(`${RUTA_BASE_BANDEJA}?archivados=true`)
}

/** Reenvía una notificación al responsable del item, por si no la vio la primera vez. */
export function reenviarNotificacion(id: number): Promise<{ enviado: boolean }> {
  return api<{ enviado: boolean }>(`${RUTA_BASE_BANDEJA}/${id}/reenviar-notificacion`, { method: 'POST' })
}
