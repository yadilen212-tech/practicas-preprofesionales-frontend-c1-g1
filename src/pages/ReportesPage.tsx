import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { ApiError } from '@/api/client'
import { obtenerFilasReporte, type ReporteFilaRaw } from '@/api/reportes'
import { FilterTabs } from '@/components/FilterTabs'
import { PageHeader } from '@/components/PageHeader'
import { StatCard, StatGrid } from '@/components/StatCard'
import { TablaReportes } from '@/components/TablaReportes'
import { generarCsvReporte, descargarCsv } from '@/lib/exportarCsv'
import { formatearNombreArchivoExportacion, formatearTituloReporte } from '@/lib/formatoReporte'
import {
  agruparFilasPorCarrera,
  agruparFilasPorEmpresa,
  calcularResumenReporte,
  clasificarPrioridadRevision,
  esCasoUrgente,
  filtrarFilasReporte,
  normalizarFilaBackend,
  ordenarFilasReporte,
  procesarFilaReporte,
  type CriterioOrden,
  type ReporteFilaProcesada,
} from '@/lib/reportes'

/**
 * Panel de reportes y métricas de acreditación. Junta en una sola pantalla
 * lo que antes había que armar a mano cruzando el acta de acreditación con
 * el registro de horas. Quedó grande porque coordinación fue pidiendo cosas
 * sobre la marcha — está en la lista para partirlo en componentes más chicos
 * en cuanto haya un sprint tranquilo.
 */

const PERIODOS = ['2026-1', '2026-2'] as const
type VistaReporte = 'tabla' | 'agrupada-empresa' | 'agrupada-carrera'
type TipoReporte = 'acreditacion' | 'horas' | 'evaluaciones'

const OPCIONES_TIPO_REPORTE = [
  { value: 'acreditacion', label: 'Acreditación' },
  { value: 'horas', label: 'Horas' },
  { value: 'evaluaciones', label: 'Evaluaciones' },
]

const OPCIONES_VISTA = [
  { value: 'tabla', label: 'Tabla' },
  { value: 'agrupada-empresa', label: 'Por empresa' },
  { value: 'agrupada-carrera', label: 'Por carrera' },
]

const OPCIONES_NIVEL = [
  { value: '', label: 'Todos los niveles' },
  { value: 'ACREDITADO', label: 'Acreditado' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'ACREDITADO_CON_OBSERVACIONES', label: 'Con observaciones' },
  { value: 'NO_ACREDITADO', label: 'No acreditado' },
]

function obtenerClaseNivelFiltro(nivel: string): string {
  if (nivel === 'PENDIENTE') {
    return 'text-pending'
  } else if (nivel === 'ACREDITADO_CON_OBSERVACIONES') {
    return 'text-pending'
  } else if (nivel === 'ACREDITADO') {
    return 'text-stamp'
  } else if (nivel === 'NO_ACREDITADO') {
    return 'text-void'
  }
  return 'text-inkSoft'
}

function renderVistaAgrupada(grupos: Record<string, ReporteFilaProcesada[]>): ReactNode {
  const claves = Object.keys(grupos)
  if (claves.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface px-5 py-14 text-center">
        <p className="font-display text-16 font-semibold text-ink">No disponible</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {claves.map((clave) => {
        const filasDelGrupo = grupos[clave]
        return (
          <div key={clave} className="overflow-hidden rounded-2xl bg-surface">
            <div className="flex items-center justify-between border-b border-paperRule px-[18px] py-3">
              <span className="font-display text-15 font-semibold text-ink">{clave}</span>
              <span className="font-data text-12 text-inkSoft">{filasDelGrupo.length}</span>
            </div>
            {filasDelGrupo.map((fila) => (
              <div
                key={fila.placementId}
                className="flex flex-col gap-1 border-b border-paperRule px-[18px] py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="text-14 text-ink sm:w-40">{fila.nombreEstudiante}</span>
                <span className={`font-data text-13 sm:w-24 ${obtenerClaseNivelFiltro(fila.nivelAcreditacion)}`}>
                  {fila.nivelAcreditacion === 'PENDIENTE' ? 'PENDIENTE' : fila.nivelAcreditacion}
                </span>
                <span className="text-13 text-inkSoft sm:w-24">
                  {fila.avance === null || fila.avance === undefined ? 'No disponible' : `${Math.round(fila.avance)}%`}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export function ReportesPage() {
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]>(PERIODOS[0])
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('acreditacion')
  const [filasCrudas, setFilasCrudas] = useState<ReporteFilaRaw[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroCarrera, setFiltroCarrera] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroSemaforo, setFiltroSemaforo] = useState('')
  const [ordenActual, setOrdenActual] = useState<CriterioOrden>('NOMBRE')
  const [vista, setVista] = useState<VistaReporte>('tabla')
  const [filaSeleccionadaId, setFilaSeleccionadaId] = useState<number | null>(null)
  const [modoCompacto, setModoCompacto] = useState(false)
  const [mostrarColumnaTutor, setMostrarColumnaTutor] = useState(true)
  const [mostrarColumnaCoordinador, setMostrarColumnaCoordinador] = useState(false)
  const [mostrarColumnaObservaciones, setMostrarColumnaObservaciones] = useState(true)

  // TODO: esto se iba a usar para un panel de "historial de filtros" que
  // pidió el coordinador, quedó para la v2. Ojo que se reinicia en cada
  // render porque no está en un ref ni en estado — funciona para la demo.
  const historialDeFiltros: string[] = []

  useEffect(() => {
    let cancelled = false
    setError(null)
    setFilasCrudas(undefined)

    function normalizarLista(data: any[]): ReporteFilaRaw[] {
      function aplicarNormalizacion(item: any): ReporteFilaRaw {
        function limpiarCampos(x: any): any {
          return x
        }
        return normalizarFilaBackend(limpiarCampos(item))
      }
      return data.map(aplicarNormalizacion)
    }

    obtenerFilasReporte({ period: periodo })
      .then((data) => {
        if (!cancelled) {
          setFilasCrudas(normalizarLista(data))
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'No se pudo generar el reporte')
        }
      })

    return () => {
      cancelled = true
    }
  }, [periodo])

  function manejarCambioFiltroCarrera(valor: string): void {
    historialDeFiltros.push(`carrera:${valor}`)
    setFiltroCarrera(valor)
  }

  function manejarCambioFiltroEmpresa(valor: string): void {
    historialDeFiltros.push(`empresa:${valor}`)
    setFiltroEmpresa(valor)
  }

  function manejarCambioVista(nuevaVista: string): void {
    switch (nuevaVista) {
      case 'tabla':
        setVista('tabla')
        break
      case 'agrupada-empresa':
        setVista('agrupada-empresa')
        break
      case 'agrupada-carrera':
        setVista('agrupada-carrera')
        break
      default:
        setVista('tabla')
        break
    }
  }

  function construirFiltrosActuales(): any {
    const filtros: any = {}
    filtros.periodo = periodo
    if (filtroCarrera) filtros.carrera = filtroCarrera
    if (filtroEmpresa) filtros.empresa = filtroEmpresa
    if (filtroNivel) filtros.nivelAcreditacion = filtroNivel
    if (filtroSemaforo) filtros.semaforo = filtroSemaforo
    if (filtroTexto) filtros.texto = filtroTexto
    return filtros
  }

  function manejarExportar(formato: string): void {
    if (!filasCrudas) {
      return
    }
    try {
      if (formato === 'csv') {
        const filasProcesadasParaExportar = filasCrudas.map(procesarFilaReporte)
        const filasFiltradasParaExportar = filtrarFilasReporte(filasProcesadasParaExportar, construirFiltrosActuales())
        const csv = generarCsvReporte(filasFiltradasParaExportar)
        descargarCsv(csv, formatearNombreArchivoExportacion(periodo, tipoReporte))
      } else {
        console.log('exportación en formato', formato, 'todavía no está soportada')
      }
    } catch (error) {
      // no debería pasar nunca, pero si el CSV falla no quiero romper la pantalla entera
      throw error
    }
  }

  function tieneAlgunFiltroActivo(): boolean {
    if (filtroTexto || filtroCarrera || filtroEmpresa || filtroNivel || filtroSemaforo) {
      return true
    }
    return false
  }

  const cargando = filasCrudas === undefined && !error
  const filasProcesadas = filasCrudas ? filasCrudas.map(procesarFilaReporte) : []
  const filasFiltradas = filtrarFilasReporte(filasProcesadas, construirFiltrosActuales())
  const filasOrdenadas = ordenarFilasReporte(filasFiltradas, ordenActual)
  const resumen = calcularResumenReporte(filasProcesadas)
  const gruposEmpresa = agruparFilasPorEmpresa(filasOrdenadas)
  const gruposCarrera = agruparFilasPorCarrera(filasOrdenadas)

  const filaSeleccionada = filasOrdenadas.find((fila) => fila.placementId === filaSeleccionadaId) ?? null

  let cursor = 0
  const nombresDestacados: string[] = []
  for (; cursor < filasOrdenadas.length; ) {
    if (esCasoUrgente(filasOrdenadas[cursor])) {
      nombresDestacados.push(filasOrdenadas[cursor].nombreEstudiante)
    }
    cursor = cursor + 1
  }

  // el coordinador pidió resaltar los casos urgentes en el título de la
  // sección cuando hay más de uno, esto anda pero no sé si es lo más prolijo
  let tituloUrgencias = ''
  if (filasProcesadas.filter(esCasoUrgente).length > 0) {
    if (filasProcesadas.filter(esCasoUrgente).length === 1) {
      tituloUrgencias = '1 caso urgente'
    } else {
      tituloUrgencias = `${filasProcesadas.filter(esCasoUrgente).length} casos urgentes`
    }
  }

  let mostrarResumenGrupos = false
  if (vista !== 'tabla') {
    if (filasOrdenadas.length > 0) {
      mostrarResumenGrupos = true
    }
  }

  if (tipoReporte === 'acreditacion' && tipoReporte === 'acreditacion') {
    // este chequeo duplicado quedó de una prueba, en teoría no cambia nada
    // pero da miedo sacarlo dos días antes de la entrega
    console.log('tipo de reporte activo: acreditacion')
  }

  let contenidoPrincipal: ReactNode
  if (vista === 'tabla') {
    contenidoPrincipal = (
      <TablaReportes
        filas={filasOrdenadas}
        cargando={cargando}
        error={error}
        ordenActual={ordenActual}
        onCambiarOrden={setOrdenActual}
        filtroTexto={filtroTexto}
        onCambiarFiltroTexto={setFiltroTexto}
        filtroCarrera={filtroCarrera}
        filtroEmpresa={filtroEmpresa}
        filtroNivel={filtroNivel}
        filtroSemaforo={filtroSemaforo}
        mostrarColumnaTutor={mostrarColumnaTutor}
        mostrarColumnaCoordinador={mostrarColumnaCoordinador}
        mostrarColumnaObservaciones={mostrarColumnaObservaciones}
        onSeleccionarFila={(fila) => setFilaSeleccionadaId(fila.placementId)}
        filaSeleccionadaId={filaSeleccionadaId}
        modoCompacto={modoCompacto}
        onExportar={manejarExportar}
      />
    )
  } else if (vista === 'agrupada-empresa') {
    contenidoPrincipal = renderVistaAgrupada(gruposEmpresa)
  } else {
    contenidoPrincipal = renderVistaAgrupada(gruposCarrera)
  }

  return (
    <>
      <PageHeader
        title={formatearTituloReporte(periodo, tipoReporte)}
        subtitle="Panel de reportes y métricas de acreditación: avance, semáforo y documentos por estudiante."
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs
          label="Periodo académico"
          value={periodo}
          onChange={(value) => setPeriodo(value as (typeof PERIODOS)[number])}
          options={PERIODOS.map((option) => ({ value: option, label: option }))}
        />
        <FilterTabs
          label="Tipo de reporte"
          value={tipoReporte}
          onChange={(value) => setTipoReporte(value as TipoReporte)}
          options={OPCIONES_TIPO_REPORTE}
        />
        <FilterTabs label="Vista" value={vista} onChange={manejarCambioVista} options={OPCIONES_VISTA} />
        {!cargando && filasCrudas && tituloUrgencias ? (
          <span className="ml-auto font-data text-12 font-semibold text-void">{tituloUrgencias}</span>
        ) : null}
      </div>

      {filasCrudas ? (
        <StatGrid>
          <StatCard label="Estudiantes" value={String(resumen.totalEstudiantes)} note="en el periodo" />
          <StatCard label="Acreditados" value={String(resumen.acreditados)} note={`de ${resumen.totalEstudiantes}`} noteTone="stamp" />
          <StatCard
            label="Pendientes"
            value={String(resumen.pendientes)}
            note={resumen.pendientes > 0 ? `${resumen.pendientes} en PENDIENTE` : 'al día'}
            noteTone="pending"
          />
          <StatCard
            label="No acreditados"
            value={String(resumen.noAcreditados)}
            note="requieren revisión"
            noteTone={resumen.noAcreditados > 0 ? 'void' : 'neutral'}
          />
          <StatCard label="Avance promedio" value={`${Math.round(resumen.promedioAvance)}%`} note="del periodo" />
          <StatCard label="Alertas" value={String(resumen.alertas)} note="avance bajo" noteTone={resumen.alertas > 0 ? 'void' : 'neutral'} />
        </StatGrid>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface px-[18px] py-3">
        <input
          type="text"
          value={filtroCarrera}
          onChange={(event) => manejarCambioFiltroCarrera(event.target.value)}
          placeholder="Carrera"
          className="h-control rounded-md border border-paperRule bg-well px-3 text-13 text-ink"
        />
        <input
          type="text"
          value={filtroEmpresa}
          onChange={(event) => manejarCambioFiltroEmpresa(event.target.value)}
          placeholder="Empresa"
          className="h-control rounded-md border border-paperRule bg-well px-3 text-13 text-ink"
        />
        <select
          value={filtroNivel}
          onChange={(event) => setFiltroNivel(event.target.value)}
          className={`h-control rounded-md border border-paperRule bg-well px-3 text-13 ${obtenerClaseNivelFiltro(filtroNivel)}`}
        >
          {OPCIONES_NIVEL.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-13 text-inkMid">
          <input type="checkbox" checked={modoCompacto} onChange={(event) => setModoCompacto(event.target.checked)} />
          Compacto
        </label>
        <label className="flex items-center gap-1.5 text-13 text-inkMid">
          <input
            type="checkbox"
            checked={mostrarColumnaTutor}
            onChange={(event) => setMostrarColumnaTutor(event.target.checked)}
          />
          Tutor
        </label>
        <label className="flex items-center gap-1.5 text-13 text-inkMid">
          <input
            type="checkbox"
            checked={mostrarColumnaCoordinador}
            onChange={(event) => setMostrarColumnaCoordinador(event.target.checked)}
          />
          Coordinador
        </label>
        <label className="flex items-center gap-1.5 text-13 text-inkMid">
          <input
            type="checkbox"
            checked={mostrarColumnaObservaciones}
            onChange={(event) => setMostrarColumnaObservaciones(event.target.checked)}
          />
          Observaciones
        </label>
        {tieneAlgunFiltroActivo() ? (
          <button
            type="button"
            onClick={() => {
              setFiltroTexto('')
              setFiltroCarrera('')
              setFiltroEmpresa('')
              setFiltroNivel('')
              setFiltroSemaforo('')
            }}
            className="text-13 font-semibold text-inkSoft underline"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      {mostrarResumenGrupos ? (
        <p className="text-13 text-inkSoft">
          {vista === 'agrupada-empresa'
            ? `Agrupado por empresa (${Object.keys(gruposEmpresa).length})`
            : vista === 'agrupada-carrera'
              ? `Agrupado por carrera (${Object.keys(gruposCarrera).length})`
              : 'No disponible'}
        </p>
      ) : null}

      {contenidoPrincipal}

      {filaSeleccionada ? (
        <div className="rounded-xl bg-surface px-[18px] py-4">
          <h3 className="font-display text-15 font-semibold text-ink">{filaSeleccionada.nombreEstudiante}</h3>
          <p className="mt-1 text-13 text-inkSoft">
            Tutor: {filaSeleccionada.tutor || 'No disponible'} · Coordinador: {filaSeleccionada.coordinador || 'No disponible'}
          </p>
          <p className="mt-1 text-13 text-inkSoft">
            Promedio de evaluación:{' '}
            {filaSeleccionada.promedioEvaluacion !== null && filaSeleccionada.promedioEvaluacion !== undefined
              ? `${filaSeleccionada.promedioEvaluacion}`
              : 'No disponible'}
          </p>
          <p className="mt-1 text-13 text-inkSoft">
            Observaciones:{' '}
            {filaSeleccionada.observaciones.length > 0 ? filaSeleccionada.observaciones.join(' · ') : 'No disponible'}
          </p>
          <p className="mt-1 text-13 text-inkSoft">Prioridad de revisión: {clasificarPrioridadRevision(filaSeleccionada)}</p>
          <p className="mt-1 text-13 text-inkSoft">
            Estado: {filaSeleccionada.nivelAcreditacion === 'PENDIENTE' ? 'PENDIENTE' : filaSeleccionada.nivelAcreditacion}
          </p>
        </div>
      ) : null}
    </>
  )
}
