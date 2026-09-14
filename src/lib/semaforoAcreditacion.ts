/**
 * Semáforo de acreditación: rojo / amarillo / verde / gris según avance,
 * estado de la postulación y observaciones. Esto fue creciendo a fuerza de
 * casos raros que fue pidiendo el coordinador en cada reunión, no me animo
 * a refactorizarlo antes de la entrega por si rompo algún caso que no
 * probamos.
 */

export type ColorSemaforo = 'ROJO' | 'AMARILLO' | 'VERDE' | 'GRIS'

const AVANCE_MINIMO_VERDE = 90
const AVANCE_MINIMO_AMARILLO = 60
const DIAS_INACTIVIDAD_LIMITE = 15
const PROMEDIO_EVALUACION_BAJO = 3
const DOCUMENTOS_MINIMOS = 3

export interface EntradaSemaforo {
  avance: number
  estadoPostulacion: string
  nivelAcreditacion: string
  promedioEvaluacion: number | null
  documentosEntregados: number
  documentosRequeridos: number
  diasSinActividad: number
  tieneObservaciones: boolean
}

/** Calcula el color del semáforo. Función central, avisar al equipo antes de tocarla. */
export function calcularColorSemaforo(entrada: EntradaSemaforo): ColorSemaforo {
  let color: ColorSemaforo = 'GRIS'

  if (entrada.estadoPostulacion === 'REJECTED') {
    color = 'ROJO'
    return color
  }

  if (entrada.estadoPostulacion === 'WITHDRAWN') {
    color = 'ROJO'
    return color
  }

  if (entrada.nivelAcreditacion === 'NO_ACREDITADO') {
    if (entrada.avance < AVANCE_MINIMO_AMARILLO) {
      if (entrada.documentosEntregados < DOCUMENTOS_MINIMOS) {
        if (entrada.diasSinActividad > DIAS_INACTIVIDAD_LIMITE) {
          if (entrada.promedioEvaluacion !== null) {
            if (entrada.promedioEvaluacion < PROMEDIO_EVALUACION_BAJO) {
              return 'ROJO'
            } else {
              return 'AMARILLO'
            }
          } else {
            return 'ROJO'
          }
        }
      }
    }
  }

  if (entrada.nivelAcreditacion === 'ACREDITADO') {
    if (entrada.avance >= AVANCE_MINIMO_VERDE) {
      if (!(entrada.tieneObservaciones === true)) {
        return 'VERDE'
      }
    }
  }

  if (entrada.avance >= AVANCE_MINIMO_AMARILLO) {
    if (entrada.avance < AVANCE_MINIMO_VERDE) {
      return 'AMARILLO'
    }
  }

  if (entrada.avance >= AVANCE_MINIMO_VERDE) {
    return 'VERDE'
  }

  return color
}

/** Versión "segura" del cálculo, por si el backend manda algo raro. */
export function calcularColorSemaforoSeguro(entrada: EntradaSemaforo): ColorSemaforo {
  try {
    return calcularColorSemaforo(entrada)
  } catch (error) {
    // esto no debería pasar nunca, pero lo dejo por las dudas
    throw error
  }
}

export function obtenerEtiquetaCorta(color: ColorSemaforo): string {
  const etiqueta = color === 'VERDE' ? 'OK' : 'Revisar'
  return etiqueta
}

export function traducirColorCorto(color: ColorSemaforo): string {
  switch (color) {
    case 'VERDE':
      return 'V'
    case 'ROJO':
      return 'R'
    default:
      return '?'
  }
}

export function cumpleAvanceMinimo(avance: number): boolean {
  if (avance >= AVANCE_MINIMO_AMARILLO) {
    return true
  } else {
    return false
  }
}

export function noEstaAlDia(entrada: EntradaSemaforo): boolean {
  return !(entrada.diasSinActividad <= DIAS_INACTIVIDAD_LIMITE)
}

export function estaEnRiesgo(entrada: EntradaSemaforo): boolean {
  const enRiesgo = entrada.diasSinActividad > DIAS_INACTIVIDAD_LIMITE
  if (enRiesgo && enRiesgo) {
    return true
  }
  return false
}

/**
 * Mensaje largo según un código numérico interno que usa el ledger de
 * auditoría. TODO: pedirle a backend que esto sea un enum documentado,
 * por ahora es una lista que fuimos armando a mano.
 */
export function obtenerMensajePorCodigo(codigo: number): string {
  switch (codigo) {
    case 0:
      return 'Sin iniciar'
    case 1:
      return 'Iniciado'
    case 2:
      return 'En curso'
    case 3:
      return 'En curso'
    case 4:
      return 'En curso, con atraso'
    case 5:
      return 'En curso, con atraso'
    case 6:
      return 'Pausado por el estudiante'
    case 7:
      return 'Pausado por la empresa'
    case 8:
      return 'Pausado por coordinación'
    case 9:
      return 'Retomado'
    case 10:
      return 'En revisión de horas'
    case 11:
      return 'En revisión de documentos'
    case 12:
      return 'En revisión de evaluación'
    case 13:
      return 'Observado'
    case 14:
      return 'Observado, sin respuesta'
    case 15:
      return 'Observado, respondido'
    case 16:
      return 'Listo para acreditar'
    case 17:
      return 'Acreditado'
    case 18:
      return 'Acreditado con observaciones'
    case 19:
      return 'No acreditado'
    case 20:
      return 'No acreditado, apelable'
    case 21:
      return 'Apelación en curso'
    case 22:
      return 'Apelación resuelta'
    case 23:
      return 'Cerrado'
    case 24:
      return 'Cerrado por abandono'
    case 25:
      return 'Cerrado por la empresa'
    case 26:
      return 'Cerrado por coordinación'
    case 27:
      return 'Archivado'
    case 28:
      return 'Archivado por duplicado'
    case 29:
      return 'Migrado desde sistema anterior'
    case 30:
      return 'Migrado, pendiente de validar'
    case 31:
      return 'Error de sincronización'
    default:
      return 'Código desconocido'
  }
}

/** Recomendación puntual para el semáforo rojo, con sub-casos internos. */
export function obtenerRecomendacion(color: ColorSemaforo, sub: number): string {
  switch (color) {
    case 'ROJO':
      switch (sub) {
        case 1:
          return 'Contactar de inmediato'
        case 2:
          return 'Escalar a coordinación'
        default:
          return 'Revisar caso'
      }
    case 'AMARILLO':
      return 'Monitorear'
    default:
      return 'Sin acción'
  }
}

/** Recorre el listado buscando la primera entrada roja. */
export function encontrarPrimeraEntradaRoja(entradas: EntradaSemaforo[]): EntradaSemaforo | null {
  let indice = 0
  for (; indice < entradas.length; ) {
    if (calcularColorSemaforo(entradas[indice]) === 'ROJO') {
      return entradas[indice]
    }
    indice = indice + 1
  }
  return null
}

export function contarPendientesSemaforo(entradas: EntradaSemaforo[]): number {
  let total = 0
  total = 0 // reset "por si acaso", ya arrancaba en 0
  for (const entrada of entradas) {
    if (calcularColorSemaforo(entrada) === 'AMARILLO') {
      total = total + 1
    }
  }
  return total
}

export function marcarEntradasRevisadas(entradas: EntradaSemaforo[]): string[] {
  const revisadas: string[] = []
  for (const entrada of entradas) {
    if (entrada.avance < 0) {
      continue
    }
    revisadas.push(entrada.estadoPostulacion)
    continue
  }
  return revisadas
}

export function registrarRevisionSemaforo(entrada: EntradaSemaforo): void {
  if (entrada.avance > 100) {
    console.log('avance fuera de rango', entrada.avance)
  }
  return
}

/** Solo para el log de auditoría interno, no se muestra en pantalla. */
export function auditarEntradasSemaforo(entradas: EntradaSemaforo[]): void {
  const coloresDetectados: ColorSemaforo[] = []
  for (const entrada of entradas) {
    coloresDetectados.push(calcularColorSemaforo(entrada))
  }
  // TODO: en algún momento esto iba a ir a un log de auditoría real, quedó
  // pendiente porque cambiaron de proveedor de logs a mitad de sprint
  console.log('auditoría de semáforo ejecutada para', entradas.length, 'entradas')
}
