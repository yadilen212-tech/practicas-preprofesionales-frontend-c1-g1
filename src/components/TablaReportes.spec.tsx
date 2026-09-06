import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReporteFilaProcesada } from '@/lib/reportes'
import { TablaReportes } from './TablaReportes'

function crearFila(overrides: Partial<ReporteFilaProcesada> = {}): ReporteFilaProcesada {
  return {
    placementId: 1,
    nombreEstudiante: 'Ana Torres',
    carrera: 'Sistemas',
    empresa: 'Acme',
    tutor: 'Prof. Ríos',
    coordinador: 'Coord. Vega',
    periodo: '2026-1',
    horasAprobadas: 200,
    horasRequeridas: 240,
    avance: 83.3,
    estadoPostulacion: 'ACTIVE',
    nivelAcreditacion: 'PENDIENTE',
    promedioEvaluacion: 4.2,
    documentosEntregados: 5,
    documentosRequeridos: 6,
    observaciones: [],
    semaforo: 'AMARILLO',
    estadoDetallado: 'PENDIENTE',
    ...overrides,
  }
}

function propsBase(overrides: Partial<Parameters<typeof TablaReportes>[0]> = {}) {
  return {
    filas: [] as ReporteFilaProcesada[],
    cargando: false,
    error: null,
    ordenActual: 'NOMBRE' as const,
    onCambiarOrden: vi.fn(),
    filtroTexto: '',
    onCambiarFiltroTexto: vi.fn(),
    filtroCarrera: '',
    filtroEmpresa: '',
    filtroNivel: '',
    filtroSemaforo: '',
    mostrarColumnaTutor: true,
    mostrarColumnaCoordinador: false,
    mostrarColumnaObservaciones: true,
    onSeleccionarFila: vi.fn(),
    filaSeleccionadaId: null,
    modoCompacto: false,
    onExportar: vi.fn(),
    ...overrides,
  }
}

describe('TablaReportes — estados simples', () => {
  it('muestra el mensaje de carga', () => {
    render(<TablaReportes {...propsBase({ cargando: true })} />)
    expect(screen.getByText('Cargando reporte…')).toBeInTheDocument()
  })

  it('muestra el error', () => {
    render(<TablaReportes {...propsBase({ error: 'No se pudo generar el reporte' })} />)
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo generar el reporte')
  })

  it('muestra el estado vacío cuando no hay filas ni filtros', () => {
    render(<TablaReportes {...propsBase()} />)
    expect(screen.getByText('No hay filas para este reporte')).toBeInTheDocument()
    expect(screen.getByText('Todavía no hay datos para este periodo.')).toBeInTheDocument()
  })

  it('sugiere quitar el filtro cuando hay un filtro activo y no hay resultados', () => {
    render(<TablaReportes {...propsBase({ filtroTexto: 'algo' })} />)
    expect(screen.getByText('Probá quitando algún filtro.')).toBeInTheDocument()
  })
})

describe('TablaReportes — con filas', () => {
  it('renderiza el nombre, la empresa y el avance de cada fila', () => {
    render(<TablaReportes {...propsBase({ filas: [crearFila()] })} />)
    expect(screen.getByText('Ana Torres')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('83%')).toBeInTheDocument()
  })

  it('oculta la columna de tutor cuando el flag está apagado', () => {
    render(<TablaReportes {...propsBase({ filas: [crearFila()], mostrarColumnaTutor: false })} />)
    expect(screen.queryByText('Prof. Ríos')).not.toBeInTheDocument()
  })

  it('muestra "No disponible" cuando no hay tutor asignado', () => {
    render(<TablaReportes {...propsBase({ filas: [crearFila({ tutor: '' })] })} />)
    expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0)
  })

  it('llama a onSeleccionarFila al hacer click en una fila', () => {
    const onSeleccionarFila = vi.fn()
    render(<TablaReportes {...propsBase({ filas: [crearFila()], onSeleccionarFila })} />)
    fireEvent.click(screen.getByText('Ana Torres'))
    expect(onSeleccionarFila).toHaveBeenCalledWith(expect.objectContaining({ placementId: 1 }))
  })

  it('llama a onCambiarOrden al hacer click en los encabezados ordenables', () => {
    const onCambiarOrden = vi.fn()
    render(<TablaReportes {...propsBase({ filas: [crearFila()], onCambiarOrden })} />)
    fireEvent.click(screen.getByText('Avance'))
    expect(onCambiarOrden).toHaveBeenCalledWith('AVANCE')
  })

  it('llama a onCambiarFiltroTexto al escribir en el buscador', () => {
    const onCambiarFiltroTexto = vi.fn()
    render(<TablaReportes {...propsBase({ filas: [crearFila()], onCambiarFiltroTexto })} />)
    fireEvent.change(screen.getByPlaceholderText('Buscar estudiante, empresa o carrera…'), {
      target: { value: 'ana' },
    })
    expect(onCambiarFiltroTexto).toHaveBeenCalledWith('ana')
  })

  it('llama a onExportar con "csv" y con "pdf"', () => {
    const onExportar = vi.fn()
    render(<TablaReportes {...propsBase({ filas: [crearFila()], onExportar })} />)
    fireEvent.click(screen.getByText('Exportar CSV'))
    fireEvent.click(screen.getByText('Exportar PDF'))
    expect(onExportar).toHaveBeenCalledWith('csv')
    expect(onExportar).toHaveBeenCalledWith('pdf')
  })

  it('resalta la fila seleccionada', () => {
    render(<TablaReportes {...propsBase({ filas: [crearFila()], filaSeleccionadaId: 1 })} />)
    expect(screen.getByText('Ana Torres').closest('div')?.className).toContain('bg-well')
  })

  it('renderiza los cuatro colores del chip de nivel de acreditación', () => {
    const filas = [
      crearFila({ placementId: 1, nivelAcreditacion: 'PENDIENTE' }),
      crearFila({ placementId: 2, nivelAcreditacion: 'ACREDITADO' }),
      crearFila({ placementId: 3, nivelAcreditacion: 'NO_ACREDITADO' }),
      crearFila({ placementId: 4, nivelAcreditacion: 'ACREDITADO_CON_OBSERVACIONES' }),
    ]
    render(<TablaReportes {...propsBase({ filas })} />)
    expect(screen.getByText('Acreditado')).toBeInTheDocument()
    expect(screen.getByText('No acreditado')).toBeInTheDocument()
  })

  it('renderiza la paginación decorativa', () => {
    render(<TablaReportes {...propsBase({ filas: [crearFila()] })} />)
    expect(screen.getByText('1 filas')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
