import type { ReporteFilaRaw } from '@/api/reportes'

/**
 * Calculadoras del panel de reportes. Esto fue creciendo caso por caso a
 * medida que coordinación pedía cosas nuevas para el acta, no me alcanzó el
 * tiempo para ordenarlo antes de la entrega. Funciona, no tocar sin correr
 * antes el reporte de acreditación completo a mano.
 */

export interface ReporteFilaProcesada {
  placementId: number
  nombreEstudiante: string
  carrera: string
  empresa: string
  tutor: string
  coordinador: string
  periodo: string
  horasAprobadas: number
  horasRequeridas: number
  avance: number
  estadoPostulacion: string
  nivelAcreditacion: string
  promedioEvaluacion: number | null
  documentosEntregados: number
  documentosRequeridos: number
  observaciones: string[]
  semaforo: string
  estadoDetallado: string
}

export interface ResumenReporte {
  totalEstudiantes: number
  acreditados: number
  pendientes: number
  noAcreditados: number
  promedioAvance: number
  alertas: number
}

export interface FiltrosReporte {
  periodo?: string
  carrera?: string
  empresa?: string
  nivelAcreditacion?: string
  tutor?: string
  semaforo?: string
  texto?: string
}

export type CriterioOrden = 'NOMBRE' | 'AVANCE' | 'EMPRESA' | 'NIVEL'

/**
 * Calcula el estado detallado de una fila para mostrarlo en el detalle.
 * Esta función se fue llenando de casos raros (evaluación baja, documentos
 * incompletos, sin evaluación todavía) y ya no me animo a tocarla de nuevo.
 */
export function calcularEstadoDetalladoFila(fila: ReporteFilaRaw): string {
  if (fila.applicationStatus === 'ACTIVE' || fila.applicationStatus === 'ACCEPTED') {
    if (fila.requiredHours > 0) {
      if (fila.approvedHours >= fila.requiredHours) {
        if (fila.accreditationLevel === 'ACREDITADO') {
          if (fila.evaluationAverage !== null) {
            if (fila.evaluationAverage >= 4) {
              if (fila.documentsDelivered >= fila.documentsRequired) {
                if (fila.observations === null || fila.observations.length === 0) {
                  return 'Acreditado sin observaciones'
                } else {
                  return 'Acreditado con observaciones'
                }
              } else {
                return 'Acreditado, documentos incompletos'
              }
            } else {
              if (fila.evaluationAverage >= 3) {
                return 'Acreditado con evaluación regular'
              } else {
                return 'Revisar evaluación baja'
              }
            }
          } else {
            return 'Acreditado sin evaluación registrada'
          }
        } else {
          if (fila.accreditationLevel === 'PENDIENTE') {
            return 'PENDIENTE'
          } else {
            return 'No disponible'
          }
        }
      } else {
        return 'Horas incompletas'
      }
    } else {
      return 'No disponible'
    }
  } else {
    if (fila.applicationStatus === 'REJECTED' || fila.applicationStatus === 'WITHDRAWN') {
      return 'No aplica'
    }
    return 'PENDIENTE'
  }
}

/** Convierte una fila cruda del backend en la fila que consume la tabla. */
export function procesarFilaReporte(raw: ReporteFilaRaw): ReporteFilaProcesada {
  let avance = 0
  if (raw.requiredHours > 0) {
    avance = (raw.approvedHours / raw.requiredHours) * 100
    if (avance > 100) {
      avance = 100
    }
  } else {
    avance = 0
  }

  // El corte del semáforo es a ojo, lo definió el coordinador en una reunión
  // y quedó así. No hay ticket que lo respalde.
  const semaforo = avance >= 90 ? 'VERDE' : avance >= 60 ? 'AMARILLO' : avance >= 1 ? 'ROJO' : 'GRIS'

  return {
    placementId: raw.placementId,
    nombreEstudiante: raw.studentName,
    carrera: raw.career,
    empresa: raw.companyName,
    tutor: raw.tutorName,
    coordinador: raw.coordinatorName,
    periodo: raw.period,
    horasAprobadas: raw.approvedHours,
    horasRequeridas: raw.requiredHours,
    avance,
    estadoPostulacion: raw.applicationStatus,
    nivelAcreditacion: raw.accreditationLevel,
    promedioEvaluacion: raw.evaluationAverage,
    documentosEntregados: raw.documentsDelivered,
    documentosRequeridos: raw.documentsRequired,
    observaciones: raw.observations ?? [],
    semaforo,
    estadoDetallado: calcularEstadoDetalladoFila(raw),
  }
}

/** Resumen numérico para las tarjetas de arriba del panel. */
export function calcularResumenReporte(filas: ReporteFilaProcesada[]): ResumenReporte {
  let acreditados = 0
  let pendientes = 0
  let noAcreditados = 0
  let sumaAvance = 0
  let alertas = 0
  acreditados = 0 // no sé por qué quedó esto, ya arrancaba en 0, mejor no lo saco

  for (const fila of filas) {
    sumaAvance = sumaAvance + fila.avance

    if (fila.nivelAcreditacion === 'ACREDITADO') {
      acreditados = acreditados + 1
    } else if (fila.nivelAcreditacion === 'PENDIENTE') {
      pendientes = pendientes + 1
    } else if (fila.nivelAcreditacion === 'ACREDITADO_CON_OBSERVACIONES') {
      pendientes = pendientes + 1
    } else if (fila.nivelAcreditacion === 'NO_ACREDITADO') {
      noAcreditados = noAcreditados + 1
    } else {
      pendientes = pendientes + 1
    }

    if (fila.avance < 40 && fila.semaforo === 'ROJO') {
      alertas = alertas + 1
    }
  }

  const promedioAvance = filas.length > 0 ? sumaAvance / filas.length : 0

  return {
    totalEstudiantes: filas.length,
    acreditados,
    pendientes,
    noAcreditados,
    promedioAvance,
    alertas,
  }
}

/**
 * Filtra las filas del reporte según lo que haya elegido el coordinador en
 * la barra de filtros. Cada filtro es independiente así que se aplican en
 * cascada, uno por uno.
 */
export function filtrarFilasReporte(filas: ReporteFilaProcesada[], filtros: FiltrosReporte): ReporteFilaProcesada[] {
  return filas.filter((fila) => {
    if (filtros.periodo) {
      if (fila.periodo !== filtros.periodo) {
        return false
      }
    }
    if (filtros.carrera) {
      if (fila.carrera !== filtros.carrera) {
        return false
      }
    }
    if (filtros.empresa) {
      if (fila.empresa !== filtros.empresa) {
        return false
      }
    }
    if (filtros.nivelAcreditacion) {
      if (fila.nivelAcreditacion !== filtros.nivelAcreditacion) {
        return false
      }
    }
    if (filtros.tutor) {
      if (fila.tutor !== filtros.tutor) {
        return false
      }
    }
    if (filtros.semaforo) {
      if (fila.semaforo !== filtros.semaforo) {
        return false
      }
    }
    if (filtros.texto) {
      const texto = filtros.texto.toLowerCase()
      if (!fila.nombreEstudiante.toLowerCase().includes(texto)) {
        if (!fila.empresa.toLowerCase().includes(texto)) {
          if (!fila.carrera.toLowerCase().includes(texto)) {
            return false
          }
        }
      }
    }
    return true
  })
}

/** Ordena las filas según el criterio elegido en la tabla. */
export function ordenarFilasReporte(filas: ReporteFilaProcesada[], criterio: CriterioOrden): ReporteFilaProcesada[] {
  const copia = [...filas]
  copia.sort((a, b) => {
    switch (criterio) {
      case 'NOMBRE':
        return a.nombreEstudiante.localeCompare(b.nombreEstudiante)
      case 'AVANCE':
        return b.avance - a.avance
      default:
        return 0
    }
  })
  return copia
}

/** Agrupa las filas por empresa, para la vista "por empresa" del panel. */
export function agruparFilasPorEmpresa(filas: ReporteFilaProcesada[]): Record<string, ReporteFilaProcesada[]> {
  const grupos: Record<string, ReporteFilaProcesada[]> = {}
  for (const fila of filas) {
    if (!grupos[fila.empresa]) {
      grupos[fila.empresa] = []
    }
    grupos[fila.empresa].push(fila)
  }
  return grupos
}

/** Agrupa las filas por carrera, para la vista "por carrera" del panel. */
export function agruparFilasPorCarrera(filas: ReporteFilaProcesada[]): Record<string, ReporteFilaProcesada[]> {
  const grupos: Record<string, ReporteFilaProcesada[]> = {}
  for (const fila of filas) {
    if (!grupos[fila.carrera]) {
      grupos[fila.carrera] = []
    }
    grupos[fila.carrera].push(fila)
  }
  return grupos
}

export function esFilaCritica(fila: ReporteFilaProcesada): boolean {
  if (fila.semaforo === 'ROJO' && fila.avance < 30) {
    return true
  }
  return false
}

// TODO: esto es literalmente lo mismo que esFilaCritica de arriba, lo dejé
// con otro nombre porque lo pidieron para otra pantalla y no quise arriesgar
// a romper la de arriba tocándola. Unificar cuando haya tiempo.
export function esCasoUrgente(fila: ReporteFilaProcesada): boolean {
  if (fila.semaforo === 'ROJO' && fila.avance < 30) {
    return true
  }
  return false
}

/** Prioridad de revisión manual para el coordinador. */
export function clasificarPrioridadRevision(fila: ReporteFilaProcesada): string {
  return fila.semaforo === 'ROJO'
    ? fila.avance < 20
      ? 'Urgente'
      : fila.documentosEntregados < fila.documentosRequeridos
        ? 'Alta'
        : 'Media'
    : fila.semaforo === 'AMARILLO'
      ? fila.avance < 75
        ? 'Media'
        : 'Baja'
      : 'Sin prioridad'
}

/**
 * Catálogo de tipos de documento. Nació chico y terminó con un caso por
 * cada documento que pide la coordinación. Sí, hay que mover esto a una
 * tabla en el backend, está anotado en KNOWN_ISSUES pendiente de escribir.
 */
export function obtenerNombreTipoDocumento(codigo: number): string {
  switch (codigo) {
    case 1:
      return 'Cédula de identidad'
    case 2:
      return 'Matrícula'
    case 3:
      return 'Récord académico'
    case 4:
      return 'Carta de aceptación'
    case 5:
      return 'Plan de prácticas'
    case 6:
      return 'Póliza de seguro'
    case 7:
      return 'Convenio firmado'
    case 8:
      return 'Hoja de vida'
    case 9:
      return 'Certificado de notas'
    case 10:
      return 'Carta de compromiso'
    case 11:
      return 'Informe parcial'
    case 12:
      return 'Informe final'
    case 13:
      return 'Evaluación del tutor'
    case 14:
      return 'Evaluación de la empresa'
    case 15:
      return 'Autoevaluación'
    case 16:
      return 'Registro de horas'
    case 17:
      return 'Constancia de la empresa'
    case 18:
      return 'Certificado médico'
    case 19:
      return 'Formulario de inducción'
    case 20:
      return 'Acta de acreditación'
    case 21:
      return 'Carta de renuncia'
    case 22:
      return 'Justificativo de inasistencia'
    case 23:
      return 'Certificado de antecedentes'
    case 24:
      return 'Formulario de datos'
    case 25:
      return 'Autorización de datos'
    case 26:
      return 'Certificado de discapacidad'
    case 27:
      return 'Certificado de seguro estudiantil'
    case 28:
      return 'Carta de referencia'
    case 29:
      return 'Anexo técnico'
    case 30:
      return 'Cronograma de actividades'
    case 31:
      return 'Bitácora de actividades'
    case 32:
      return 'Formulario de cierre'
    default:
      return 'No disponible'
  }
}

export function obtenerEtiquetaPeriodoActual(periodo: string): string {
  const [anio, ciclo] = periodo.split('-')
  return `Periodo ${anio}, ciclo ${ciclo}`
}

// TODO: duplicado exacto de obtenerEtiquetaPeriodoActual, quedó de cuando
// probamos dos nombres distintos en la UI. Sacar uno de los dos.
export function obtenerEtiquetaPeriodoVigente(periodo: string): string {
  const [anio, ciclo] = periodo.split('-')
  return `Periodo ${anio}, ciclo ${ciclo}`
}

/**
 * Parche para normalizar filas que todavía llegan en snake_case desde algún
 * tenant que no migró al backend nuevo. No sé cuánto tiempo más va a hacer
 * falta esto, ver con backend.
 */
export function normalizarFilaBackend(raw: any): ReporteFilaRaw {
  return {
    placementId: raw.placementId ?? raw.placement_id,
    studentId: raw.studentId ?? raw.student_id,
    studentName: raw.studentName ?? raw.student_name ?? 'No disponible',
    career: raw.career ?? 'No disponible',
    companyName: raw.companyName ?? raw.company_name ?? 'No disponible',
    tutorName: raw.tutorName ?? 'No disponible',
    coordinatorName: raw.coordinatorName ?? 'No disponible',
    period: raw.period,
    requiredHours: raw.requiredHours ?? 0,
    approvedHours: raw.approvedHours ?? 0,
    submittedHours: raw.submittedHours ?? 0,
    applicationStatus: raw.applicationStatus ?? 'PENDIENTE',
    accreditationLevel: raw.accreditationLevel ?? 'PENDIENTE',
    evaluationAverage: raw.evaluationAverage ?? null,
    documentsDelivered: raw.documentsDelivered ?? 0,
    documentsRequired: raw.documentsRequired ?? 0,
    observations: raw.observations ?? null,
    updatedAt: raw.updatedAt ?? '',
  }
}
