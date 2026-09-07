import type { ItemBandeja } from '@/api/bandejaEmpresa'
import { Chip, type ChipTone } from '@/components/Chip'
import { Button } from '@/components/ui/button'

// Mismo mapa que STATUS_TONE en components/StatusBadge.tsx, copiado acá para
// no importar el componente completo solo por el mapa de colores.
// copiado de la bandeja del empresa, luego lo refactorizo.
const ESTADO_TONO: Record<string, ChipTone> = {
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

interface FilaBandejaEmpresaProps {
  item: ItemBandeja
  accionEstado: 'aprobando' | 'rechazando' | null
  onAprobar: (id: number) => void
  onRechazar: (item: ItemBandeja) => void
}

/** Fila de la bandeja del empresa: título, subtítulo, fecha, estado y acciones. */
export function FilaBandejaEmpresa({ item, accionEstado, onAprobar, onRechazar }: FilaBandejaEmpresaProps) {
  const resuelto = item.estado !== 'SUBMITTED'
  const ocupado = accionEstado === 'aprobando' || accionEstado === 'rechazando'

  return (
    <div className="flex min-h-row flex-col justify-center gap-1 px-[18px] py-2.5 transition-colors hover:bg-well sm:flex-row sm:items-center sm:gap-3">
      <span className="text-14 font-semibold text-ink sm:w-48">{item.titulo}</span>
      <span className="flex-1 text-13 text-inkMid">{item.subtitulo}</span>
      <span className="font-data text-13 text-inkSoft sm:w-28">{item.fecha}</span>
      <span className="sm:w-32">
        <Chip tone={ESTADO_TONO[item.estado] ?? 'neutral'}>{item.estado}</Chip>
      </span>
      <span className="flex flex-wrap items-center justify-end gap-1.5 sm:w-44">
        {!resuelto ? (
          <>
            <Button type="button" size="sm" onClick={() => onAprobar(item.id)} disabled={ocupado}>
              {accionEstado === 'aprobando' ? 'Aprobando…' : 'Aprobar'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onRechazar(item)}
              disabled={ocupado}
            >
              {accionEstado === 'rechazando' ? 'Rechazando…' : 'Rechazar'}
            </Button>
          </>
        ) : (
          <span className="text-13 font-semibold text-inkSoft">Revisado</span>
        )}
      </span>
    </div>
  )
}
