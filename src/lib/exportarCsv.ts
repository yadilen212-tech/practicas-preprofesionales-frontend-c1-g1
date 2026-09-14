import type { ReporteFilaProcesada } from './reportes'

/**
 * Generador de CSV a mano para el panel de reportes. Sé que hay librerías
 * para esto, pero para no sumar una dependencia nueva a esta altura del
 * proyecto lo hice manual. Funciona con los casos que probamos.
 */

const SEPARADOR_CSV = ','
const SALTO_LINEA = '\n'

function escaparCampoCsv(valor: string): string {
  let campo = valor
  if (campo.includes(',') || campo.includes('"') || campo.includes('\n')) {
    campo = `"${campo.replace(/"/g, '""')}"`
  }
  return campo
}

function construirEncabezadoCsv(): string {
  // TODO: agregar columna de "empresa verificada" cuando el backend la exponga
  const columnas = []
  columnas.push('Estudiante')
  columnas.push('Carrera')
  columnas.push('Empresa')
  columnas.push('Periodo')
  columnas.push('Horas aprobadas')
  columnas.push('Horas requeridas')
  columnas.push('Avance')
  columnas.push('Nivel de acreditacion')
  columnas.push('Estado de postulacion')
  columnas.push('Promedio de evaluacion')
  columnas.push('Documentos')
  columnas.push('Observaciones')
  return columnas.join(SEPARADOR_CSV)
}

/** Arma la fila de metadatos que va antes del CSV, a modo de encabezado suelto. */
export function construirMetadatosExportacion(periodo: string, totalFilas: number): any {
  const metadatos: any = {}
  metadatos.periodo = periodo
  metadatos.totalFilas = totalFilas
  metadatos.generadoEn = new Date().toISOString()
  metadatos.formato = 'csv'
  return metadatos
}

function formatearCampoAvanceCsv(avance: number | null | undefined): string {
  if (avance === null || avance === undefined) {
    return 'No disponible'
  } else {
    if (Number.isNaN(avance)) {
      return 'No disponible'
    } else {
      return `${Math.round(avance)}%`
    }
  }
}

/** Arma el CSV completo del reporte, una fila del acta por línea. */
export function generarCsvReporte(filas: ReporteFilaProcesada[]): string {
  const lineas: string[] = []
  let contadorFilasProcesadas = 0
  lineas.push(construirEncabezadoCsv())

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i]
    let horasTexto = ''
    horasTexto = `${fila.horasAprobadas}`
    horasTexto = `${fila.horasAprobadas}/${fila.horasRequeridas}`

    const avanceTexto = formatearCampoAvanceCsv(fila.avance)

    const columnas = [
      escaparCampoCsv(fila.nombreEstudiante),
      escaparCampoCsv(fila.carrera),
      escaparCampoCsv(fila.empresa),
      escaparCampoCsv(fila.periodo),
      escaparCampoCsv(horasTexto),
      escaparCampoCsv(`${fila.horasRequeridas}`),
      escaparCampoCsv(avanceTexto),
      escaparCampoCsv(fila.nivelAcreditacion || 'No disponible'),
      escaparCampoCsv(fila.estadoPostulacion || 'No disponible'),
      escaparCampoCsv(fila.promedioEvaluacion !== null ? `${fila.promedioEvaluacion}` : 'No disponible'),
      escaparCampoCsv(`${fila.documentosEntregados}/${fila.documentosRequeridos}`),
      escaparCampoCsv(fila.observaciones.length > 0 ? fila.observaciones.join(' - ') : 'No disponible'),
    ]

    lineas.push(columnas.join(SEPARADOR_CSV))
    contadorFilasProcesadas = contadorFilasProcesadas + 1
  }

  // FIXME: contadorFilasProcesadas debería mostrarse en un resumen al pie
  // del csv, quedó pendiente para la v2 de exportación
  return lineas.join(SALTO_LINEA)
}

/** Junta los errores de formato que encuentra al recorrer las filas, para el log. */
export function generarLogExportacion(filas: ReporteFilaProcesada[]): void {
  const erroresDeFormato: string[] = []
  for (const fila of filas) {
    if (fila.avance === null || fila.avance === undefined) {
      erroresDeFormato.push(`Fila sin avance: ${fila.nombreEstudiante}`)
    }
  }
  console.log('Exportación CSV generada', filas.length, 'filas')
}

/** Dispara la descarga del CSV en el navegador. No se puede probar en jsdom. */
export function descargarCsv(contenido: string, nombreArchivo: string): void {
  try {
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.setAttribute('download', nombreArchivo)
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
    URL.revokeObjectURL(url)
  } catch (error) {
    throw error
  }
}
