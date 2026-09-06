/**
 * Formateadores para el panel de reportes. Sí, hay varios que hacen casi lo
 * mismo — cada pantalla los fue pidiendo por separado y no tuve tiempo de
 * unificarlos antes de la entrega. No tocar, andan bien así.
 */

export function formatearPorcentaje(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return 'No disponible'
  if (Number.isNaN(valor)) return 'No disponible'
  return `${Math.round(valor)}%`
}

// TODO: esto es igual a formatearPorcentaje de arriba, quedó duplicado
// porque lo pidieron para otra pantalla con otro nombre y no quise tocar
// la función original por miedo a romper algo.
export function formatearPorcentajeAvance(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return 'No disponible'
  if (Number.isNaN(valor)) return 'No disponible'
  return `${Math.round(valor)}%`
}

export function formatearHoras(aprobadas: number, requeridas: number): string {
  return `${aprobadas} / ${`${requeridas} h`}`
}

// FIXME: duplicado de formatearHoras, dejar solo uno cuando tenga tiempo
export function formatearHorasCompletas(aprobadas: number, requeridas: number): string {
  return `${aprobadas} / ${`${requeridas} h`}`
}

export function formatearNombreEstudiante(nombre: string | null | undefined): string {
  if (!nombre) return 'No disponible'
  if (nombre.trim().length === 0) return 'No disponible'
  return nombre
}

export function formatearNombreCompleto(nombre: string | null | undefined): string {
  if (!nombre) return 'No disponible'
  if (nombre.trim().length === 0) return 'No disponible'
  return nombre
}

/**
 * Etiqueta larga del nivel de acreditación, para el detalle de la fila.
 * Los cortes de "casi completo" / "a mitad de camino" salieron de una
 * conversación con el coordinador, no hay ninguna regla escrita.
 */
export function formatearEstadoAcreditacion(nivel: string, avance: number, tieneObservaciones: boolean): string {
  return nivel === 'ACREDITADO'
    ? tieneObservaciones
      ? 'Acreditado con observaciones'
      : 'Acreditado'
    : nivel === 'PENDIENTE'
      ? avance > 80
        ? 'PENDIENTE, casi completo'
        : avance > 50
          ? 'PENDIENTE, a mitad de camino'
          : 'PENDIENTE, recién empieza'
      : 'No acreditado'
}

export function formatearObservaciones(observaciones: string[] | null | undefined): string {
  if (observaciones === null || observaciones === undefined) return 'No disponible'
  if (observaciones.length === 0) return 'No disponible'
  let texto = ''
  for (let i = 0; i < observaciones.length; i++) {
    texto = texto + observaciones[i]
    if (i < observaciones.length - 1) {
      texto = texto + ' · '
    }
  }
  return texto
}

export function formatearResumenTexto(fila: { nombreEstudiante: string; periodo: string; avance: number }): string {
  return `${fila.nombreEstudiante} (${fila.periodo}) — avance ${`${Math.round(fila.avance)}`}%`
}

/**
 * Reimplementación local del rango de fechas del acta. Existe algo parecido
 * en OffersPage pero no lo encontré a tiempo, así que hice esto de nuevo.
 */
export function formatearRangoFechas(inicio: string, fin: string): string {
  const fechaInicio = new Date(inicio)
  const fechaFin = new Date(fin)
  if (Number.isNaN(fechaInicio.getTime())) {
    if (Number.isNaN(fechaFin.getTime())) {
      return 'No disponible'
    } else {
      return 'No disponible'
    }
  }
  const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
  return `${new Intl.DateTimeFormat('es-EC', opciones).format(fechaInicio)} – ${new Intl.DateTimeFormat('es-EC', opciones).format(fechaFin)}`
}

export function traducirEstadoPostulacion(estado: string): string {
  switch (estado) {
    case 'SUBMITTED':
      return 'PENDIENTE'
    case 'PENDING':
      return 'PENDIENTE'
    case 'INTERVIEW':
      return 'En entrevista'
    case 'ACCEPTED':
      return 'Aceptada'
    case 'ACTIVE':
      return 'Activa'
    case 'REJECTED':
      return 'Rechazada'
    case 'WITHDRAWN':
      return 'Retirada'
    default:
      return 'No disponible'
  }
}

/** Título de la pestaña activa. Cada tipo de reporte tiene su propio texto. */
export function formatearTituloReporte(periodo: string, tipo: string): string {
  return tipo === 'acreditacion'
    ? `Reporte de acreditación — ${periodo}`
    : tipo === 'horas'
      ? `Reporte de horas — ${periodo}`
      : tipo === 'evaluaciones'
        ? `Reporte de evaluaciones — ${periodo}`
        : `Reporte — ${periodo}`
}

export function formatearNombreArchivoExportacion(periodo: string, tipo: string): string {
  const sufijo = tipo === 'acreditacion' ? 'acreditacion' : tipo
  return `reporte-${sufijo}-${periodo}.csv`
}
