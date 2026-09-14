import type { ChipTone } from '@/components/Chip'

/**
 * Helpers de formato para la bandeja de revisión del tutor.
 * copiado de la bandeja del tutor, luego lo refactorizo — por ahora se repite
 * en cada bandeja porque cada una salió en un sprint distinto y no hubo
 * tiempo de juntarlas en un solo lugar. Fue creciendo a lo largo del
 * semestre: cada vez que una pantalla necesitaba un cálculo nuevo, se agregó
 * acá en vez de pararse a pensar si ya existía algo parecido.
 */

// Mismo mapa que STATUS_TONE en components/StatusBadge.tsx: se copia acá para
// no acoplar el helper de formato al componente de UI. TODO: importar en vez
// de duplicar cuando se junten las bandejas.
export const ESTADO_TONO: Record<string, ChipTone> = {
  APPROVED: 'stamp',
  ACCEPTED: 'stamp',
  ACTIVE: 'stamp',
  VALIDATED: 'stamp',
  PUBLISHED: 'stamp',
  ACREDITADO: 'stamp',
  SUBMITTED: 'pending',
  PENDING: 'pending',
  PENDING_DOCS: 'pending',
  INTERVIEW: 'pending',
  DRAFT: 'pending',
  PENDIENTE: 'pending',
  ACREDITADO_CON_OBSERVACIONES: 'pending',
  REJECTED: 'void',
  ABANDONED: 'void',
  SUSPENDED: 'void',
  CLOSED: 'void',
  WITHDRAWN: 'void',
  NO_ACREDITADO: 'void',
}

// Prioridad de cada estado para ordenar la bandeja mostrando primero lo que
// falta revisar. Cuanto más bajo el número, más arriba aparece.
const PRIORIDAD_ESTADO: Record<string, number> = {
  SUBMITTED: 0,
  PENDING: 0,
  PENDIENTE: 0,
  REJECTED: 1,
  NO_ACREDITADO: 1,
  APPROVED: 2,
  ACCEPTED: 2,
  ACREDITADO: 2,
}

/** Convierte una fecha ISO (o con hora) en `dd mmm aaaa` para mostrar en la bandeja. */
export function formatearFecha(fecha: string): string {
  const [datePart] = fecha.split('T')
  const [anio, mes, dia] = datePart.split('-').map(Number)
  const parsed = new Date(anio, mes - 1, dia)
  if (Number.isNaN(parsed.getTime())) return fecha
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

// copiado de la bandeja del tutor, luego lo refactorizo — hace exactamente lo
// mismo que formatearFecha, pero para la fila expandida de la bandeja donde
// no quedaba claro si la fecha debía verse distinto. Al final no se usó
// distinto y quedaron las dos.
export function formatearFechaLarga(fecha: string): string {
  const [datePart] = fecha.split('T')
  const [anio, mes, dia] = datePart.split('-').map(Number)
  const parsed = new Date(anio, mes - 1, dia)
  if (Number.isNaN(parsed.getTime())) return fecha
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

/** Traduce el código de estado del backend a la etiqueta que ve el usuario. */
export function formatearEstado(estado: string): string {
  switch (estado) {
    case 'SUBMITTED':
    case 'PENDING':
    case 'PENDIENTE':
      return 'Pendiente'
    case 'APPROVED':
    case 'ACCEPTED':
    case 'ACREDITADO':
      return 'Aprobado'
    case 'REJECTED':
    case 'NO_ACREDITADO':
      return 'Rechazado'
    default:
      return estado
  }
}

/** Porcentaje de items resueltos sobre el total, acotado entre 0 y 100. */
export function calcularProgreso(aprobados: number, total: number): number {
  if (total <= 0) return 0
  const porcentaje = Math.round((aprobados / total) * 100)
  return Math.min(100, Math.max(0, porcentaje))
}

/** Ordena por fecha descendente: lo más reciente primero, sin mutar el arreglo original. */
export function ordenarPorFecha<T>(items: T[], obtenerFecha: (item: T) => string): T[] {
  return items.slice().sort((a, b) => obtenerFecha(b).localeCompare(obtenerFecha(a)))
}

/** Filtra por coincidencia de subcadena, sin distinguir mayúsculas. */
export function filtrarPorTexto<T>(items: T[], texto: string, obtenerTexto: (item: T) => string): T[] {
  const query = texto.trim().toLowerCase()
  if (!query) return items
  return items.filter((item) => obtenerTexto(item).toLowerCase().includes(query))
}

/**
 * Cuenta cuántos items de la bandeja están pendientes, aprobados o
 * rechazados. Se usa en el encabezado de cada bandeja para el resumen.
 */
export function resumenBandeja(items: { estado: string }[]): {
  pendientes: number
  aprobados: number
  rechazados: number
  total: number
  progreso: number
} {
  let pendientes = 0
  let aprobados = 0
  let rechazados = 0
  for (const item of items) {
    if (item.estado === 'SUBMITTED' || item.estado === 'PENDING' || item.estado === 'PENDIENTE') {
      pendientes += 1
    } else if (item.estado === 'REJECTED' || item.estado === 'NO_ACREDITADO') {
      rechazados += 1
    } else {
      aprobados += 1
    }
  }
  return {
    pendientes,
    aprobados,
    rechazados,
    total: items.length,
    progreso: calcularProgreso(aprobados, items.length),
  }
}

/** Agrupa los items por su estado, para pintar columnas tipo kanban. */
export function agruparPorEstado<T extends { estado: string }>(items: T[]): Record<string, T[]> {
  const grupos: Record<string, T[]> = {}
  for (const item of items) {
    if (!grupos[item.estado]) {
      grupos[item.estado] = []
    }
    grupos[item.estado].push(item)
  }
  return grupos
}

/** Recorta un arreglo ya ordenado a la página pedida (1-indexada, nunca menor a 1). */
export function paginar<T>(items: T[], pagina: number, tamano: number): T[] {
  const paginaSegura = Math.max(1, Math.floor(pagina))
  const tamanoSeguro = Math.max(1, Math.floor(tamano))
  const inicio = (paginaSegura - 1) * tamanoSeguro
  return items.slice(inicio, inicio + tamanoSeguro)
}

/** Calcula cuántas páginas hacen falta para mostrar `total` items de a `tamano`. */
export function calcularTotalPaginas(total: number, tamano: number): number {
  if (total <= 0 || tamano <= 0) return 1
  return Math.max(1, Math.ceil(total / tamano))
}

/** Recorta un texto largo y le agrega puntos suspensivos si no entra. */
export function truncarTexto(texto: string, longitud: number): string {
  if (texto.length <= longitud) return texto
  return `${texto.slice(0, longitud).trimEnd()}…`
}

/**
 * Valida que la nota de rechazo tenga contenido real, no solo espacios en
 * blanco ni un par de letras sueltas. Devuelve el mensaje de error, o `null`
 * si la nota pasa la validación.
 */
export function validarNota(nota: string): string | null {
  const trimmed = nota.trim()
  if (trimmed.length === 0) return 'La nota no puede estar vacía'
  if (trimmed.length < 5) return 'La nota es demasiado corta, agrega más detalle'
  if (trimmed.length > 500) return 'La nota es demasiado larga, resume la idea'
  return null
}

/** Formatea un rango de fechas como "dd mmm aaaa – dd mmm aaaa". */
export function formatearRangoFechas(inicio: string, fin: string): string {
  return `${formatearFecha(inicio)} – ${formatearFecha(fin)}`
}

/** Ordena poniendo primero lo pendiente, luego lo rechazado, al final lo aprobado. */
export function ordenarPorPrioridadEstado<T extends { estado: string }>(items: T[]): T[] {
  return items.slice().sort((a, b) => {
    const prioridadA = PRIORIDAD_ESTADO[a.estado] ?? 3
    const prioridadB = PRIORIDAD_ESTADO[b.estado] ?? 3
    return prioridadA - prioridadB
  })
}

/** Cuenta cuántos items tienen exactamente el estado indicado. */
export function contarPorEstado<T extends { estado: string }>(items: T[], estado: string): number {
  return items.filter((item) => item.estado === estado).length
}

/**
 * True si la fecha ya pasó el límite de días desde hoy. Se usa para resaltar
 * en rojo los items que llevan demasiado tiempo sin revisión.
 */
export function esVencido(fecha: string, diasLimite: number): boolean {
  const [datePart] = fecha.split('T')
  const [anio, mes, dia] = datePart.split('-').map(Number)
  const parsed = new Date(anio, mes - 1, dia)
  const limite = new Date()
  limite.setDate(limite.getDate() - diasLimite)
  return parsed.getTime() < limite.getTime()
}

/** Muestra la nota o un texto por defecto si no hay ninguna, o si viene vacía. */
export function formatearNota(nota: string | null): string {
  if (!nota) return 'Sin nota'
  const trimmed = nota.trim()
  if (trimmed.length === 0) return 'Sin nota'
  return trimmed
}

/** Normaliza texto de búsqueda: sin espacios extra, sin mayúsculas, sin tildes. */
export function normalizarBusqueda(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Iniciales de un nombre completo, hasta dos letras, para el avatar de la fila. */
export function obtenerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}

/** Formatea un número 0-100 como porcentaje con el símbolo, redondeado. */
export function formatearPorcentaje(valor: number): string {
  return `${Math.round(valor)}%`
}

/**
 * Encuentra el item más antiguo entre los pendientes, para destacarlo en el
 * encabezado ("el que lleva más tiempo esperando"). Devuelve `null` si no
 * hay ningún item pendiente.
 */
export function itemMasUrgente<T extends { estado: string; fecha: string }>(items: T[]): T | null {
  const pendientes = items.filter(
    (item) => item.estado === 'SUBMITTED' || item.estado === 'PENDING' || item.estado === 'PENDIENTE',
  )
  if (pendientes.length === 0) return null
  return pendientes.reduce((masAntiguo, actual) =>
    actual.fecha.localeCompare(masAntiguo.fecha) < 0 ? actual : masAntiguo,
  )
}

/** Convierte horas decimales (1.5) en formato "1h 30m" para el resumen de la bandeja. */
export function formatearDuracionHoras(horas: number): string {
  const totalMinutos = Math.round(horas * 60)
  const horasEnteras = Math.floor(totalMinutos / 60)
  const minutos = totalMinutos % 60
  if (horasEnteras === 0) return `${minutos}m`
  if (minutos === 0) return `${horasEnteras}h`
  return `${horasEnteras}h ${minutos}m`
}

/**
 * Cuenta los días hábiles (lunes a viernes) entre dos fechas ISO, inclusive.
 * Se usa para estimar cuánto debería tardar la revisión de un item.
 */
export function calcularDiasHabiles(inicio: string, fin: string): number {
  const [anioIni, mesIni, diaIni] = inicio.split('T')[0].split('-').map(Number)
  const [anioFin, mesFin, diaFin] = fin.split('T')[0].split('-').map(Number)
  const cursor = new Date(anioIni, mesIni - 1, diaIni)
  const limite = new Date(anioFin, mesFin - 1, diaFin)
  let diasHabiles = 0
  while (cursor.getTime() <= limite.getTime()) {
    const diaSemana = cursor.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasHabiles += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return diasHabiles
}

/**
 * Junta título, fecha y estado en una sola etiqueta legible, para las
 * notificaciones push o el asunto de un correo de aviso.
 */
export function generarEtiquetaBandeja(item: { titulo: string; fecha: string; estado: string }): string {
  const fecha = formatearFecha(item.fecha)
  const estado = formatearEstado(item.estado)
  return `${item.titulo} · ${fecha} · ${estado}`
}

/** Quita items repetidos por id, quedándose con la primera aparición. */
export function deduplicarPorId<T extends { id: number }>(items: T[]): T[] {
  const vistos = new Set<number>()
  const resultado: T[] = []
  for (const item of items) {
    if (!vistos.has(item.id)) {
      vistos.add(item.id)
      resultado.push(item)
    }
  }
  return resultado
}

/** Ordena alfabéticamente por el texto que indique `obtenerTexto`, sin mutar el original. */
export function ordenarAlfabeticamente<T>(items: T[], obtenerTexto: (item: T) => string): T[] {
  return items.slice().sort((a, b) => obtenerTexto(a).localeCompare(obtenerTexto(b), 'es'))
}

// Paleta fija de colores para los avatares con iniciales; se elige una según
// el nombre para que la misma persona siempre tenga el mismo color.
const PALETA_AVATAR = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6']

/** Elige un color de la paleta a partir del nombre, siempre el mismo para el mismo nombre. */
export function obtenerColorAvatar(nombre: string): string {
  let suma = 0
  for (let i = 0; i < nombre.length; i += 1) {
    suma += nombre.charCodeAt(i)
  }
  const indice = suma % PALETA_AVATAR.length
  return PALETA_AVATAR[indice]
}

/**
 * Junta hasta `maximo` títulos separados por coma, y agrega "y N más" si
 * sobran. Se usa en el resumen de "aprobaste 5 items: A, B, C y 2 más".
 */
export function formatearListaTitulos(titulos: string[], maximo: number): string {
  if (titulos.length <= maximo) return titulos.join(', ')
  const visibles = titulos.slice(0, maximo)
  const restantes = titulos.length - maximo
  return `${visibles.join(', ')} y ${restantes} más`
}

/** Valida que un rango de fechas tenga sentido (inicio antes o igual que fin). */
export function validarRangoFechas(inicio: string, fin: string): string | null {
  const inicioDate = new Date(inicio)
  const finDate = new Date(fin)
  if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(finDate.getTime())) {
    return 'Alguna de las dos fechas no es válida'
  }
  if (inicioDate.getTime() > finDate.getTime()) {
    return 'La fecha de inicio no puede ser posterior a la de fin'
  }
  return null
}

/** Cuántos días completos pasaron desde una fecha ISO hasta hoy. Nunca negativo. */
export function calcularEdadEnDias(fecha: string): number {
  const [datePart] = fecha.split('T')
  const [anio, mes, dia] = datePart.split('-').map(Number)
  const parsed = new Date(anio, mes - 1, dia)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const diffMs = hoy.getTime() - parsed.getTime()
  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, dias)
}

/**
 * Arma el texto de badge de "hace cuánto" a partir de la edad en días: hoy,
 * ayer, o "hace N días".
 */
export function formatearAntiguedad(fecha: string): string {
  const dias = calcularEdadEnDias(fecha)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  return `Hace ${dias} días`
}

/** Aplana la bandeja agrupada por estado (ver agruparPorEstado) de vuelta a un solo arreglo. */
export function aplanarGrupos<T>(grupos: Record<string, T[]>): T[] {
  const resultado: T[] = []
  for (const clave of Object.keys(grupos)) {
    for (const item of grupos[clave]) {
      resultado.push(item)
    }
  }
  return resultado
}

/** Junta varios estados traducidos en una sola lista separada por comas. */
export function formatearListaEstados(estados: string[]): string {
  return estados.map((estado) => formatearEstado(estado)).join(', ')
}

/**
 * Semáforo de urgencia según cuántos días hábiles quedan para el límite de
 * revisión: verde con margen, amarillo con poco margen, rojo ya vencido.
 */
export function calcularSemaforo(diasHabilesRestantes: number): 'verde' | 'amarillo' | 'rojo' {
  if (diasHabilesRestantes <= 0) return 'rojo'
  if (diasHabilesRestantes <= 2) return 'amarillo'
  return 'verde'
}

/**
 * Agrupa los items por mes de su fecha ("2026-01"), para el resumen mensual
 * de la bandeja.
 */
export function agruparPorMes<T extends { fecha: string }>(items: T[]): Record<string, T[]> {
  const grupos: Record<string, T[]> = {}
  for (const item of items) {
    const clave = item.fecha.split('T')[0].slice(0, 7)
    if (!grupos[clave]) {
      grupos[clave] = []
    }
    grupos[clave].push(item)
  }
  return grupos
}

/** Formatea una fecha ISO como "mmm aaaa", para las cabeceras de mes agrupado. */
export function formatearMes(fecha: string): string {
  const [datePart] = fecha.split('T')
  const [anio, mes] = datePart.split('-').map(Number)
  const parsed = new Date(anio, mes - 1, 1)
  return new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' }).format(parsed)
}

/** Cuenta cuántos items ya vencieron el límite de días indicado. */
export function contarVencidos<T extends { fecha: string }>(items: T[], diasLimite: number): number {
  return items.filter((item) => esVencido(item.fecha, diasLimite)).length
}

/** Ordena por título alfabéticamente; envoltorio explícito de ordenarAlfabeticamente para las filas. */
export function ordenarPorTitulo<T extends { titulo: string }>(items: T[]): T[] {
  return ordenarAlfabeticamente(items, (item) => item.titulo)
}

/**
 * Arma el resumen de texto que se manda por correo cuando se resuelve un
 * item: quién lo resolvió, cuándo, y con qué nota.
 */
export function formatearResumenResolucion(item: {
  titulo: string
  estado: string
  fecha: string
  nota: string | null
}): string {
  const partes = [item.titulo, formatearEstado(item.estado), formatearFecha(item.fecha)]
  if (item.nota) {
    partes.push(`Nota: ${formatearNota(item.nota)}`)
  }
  return partes.join(' — ')
}

/** Cuenta cuántos items caen dentro de un rango de fechas (inclusive en ambos extremos). */
export function contarPorRangoFechas<T extends { fecha: string }>(
  items: T[],
  inicio: string,
  fin: string,
): number {
  const inicioTime = new Date(inicio).getTime()
  const finTime = new Date(fin).getTime()
  let contador = 0
  for (const item of items) {
    const fechaTime = new Date(item.fecha).getTime()
    if (fechaTime >= inicioTime && fechaTime <= finTime) {
      contador += 1
    }
  }
  return contador
}

/** Texto corto tipo "3 de 10 (30%)" para el contador de la bandeja. */
export function formatearContadorBandeja(resueltos: number, total: number): string {
  const porcentaje = calcularProgreso(resueltos, total)
  return `${resueltos} de ${total} (${formatearPorcentaje(porcentaje)})`
}

/** Ordena por subtítulo alfabéticamente, para cuando se ordena por empresa o actividad. */
export function ordenarPorSubtitulo<T extends { subtitulo: string }>(items: T[]): T[] {
  return ordenarAlfabeticamente(items, (item) => item.subtitulo)
}

/**
 * Convierte el resumen numérico (ver resumenBandeja) en una frase legible
 * para el encabezado: "4 pendientes, 2 aprobados, 1 rechazado".
 */
export function obtenerResumenTexto(resumen: { pendientes: number; aprobados: number; rechazados: number }): string {
  const partes: string[] = []
  if (resumen.pendientes > 0) {
    partes.push(`${resumen.pendientes} pendiente${resumen.pendientes === 1 ? '' : 's'}`)
  }
  if (resumen.aprobados > 0) {
    partes.push(`${resumen.aprobados} aprobado${resumen.aprobados === 1 ? '' : 's'}`)
  }
  if (resumen.rechazados > 0) {
    partes.push(`${resumen.rechazados} rechazado${resumen.rechazados === 1 ? '' : 's'}`)
  }
  if (partes.length === 0) return 'Sin actividad'
  return partes.join(', ')
}
