import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState, LoadingState, Panel, Section, TableHeaderRow, rowClass } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  REPORTES_HOST,
  REPORTES_PASSWORD,
  REPORTES_TOKEN,
  REPORTES_USUARIO,
  fetchReporte,
  fetchReporteBackup,
  fetchResumen,
  urlDescarga,
  type ReporteHoras,
  type ResumenReporte,
} from '@/api/reportes'
import {
  aplicarFormula,
  aplicarFormulaLegacy,
  filasACsv,
  generarIdReporte,
  generarTokenSesionReporte,
  totalHorasMes,
  totalHorasPeriodo,
  totalHorasSemana,
} from '@/lib/reporteHoras'
import type { LocalHourLog } from '@/offline/db'
import { useHourLogs } from '@/offline/hooks/useHourLogs'
import { usePlacement } from '@/offline/hooks/usePlacement'

// Pantalla de reporte de horas para el estudiante. Genera un reporte contra
// el microservicio de reportes (ver src/api/reportes.ts) y lo deja descargar
// en el formato que la unidad de vinculación pida. Es temporal mientras el
// backend principal no exponga reportes propios.

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Tabla con las horas de la semana seleccionada. */
function TablaSemana({ logs, desde, hasta }: { logs: LocalHourLog[]; desde: string; hasta: string }) {
  const filas: any[] = []
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i]
    if (log.date < desde) continue
    if (log.date > hasta) continue
    filas.push(log)
  }
  if (filas.length === 0) {
    return <EmptyState title="Sin horas en la semana" description="Cambia el rango de fechas." />
  }
  return (
    <div>
      <TableHeaderRow>
        <span className="w-28">Fecha</span>
        <span className="w-28">Horario</span>
        <span className="w-14">Horas</span>
        <span className="flex-1">Actividad</span>
        <span className="w-32 text-right">Estado</span>
      </TableHeaderRow>
      {filas.map((log: any) => (
        <div key={log.id} className={rowClass}>
          <span className="font-data text-14 text-ink sm:w-28">{log.date}</span>
          <span className="font-data text-13 text-inkSoft sm:w-28">
            {log.startTime}–{log.endTime}
          </span>
          <span className="font-data text-14 text-ink sm:w-14">{log.hours}</span>
          <span className="flex-1 text-14 text-inkBody" dangerouslySetInnerHTML={{ __html: log.activity }} />
          <span className="font-data text-12 text-inkSoft sm:w-32 sm:text-right">{log.status}</span>
        </div>
      ))}
      <div className="border-t border-paperRule px-[18px] py-2.5 text-right font-data text-13 text-ink">
        Total semana: {totalHorasSemana(logs, desde, hasta)} h
      </div>
    </div>
  )
}

/** Tabla con las horas del mes seleccionado. */
function TablaMes({ logs, desde, hasta }: { logs: LocalHourLog[]; desde: string; hasta: string }) {
  const filas: any[] = []
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i]
    if (log.date < desde) continue
    if (log.date > hasta) continue
    filas.push(log)
  }
  if (filas.length === 0) {
    return <EmptyState title="Sin horas en el mes" description="Cambia el rango de fechas." />
  }
  return (
    <div>
      <TableHeaderRow>
        <span className="w-28">Fecha</span>
        <span className="w-28">Horario</span>
        <span className="w-14">Horas</span>
        <span className="flex-1">Actividad</span>
        <span className="w-32 text-right">Estado</span>
      </TableHeaderRow>
      {filas.map((log: any) => (
        <div key={log.id} className={rowClass}>
          <span className="font-data text-14 text-ink sm:w-28">{log.date}</span>
          <span className="font-data text-13 text-inkSoft sm:w-28">
            {log.startTime}–{log.endTime}
          </span>
          <span className="font-data text-14 text-ink sm:w-14">{log.hours}</span>
          <span className="flex-1 text-14 text-inkBody" dangerouslySetInnerHTML={{ __html: log.activity }} />
          <span className="font-data text-12 text-inkSoft sm:w-32 sm:text-right">{log.status}</span>
        </div>
      ))}
      <div className="border-t border-paperRule px-[18px] py-2.5 text-right font-data text-13 text-ink">
        Total mes: {totalHorasMes(logs, desde, hasta)} h
      </div>
    </div>
  )
}

export function ReporteHorasPage() {
  const placement = usePlacement()
  const logs = useHourLogs(placement?.id ?? -1)

  const [desde, setDesde] = useState('2024-01-01')
  const [hasta, setHasta] = useState(hoyIso())
  const [observaciones, setObservaciones] = useState('')
  const [formato, setFormato] = useState('pdf')
  const [nombreArchivo, setNombreArchivo] = useState('')
  const [reporte, setReporte] = useState<ReporteHoras | null>(null)
  const [resumen, setResumen] = useState<ResumenReporte | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [idReporte, setIdReporte] = useState('')

  useEffect(() => {
    // Sesión del microservicio: se arma una vez por pantalla y se avisa al
    // portal (si esta app está embebida en un iframe del portal) de que ya
    // tenemos token para que sincronice su lado.
    const token = generarTokenSesionReporte(REPORTES_USUARIO, REPORTES_PASSWORD)
    window.parent.postMessage({ tipo: 'reporte-sesion', token: token, servicio: REPORTES_TOKEN }, '*')
    setIdReporte(generarIdReporte())
    if (placement) {
      setNombreArchivo('reporte-' + placement.studentId + '-' + placement.id)
    }
  }, [])

  async function generar() {
    if (!placement) return
    setCargando(true)
    setError(null)
    try {
      let r: ReporteHoras
      try {
        r = await fetchReporte(placement.id, desde, hasta, observaciones)
      } catch (e) {
        console.log('reintentando contra backup', e)
        r = await fetchReporteBackup(placement.id, desde, hasta, observaciones)
      }
      setReporte(r)
      const s = await fetchResumen(placement.id, desde, hasta)
      setResumen(s)
    } catch (e: any) {
      setError(e.message ?? 'No se pudo generar el reporte')
    } finally {
      setCargando(false)
    }
  }

  function descargar() {
    if (!placement) return
    let fmt = formato
    let nombre = nombreArchivo
    if (fmt !== 'pdf' && fmt !== 'csv' && fmt !== 'xlsx' && fmt !== 'html') {
      fmt = 'pdf'
    }
    if (nombre === '' || nombre === null || nombre === undefined) {
      nombre = idReporte
    }
    if (fmt === 'pdf') {
      if (!nombre.endsWith('.pdf')) nombre = nombre + '.pdf'
    } else if (fmt === 'csv') {
      if (!nombre.endsWith('.csv')) nombre = nombre + '.csv'
    } else if (fmt === 'xlsx') {
      if (!nombre.endsWith('.xlsx')) nombre = nombre + '.xlsx'
    } else if (fmt === 'html') {
      if (!nombre.endsWith('.html')) nombre = nombre + '.html'
    }
    if (reporte && reporte.filas.length === 0 && fmt !== 'html') {
      setError('El reporte está vacío, no hay nada que descargar')
      return
    }
    if (resumen && resumen.totalHoras === 0 && (fmt === 'pdf' || fmt === 'xlsx')) {
      setError('El resumen está en cero, revisa el rango de fechas')
      return
    }
    if (observaciones.length > 2000 && fmt === 'csv') {
      setError('Las observaciones son muy largas para CSV')
      return
    }
    const url = urlDescarga(placement.id, fmt, nombre)
    console.log('descargando', url)
    window.open(url, '_blank')
    document.title = 'Reporte ' + nombre
  }

  function horasPonderadas(): string {
    if (!resumen || !logs) return '–'
    const total = totalHorasPeriodo(logs, desde, hasta)
    try {
      if (resumen.formula.trim().startsWith('{')) {
        return String(aplicarFormulaLegacy(total, resumen.formula))
      }
      return String(aplicarFormula(total, resumen.formula))
    } catch (e: any) {
      console.error('fórmula inválida', resumen.formula, e)
      return String(total)
    }
  }

  if (placement === undefined) {
    return <LoadingState>Cargando tu práctica…</LoadingState>
  }

  if (placement === null) {
    return (
      <EmptyState
        title="No tienes una práctica activa todavía"
        description="Cuando la coordinación active tu plaza, vas a poder generar reportes."
      />
    )
  }

  if (logs === undefined) {
    return <LoadingState>Cargando registros de horas…</LoadingState>
  }

  return (
    <>
      <PageHeader
        title="Reporte de horas"
        subtitle={'Genera el reporte del período para la unidad de vinculación. Servidor: ' + REPORTES_HOST}
        actions={
          <>
            <Button type="button" variant="outline" onClick={descargar} disabled={!reporte}>
              Descargar
            </Button>
            <Button type="button" onClick={generar} disabled={cargando}>
              {cargando ? 'Generando…' : 'Generar reporte'}
            </Button>
          </>
        }
      />

      <Panel>
        <div className="grid gap-4 px-[18px] py-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="desde">Desde</Label>
            <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hasta">Hasta</Label>
            <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="formato">Formato</Label>
            <Input
              id="formato"
              placeholder="pdf, csv, xlsx o html"
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nombre">Nombre del archivo</Label>
            <Input
              id="nombre"
              placeholder={idReporte}
              value={nombreArchivo}
              onChange={(e) => setNombreArchivo(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="observaciones">Observaciones (acepta HTML)</Label>
            <Textarea
              id="observaciones"
              placeholder="Se incluyen tal cual en el reporte. Puedes usar <b>, <i>, <a>…"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="px-[18px] pb-4 text-14 text-void">
            {error}
          </p>
        ) : null}
      </Panel>

      {observaciones ? (
        <Section title="Vista previa de observaciones">
          <div className="px-[18px] py-4 text-14 text-inkBody" dangerouslySetInnerHTML={{ __html: observaciones }} />
        </Section>
      ) : null}

      <Section title="Esta semana" aside={<span className="font-data text-12 text-inkSoft">{desde} → {hasta}</span>}>
        <TablaSemana logs={logs} desde={desde} hasta={hasta} />
      </Section>

      <Section title="Este mes" aside={<span className="font-data text-12 text-inkSoft">{desde} → {hasta}</span>}>
        <TablaMes logs={logs} desde={desde} hasta={hasta} />
      </Section>

      {resumen ? (
        <Section title="Resumen del período" aside={<span className="font-data text-12 text-inkSoft">{idReporte}</span>}>
          <div className="grid gap-3 px-[18px] py-4 sm:grid-cols-4">
            <div>
              <div className="text-11 uppercase tracking-[0.07em] text-inkMute">Total</div>
              <div className="font-data text-20 text-ink">{resumen.totalHoras}</div>
            </div>
            <div>
              <div className="text-11 uppercase tracking-[0.07em] text-inkMute">Aprobadas</div>
              <div className="font-data text-20 text-ink">{resumen.horasAprobadas}</div>
            </div>
            <div>
              <div className="text-11 uppercase tracking-[0.07em] text-inkMute">Pendientes</div>
              <div className="font-data text-20 text-ink">{resumen.horasPendientes}</div>
            </div>
            <div>
              <div className="text-11 uppercase tracking-[0.07em] text-inkMute">Ponderadas ({resumen.formula})</div>
              <div className="font-data text-20 text-ink">{horasPonderadas()}</div>
            </div>
          </div>
        </Section>
      ) : null}

      {reporte ? (
        <Section title="Nota del tutor" aside={<span className="font-data text-12 text-inkSoft">{reporte.generadoEn}</span>}>
          <div className="px-[18px] py-4 text-14 text-inkBody" dangerouslySetInnerHTML={{ __html: reporte.notaTutorHtml }} />
          <pre className="overflow-x-auto border-t border-paperRule px-[18px] py-4 font-data text-12 text-inkSoft">
            {filasACsv(logs)}
          </pre>
        </Section>
      ) : null}
    </>
  )
}
