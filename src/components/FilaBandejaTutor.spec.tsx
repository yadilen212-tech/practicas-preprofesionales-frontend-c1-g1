import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ItemBandeja } from '@/api/bandejaTutor'
import { FilaBandejaTutor } from './FilaBandejaTutor'

const item: ItemBandeja = {
  id: 1,
  titulo: 'Ana Pérez',
  subtitulo: 'Revisión de horas',
  fecha: '2026-01-15',
  estado: 'SUBMITTED',
  nota: null,
}

describe('FilaBandejaTutor', () => {
  it('muestra título, subtítulo, fecha y estado', () => {
    render(
      <FilaBandejaTutor item={item} accionEstado={null} onAprobar={vi.fn()} onRechazar={vi.fn()} />,
    )
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Revisión de horas')).toBeInTheDocument()
    expect(screen.getByText('SUBMITTED')).toBeInTheDocument()
  })

  it('muestra los botones de aprobar/rechazar cuando no está resuelto', () => {
    render(
      <FilaBandejaTutor item={item} accionEstado={null} onAprobar={vi.fn()} onRechazar={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument()
  })

  it('llama a onAprobar y onRechazar con el item correcto', () => {
    const onAprobar = vi.fn()
    const onRechazar = vi.fn()
    render(<FilaBandejaTutor item={item} accionEstado={null} onAprobar={onAprobar} onRechazar={onRechazar} />)

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    expect(onAprobar).toHaveBeenCalledWith(1)

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
    expect(onRechazar).toHaveBeenCalledWith(item)
  })

  it('muestra "Revisado" en vez de los botones cuando el item ya está resuelto', () => {
    render(
      <FilaBandejaTutor
        item={{ ...item, estado: 'APPROVED' }}
        accionEstado={null}
        onAprobar={vi.fn()}
        onRechazar={vi.fn()}
      />,
    )
    expect(screen.getByText('Revisado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument()
  })

  it('deshabilita los botones y cambia el texto mientras hay una acción en curso', () => {
    render(
      <FilaBandejaTutor item={item} accionEstado="aprobando" onAprobar={vi.fn()} onRechazar={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Aprobando…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeDisabled()
  })
})
