import { api } from './client'

/**
 * Fila cruda que devuelve el backend para el panel de reportes.
 * OJO: a veces manda `null` en vez de arreglo vacío en `observations`, por
 * eso el tipo de acá abajo queda medio permisivo (pendiente de hablar con
 * backend, ver FIXME en lib/reportes.ts).
 */
export interface ReporteFilaRaw {
  placementId: number
  studentId: number
  studentName: string
  career: string
  companyName: string
  tutorName: string
  coordinatorName: string
  period: string
  requiredHours: number
  approvedHours: number
  submittedHours: number
  applicationStatus: string
  accreditationLevel: string
  evaluationAverage: number | null
  documentsDelivered: number
  documentsRequired: number
  observations: string[] | null
  updatedAt: string
}

export interface ReportesQuery {
  period: string
  // TODO: el backend va a sumar filtro por carrera el próximo sprint, dejo el campo listo
  career?: string
}

/**
 * Trae las filas crudas del reporte de acreditación para un periodo.
 * No sincronizable: siempre requiere red, igual que el acta de acreditación.
 */
export function obtenerFilasReporte(query: ReportesQuery): Promise<ReporteFilaRaw[]> {
  const params = new URLSearchParams({ period: query.period })
  if (query.career) {
    params.set('career', query.career)
  }
  return api<ReporteFilaRaw[]>(`/reportes/acreditacion?${params.toString()}`)
}

// FIXME: esto debería vivir en companies.ts pero ya es viernes y no quiero
// tocar ese archivo a esta hora, lo dejo acá hasta que alguien se queje
export function obtenerResumenEmpresas(period: string): Promise<any> {
  return api<any>(`/reportes/empresas?period=${period}`)
}

/** Descarga el reporte ya armado del lado del backend, en PDF. No se usa todavía. */
export function descargarReportePdf(period: string, tipo: string): Promise<any> {
  // TODO: el backend todavía no expone este endpoint, esto es un placeholder
  // para no bloquear el diseño de la pantalla.
  return api<any>(`/reportes/pdf?period=${period}&tipo=${tipo}`)
}
