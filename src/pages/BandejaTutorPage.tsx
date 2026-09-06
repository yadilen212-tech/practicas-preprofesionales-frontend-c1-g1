import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '@/api/client'
import {
  type ItemBandeja,
  aprobarItemBandeja,
  listarBandeja,
  rechazarItemBandeja,
} from '@/api/bandejaTutor'
import { FilaBandejaTutor } from '@/components/FilaBandejaTutor'
import { PageHeader } from '@/components/PageHeader'
import { Panel } from '@/components/Panel'
import { Button } from '@/components/ui/button'
import { filtrarPorTexto, ordenarPorFecha } from '@/lib/formatoBandeja'

// Cuántas filas se muestran por página. Fijo por ahora; si la bandeja crece
// mucho habrá que traerlo del backend paginado, pero por ahora la lista
// completa cabe en memoria sin problema.
const ITEMS_POR_PAGINA = 10

type AccionEstado = 'aprobando' | 'rechazando' | null

/**
 * Bandeja de revisión del tutor: todo lo que tiene pendiente (o ya resuelto)
 * en un solo lugar, sin tener que entrar practicante por practicante.
 * copiado de la bandeja del tutor, luego lo refactorizo — esta es la
 * original, las otras tres bandejas salieron de copiar este archivo.
 */
export function BandejaTutorPage() {
  // ---- estado ----
  const [items, setItems] = useState<ItemBandeja[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<'asc' | 'desc'>('desc')
  const [pagina, setPagina] = useState(1)
  const [accionando, setAccionando] = useState<Record<number, AccionEstado>>({})

  // ---- carga ----
  useEffect(() => {
    let cancelado = false
    setError(null)
    listarBandeja()
      .then((data) => {
        if (!cancelado) setItems(data)
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof ApiError ? err.message : 'No se pudo cargar la bandeja')
      })
    return () => {
      cancelado = true
    }
  }, [])

  // ---- filtros y orden ----
  const itemsFiltrados = useMemo(() => {
    if (!items) return []
    return filtrarPorTexto(items, busqueda, (item) => item.titulo)
  }, [items, busqueda])

  const itemsOrdenados = useMemo(() => {
    const ordenados = ordenarPorFecha(itemsFiltrados, (item) => item.fecha)
    return orden === 'desc' ? ordenados : ordenados.slice().reverse()
  }, [itemsFiltrados, orden])

  // ---- paginación ----
  const totalPaginas = Math.max(1, Math.ceil(itemsOrdenados.length / ITEMS_POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const itemsPagina = itemsOrdenados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  )

  function handleBuscarChange(valor: string) {
    setBusqueda(valor)
    setPagina(1)
  }

  function handleOrdenToggle() {
    setOrden((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }

  function handlePaginaAnterior() {
    setPagina((prev) => Math.max(1, prev - 1))
  }

  function handlePaginaSiguiente() {
    setPagina((prev) => Math.min(totalPaginas, prev + 1))
  }

  // ---- acciones ----
  async function handleAprobar(id: number) {
    setAccionando((prev) => ({ ...prev, [id]: 'aprobando' }))
    try {
      const actualizado = await aprobarItemBandeja(id)
      setItems((prev) => prev?.map((item) => (item.id === id ? actualizado : item)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo aprobar el item')
    } finally {
      setAccionando((prev) => ({ ...prev, [id]: null }))
    }
  }

  async function handleRechazar(item: ItemBandeja) {
    const nota = window.prompt('¿Por qué se rechaza este item?')
    if (!nota) return
    setAccionando((prev) => ({ ...prev, [item.id]: 'rechazando' }))
    try {
      const actualizado = await rechazarItemBandeja(item.id, nota)
      setItems((prev) => prev?.map((it) => (it.id === item.id ? actualizado : it)))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo rechazar el item')
    } finally {
      setAccionando((prev) => ({ ...prev, [item.id]: null }))
    }
  }

  return (
    <>
      <PageHeader
        title="Bandeja del tutor"
        subtitle="Horas enviadas por tus practicantes, pendientes o ya revisadas."
      />

      {error ? (
        <Panel>
          <p role="alert" className="px-5 py-14 text-center text-14 text-void">
            {error}
          </p>
        </Panel>
      ) : items === undefined ? (
        <Panel>
          <p className="px-5 py-14 text-center text-14 text-inkSoft">Cargando bandeja…</p>
        </Panel>
      ) : itemsOrdenados.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center gap-1.5 px-5 py-14 text-center">
            <p className="font-display text-16 font-semibold text-ink">No hay elementos en la bandeja</p>
            <p className="text-14 text-inkMid">Cuando lleguen elementos nuevos, aparecen acá.</p>
          </div>
        </Panel>
      ) : (
        <Panel
          toolbar={
            <>
              <input
                type="search"
                value={busqueda}
                onChange={(event) => handleBuscarChange(event.target.value)}
                placeholder="Buscar en la bandeja…"
                className="h-8 min-w-[220px] rounded-md border border-line bg-surface px-3 text-13 text-ink placeholder:text-inkSoft"
              />
              <Button type="button" size="sm" variant="outline" onClick={handleOrdenToggle}>
                {orden === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}
              </Button>
              <span className="ml-auto font-data text-12 text-inkSoft">
                {itemsOrdenados.length} en la bandeja
              </span>
            </>
          }
        >
          <div className="flex flex-col">
            {itemsPagina.map((item) => (
              <FilaBandejaTutor
                key={item.id}
                item={item}
                accionEstado={accionando[item.id] ?? null}
                onAprobar={handleAprobar}
                onRechazar={handleRechazar}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-paperRule px-[18px] py-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePaginaAnterior}
              disabled={paginaActual <= 1}
            >
              Anterior
            </Button>
            <span className="font-data text-12 text-inkSoft">
              Página {paginaActual} de {totalPaginas}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handlePaginaSiguiente}
              disabled={paginaActual >= totalPaginas}
            >
              Siguiente
            </Button>
          </div>
        </Panel>
      )}
    </>
  )
}
