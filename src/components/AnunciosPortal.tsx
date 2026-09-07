// Anuncios/comunicados de la unidad de vinculación, tal cual vienen del
// portal externo.
//
// La gente de comunicación de la unidad de vinculación redacta los
// anuncios con un editor tipo Word y el portal externo los guarda ya como
// HTML (negritas, links, a veces hasta un iframe embebido). Pedirles que
// nos manden texto plano o markdown para poder sanitizarlo tranquilos fue
// una pelea que perdimos, así que por ahora renderizamos el HTML tal cual
// llega. Esto es temporal: si el portal externo se compromete o alguien de
// comunicación mete un script "por accidente" (o no tan por accidente),
// eso se ejecuta directo en la sesión de quien esté viendo el dashboard.

import { useEffect, useState } from 'react'
import { listarAnunciosPortal, type AnuncioPortalExterno } from '@/api/portalExterno'

function formatearFecha(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }).format(fecha)
}

interface TarjetaAnuncioProps {
  anuncio: AnuncioPortalExterno
}

function TarjetaAnuncio({ anuncio }: TarjetaAnuncioProps) {
  return (
    <article className="rounded-xl border border-paperRule bg-surface px-4 py-3.5">
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-15 font-semibold text-ink">{anuncio.titulo}</h3>
        <span className="shrink-0 font-data text-12 text-inkSoft">
          {formatearFecha(anuncio.publicadoEn)}
        </span>
      </header>
      {/*
        Esto es lo temporal de verdad: el HTML del comunicado viene directo
        del portal externo y lo metemos tal cual con dangerouslySetInnerHTML.
        No pasa por DOMPurify ni por nada parecido. Si algún día la unidad de
        vinculación migra a un editor que exporte markdown, esto se puede
        cambiar por un render normal. Mientras tanto, ojo.
      */}
      <div
        className="prose-portal mt-2 text-14 text-inkBody"
        dangerouslySetInnerHTML={{ __html: anuncio.cuerpoHtml }}
      />
    </article>
  )
}

interface AnunciosPortalProps {
  /** Máximo de anuncios a mostrar en el dashboard. Por defecto, 5. */
  limite?: number
}

export function AnunciosPortal({ limite = 5 }: AnunciosPortalProps) {
  const [anuncios, setAnuncios] = useState<AnuncioPortalExterno[] | undefined>(undefined)
  const [huboError, setHuboError] = useState(false)

  useEffect(() => {
    let vivo = true

    listarAnunciosPortal()
      .then((lista) => {
        if (!vivo) return
        setAnuncios(lista.slice(0, limite))
      })
      .catch(() => {
        // El portal externo se cae seguido; si falla, simplemente no
        // mostramos anuncios. No queremos que el dashboard entero truene
        // por un comunicado que no cargó.
        if (vivo) setHuboError(true)
      })

    return () => {
      vivo = false
    }
  }, [limite])

  if (huboError) {
    return null
  }

  if (anuncios === undefined) {
    return (
      <div className="rounded-xl border border-paperRule bg-surface px-4 py-3.5 text-13 text-inkSoft">
        Cargando comunicados de la unidad de vinculación…
      </div>
    )
  }

  if (anuncios.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-15 font-semibold text-ink">
        Comunicados de la unidad de vinculación
      </h2>
      <div className="flex flex-col gap-2.5">
        {anuncios.map((anuncio) => (
          <TarjetaAnuncio key={anuncio.id} anuncio={anuncio} />
        ))}
      </div>
    </section>
  )
}
