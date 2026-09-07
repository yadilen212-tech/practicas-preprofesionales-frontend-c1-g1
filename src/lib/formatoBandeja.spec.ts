import { describe, expect, it } from 'vitest'
import {
  agruparPorEstado,
  agruparPorMes,
  aplanarGrupos,
  calcularDiasHabiles,
  calcularEdadEnDias,
  calcularProgreso,
  calcularSemaforo,
  calcularTotalPaginas,
  contarPorEstado,
  contarPorRangoFechas,
  contarVencidos,
  deduplicarPorId,
  esVencido,
  filtrarPorTexto,
  formatearAntiguedad,
  formatearDuracionHoras,
  formatearEstado,
  formatearContadorBandeja,
  formatearFecha,
  formatearFechaLarga,
  formatearListaEstados,
  formatearListaTitulos,
  formatearMes,
  formatearNota,
  formatearPorcentaje,
  formatearRangoFechas,
  formatearResumenResolucion,
  generarEtiquetaBandeja,
  itemMasUrgente,
  normalizarBusqueda,
  obtenerColorAvatar,
  obtenerIniciales,
  obtenerResumenTexto,
  ordenarAlfabeticamente,
  ordenarPorFecha,
  ordenarPorPrioridadEstado,
  ordenarPorSubtitulo,
  ordenarPorTitulo,
  paginar,
  resumenBandeja,
  truncarTexto,
  validarNota,
  validarRangoFechas,
} from './formatoBandeja'

// Las pruebas de "antigüedad" necesitan la fecha calendario LOCAL (no UTC),
// igual que hace el propio helper — si usáramos toISOString() a secas, en
// una zona horaria detrás de UTC (como es-EC) el resultado podía adelantarse
// un día según la hora a la que corriera el test.
function fechaLocalISO(date: Date): string {
  const anio = date.getFullYear()
  const mes = String(date.getMonth() + 1).padStart(2, '0')
  const dia = String(date.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

describe('formatearFecha', () => {
  it('formatea una fecha ISO como dd mmm aaaa', () => {
    expect(formatearFecha('2026-01-15')).toContain('2026')
  })

  it('devuelve el valor original si la fecha no es válida', () => {
    expect(formatearFecha('no-es-una-fecha')).toBe('no-es-una-fecha')
  })
})

describe('formatearFechaLarga', () => {
  it('hace lo mismo que formatearFecha (quedó duplicada a propósito)', () => {
    expect(formatearFechaLarga('2026-01-15')).toBe(formatearFecha('2026-01-15'))
  })

  it('también devuelve el valor original si la fecha no es válida', () => {
    expect(formatearFechaLarga('no-es-una-fecha')).toBe('no-es-una-fecha')
  })
})

describe('formatearEstado', () => {
  it('traduce los estados pendientes', () => {
    expect(formatearEstado('SUBMITTED')).toBe('Pendiente')
    expect(formatearEstado('PENDING')).toBe('Pendiente')
    expect(formatearEstado('PENDIENTE')).toBe('Pendiente')
  })

  it('traduce los estados aprobados', () => {
    expect(formatearEstado('APPROVED')).toBe('Aprobado')
    expect(formatearEstado('ACCEPTED')).toBe('Aprobado')
    expect(formatearEstado('ACREDITADO')).toBe('Aprobado')
  })

  it('traduce los estados rechazados', () => {
    expect(formatearEstado('REJECTED')).toBe('Rechazado')
    expect(formatearEstado('NO_ACREDITADO')).toBe('Rechazado')
  })

  it('devuelve el código tal cual si no lo reconoce', () => {
    expect(formatearEstado('LO_QUE_SEA')).toBe('LO_QUE_SEA')
  })
})

describe('calcularProgreso', () => {
  it('devuelve 0 si el total es cero o negativo', () => {
    expect(calcularProgreso(3, 0)).toBe(0)
    expect(calcularProgreso(3, -1)).toBe(0)
  })

  it('calcula el porcentaje redondeado', () => {
    expect(calcularProgreso(1, 3)).toBe(33)
  })

  it('nunca pasa de 100', () => {
    expect(calcularProgreso(5, 4)).toBe(100)
  })
})

describe('ordenarPorFecha', () => {
  it('ordena descendente sin mutar el arreglo original', () => {
    const items = [{ fecha: '2026-01-01' }, { fecha: '2026-03-01' }, { fecha: '2026-02-01' }]
    const ordenados = ordenarPorFecha(items, (item) => item.fecha)
    expect(ordenados.map((item) => item.fecha)).toEqual(['2026-03-01', '2026-02-01', '2026-01-01'])
    expect(items[0].fecha).toBe('2026-01-01')
  })
})

describe('filtrarPorTexto', () => {
  const items = [{ nombre: 'Ana Pérez' }, { nombre: 'Luis Soto' }]

  it('devuelve todo si el texto está vacío', () => {
    expect(filtrarPorTexto(items, '  ', (item) => item.nombre)).toEqual(items)
  })

  it('filtra sin distinguir mayúsculas', () => {
    expect(filtrarPorTexto(items, 'ana', (item) => item.nombre)).toEqual([{ nombre: 'Ana Pérez' }])
  })
})

describe('resumenBandeja', () => {
  it('cuenta pendientes, aprobados y rechazados', () => {
    const items = [{ estado: 'SUBMITTED' }, { estado: 'APPROVED' }, { estado: 'REJECTED' }, { estado: 'PENDING' }]
    expect(resumenBandeja(items)).toEqual({
      pendientes: 2,
      aprobados: 1,
      rechazados: 1,
      total: 4,
      progreso: 25,
    })
  })

  it('funciona con la bandeja vacía', () => {
    expect(resumenBandeja([])).toEqual({
      pendientes: 0,
      aprobados: 0,
      rechazados: 0,
      total: 0,
      progreso: 0,
    })
  })
})

describe('agruparPorEstado', () => {
  it('agrupa los items por estado', () => {
    const items = [{ estado: 'A' }, { estado: 'B' }, { estado: 'A' }]
    expect(agruparPorEstado(items)).toEqual({
      A: [{ estado: 'A' }, { estado: 'A' }],
      B: [{ estado: 'B' }],
    })
  })
})

describe('paginar', () => {
  const items = [1, 2, 3, 4, 5, 6, 7]

  it('recorta la página pedida', () => {
    expect(paginar(items, 2, 3)).toEqual([4, 5, 6])
  })

  it('nunca usa una página menor a 1', () => {
    expect(paginar(items, 0, 3)).toEqual([1, 2, 3])
  })
})

describe('calcularTotalPaginas', () => {
  it('calcula el redondeo hacia arriba', () => {
    expect(calcularTotalPaginas(7, 3)).toBe(3)
  })

  it('devuelve 1 si el total o el tamaño no son válidos', () => {
    expect(calcularTotalPaginas(0, 3)).toBe(1)
    expect(calcularTotalPaginas(7, 0)).toBe(1)
  })
})

describe('truncarTexto', () => {
  it('deja el texto igual si ya entra', () => {
    expect(truncarTexto('hola', 10)).toBe('hola')
  })

  it('recorta y agrega puntos suspensivos si no entra', () => {
    expect(truncarTexto('un texto bastante largo', 8)).toBe('un texto…')
  })
})

describe('validarNota', () => {
  it('rechaza una nota vacía', () => {
    expect(validarNota('   ')).toBe('La nota no puede estar vacía')
  })

  it('rechaza una nota demasiado corta', () => {
    expect(validarNota('mal')).toBe('La nota es demasiado corta, agrega más detalle')
  })

  it('rechaza una nota demasiado larga', () => {
    expect(validarNota('x'.repeat(501))).toBe('La nota es demasiado larga, resume la idea')
  })

  it('acepta una nota válida', () => {
    expect(validarNota('falta el detalle de la actividad')).toBeNull()
  })
})

describe('formatearRangoFechas', () => {
  it('junta las dos fechas formateadas con un guión', () => {
    expect(formatearRangoFechas('2026-01-01', '2026-02-01')).toContain('–')
  })
})

describe('ordenarPorPrioridadEstado', () => {
  it('pone primero lo pendiente, luego lo rechazado, al final lo aprobado', () => {
    const items = [{ estado: 'APPROVED' }, { estado: 'REJECTED' }, { estado: 'SUBMITTED' }, { estado: 'RARO' }]
    expect(ordenarPorPrioridadEstado(items).map((item) => item.estado)).toEqual([
      'SUBMITTED',
      'REJECTED',
      'APPROVED',
      'RARO',
    ])
  })
})

describe('contarPorEstado', () => {
  it('cuenta cuántos items tienen ese estado exacto', () => {
    const items = [{ estado: 'A' }, { estado: 'B' }, { estado: 'A' }]
    expect(contarPorEstado(items, 'A')).toBe(2)
  })
})

describe('esVencido', () => {
  it('es true para una fecha muy antigua', () => {
    expect(esVencido('2000-01-01', 5)).toBe(true)
  })

  it('es false para una fecha de hoy', () => {
    const hoy = fechaLocalISO(new Date())
    expect(esVencido(hoy, 5)).toBe(false)
  })
})

describe('formatearNota', () => {
  it('muestra "Sin nota" si es null', () => {
    expect(formatearNota(null)).toBe('Sin nota')
  })

  it('muestra "Sin nota" si es solo espacios', () => {
    expect(formatearNota('   ')).toBe('Sin nota')
  })

  it('muestra la nota recortada si tiene contenido', () => {
    expect(formatearNota('  todo bien  ')).toBe('todo bien')
  })
})

describe('normalizarBusqueda', () => {
  it('quita mayúsculas, espacios y tildes', () => {
    expect(normalizarBusqueda('  ÁNGEL Pérez  ')).toBe('angel perez')
  })
})

describe('obtenerIniciales', () => {
  it('devuelve las dos primeras letras si hay un solo nombre', () => {
    expect(obtenerIniciales('Ana')).toBe('AN')
  })

  it('devuelve la inicial del primer y último nombre', () => {
    expect(obtenerIniciales('Ana María Pérez')).toBe('AP')
  })

  it('devuelve "?" si el nombre viene vacío', () => {
    expect(obtenerIniciales('   ')).toBe('?')
  })
})

describe('formatearPorcentaje', () => {
  it('redondea y agrega el símbolo', () => {
    expect(formatearPorcentaje(33.6)).toBe('34%')
  })
})

describe('itemMasUrgente', () => {
  it('devuelve el pendiente más antiguo', () => {
    const items = [
      { estado: 'SUBMITTED', fecha: '2026-02-01' },
      { estado: 'SUBMITTED', fecha: '2026-01-01' },
      { estado: 'APPROVED', fecha: '2025-01-01' },
    ]
    expect(itemMasUrgente(items)?.fecha).toBe('2026-01-01')
  })

  it('devuelve null si no hay pendientes', () => {
    expect(itemMasUrgente([{ estado: 'APPROVED', fecha: '2026-01-01' }])).toBeNull()
  })
})

describe('formatearDuracionHoras', () => {
  it('formatea horas y minutos', () => {
    expect(formatearDuracionHoras(1.5)).toBe('1h 30m')
  })

  it('formatea solo minutos si es menos de una hora', () => {
    expect(formatearDuracionHoras(0.25)).toBe('15m')
  })

  it('formatea solo horas si son horas exactas', () => {
    expect(formatearDuracionHoras(2)).toBe('2h')
  })
})

describe('calcularDiasHabiles', () => {
  it('cuenta de lunes a viernes, sin fines de semana', () => {
    // 2026-01-05 es lunes, 2026-01-11 es domingo: 5 días hábiles.
    expect(calcularDiasHabiles('2026-01-05', '2026-01-11')).toBe(5)
  })
})

describe('generarEtiquetaBandeja', () => {
  it('junta título, fecha y estado', () => {
    const etiqueta = generarEtiquetaBandeja({ titulo: 'Ana', fecha: '2026-01-01', estado: 'SUBMITTED' })
    expect(etiqueta).toContain('Ana')
    expect(etiqueta).toContain('Pendiente')
  })
})

describe('deduplicarPorId', () => {
  it('deja solo la primera aparición de cada id', () => {
    const items = [{ id: 1, v: 'a' }, { id: 2, v: 'b' }, { id: 1, v: 'c' }]
    expect(deduplicarPorId(items)).toEqual([{ id: 1, v: 'a' }, { id: 2, v: 'b' }])
  })
})

describe('ordenarAlfabeticamente', () => {
  it('ordena de la a a la z sin mutar el original', () => {
    const items = [{ nombre: 'Luis' }, { nombre: 'Ana' }]
    const ordenados = ordenarAlfabeticamente(items, (item) => item.nombre)
    expect(ordenados.map((item) => item.nombre)).toEqual(['Ana', 'Luis'])
    expect(items[0].nombre).toBe('Luis')
  })
})

describe('obtenerColorAvatar', () => {
  it('devuelve siempre el mismo color para el mismo nombre', () => {
    expect(obtenerColorAvatar('Ana Pérez')).toBe(obtenerColorAvatar('Ana Pérez'))
  })

  it('devuelve un color de la paleta', () => {
    expect(obtenerColorAvatar('Ana')).toMatch(/^#[0-9A-F]{6}$/i)
  })
})

describe('formatearListaTitulos', () => {
  it('junta todos los títulos si entran en el máximo', () => {
    expect(formatearListaTitulos(['A', 'B'], 3)).toBe('A, B')
  })

  it('agrega "y N más" si sobran títulos', () => {
    expect(formatearListaTitulos(['A', 'B', 'C', 'D'], 2)).toBe('A, B y 2 más')
  })
})

describe('validarRangoFechas', () => {
  it('rechaza fechas inválidas', () => {
    expect(validarRangoFechas('no-es-fecha', '2026-01-01')).toBe('Alguna de las dos fechas no es válida')
  })

  it('rechaza un rango invertido', () => {
    expect(validarRangoFechas('2026-02-01', '2026-01-01')).toBe(
      'La fecha de inicio no puede ser posterior a la de fin',
    )
  })

  it('acepta un rango válido', () => {
    expect(validarRangoFechas('2026-01-01', '2026-02-01')).toBeNull()
  })
})

describe('calcularEdadEnDias', () => {
  it('devuelve 0 para hoy', () => {
    const hoy = fechaLocalISO(new Date())
    expect(calcularEdadEnDias(hoy)).toBe(0)
  })

  it('nunca devuelve negativo para una fecha futura', () => {
    const manana = fechaLocalISO(new Date(Date.now() + 86_400_000))
    expect(calcularEdadEnDias(manana)).toBe(0)
  })
})

describe('formatearAntiguedad', () => {
  it('dice "Hoy" para la fecha de hoy', () => {
    const hoy = fechaLocalISO(new Date())
    expect(formatearAntiguedad(hoy)).toBe('Hoy')
  })

  it('dice "Ayer" para la fecha de ayer', () => {
    const ayer = fechaLocalISO(new Date(Date.now() - 86_400_000))
    expect(formatearAntiguedad(ayer)).toBe('Ayer')
  })

  it('dice "Hace N días" para fechas más antiguas', () => {
    const haceRato = fechaLocalISO(new Date(Date.now() - 5 * 86_400_000))
    expect(formatearAntiguedad(haceRato)).toBe('Hace 5 días')
  })
})

describe('aplanarGrupos', () => {
  it('junta todos los items de todos los grupos en un solo arreglo', () => {
    const grupos = { A: [1, 2], B: [3] }
    expect(aplanarGrupos(grupos)).toEqual([1, 2, 3])
  })

  it('devuelve un arreglo vacío si no hay grupos', () => {
    expect(aplanarGrupos({})).toEqual([])
  })
})

describe('formatearListaEstados', () => {
  it('traduce y junta varios estados', () => {
    expect(formatearListaEstados(['SUBMITTED', 'APPROVED'])).toBe('Pendiente, Aprobado')
  })
})

describe('calcularSemaforo', () => {
  it('es rojo si ya no quedan días', () => {
    expect(calcularSemaforo(0)).toBe('rojo')
    expect(calcularSemaforo(-1)).toBe('rojo')
  })

  it('es amarillo con poco margen', () => {
    expect(calcularSemaforo(2)).toBe('amarillo')
  })

  it('es verde con margen de sobra', () => {
    expect(calcularSemaforo(5)).toBe('verde')
  })
})

describe('agruparPorMes', () => {
  it('agrupa por año-mes de la fecha', () => {
    const items = [{ fecha: '2026-01-05' }, { fecha: '2026-01-20' }, { fecha: '2026-02-01' }]
    const grupos = agruparPorMes(items)
    expect(grupos['2026-01']).toHaveLength(2)
    expect(grupos['2026-02']).toHaveLength(1)
  })
})

describe('formatearMes', () => {
  it('formatea como "mes aaaa"', () => {
    expect(formatearMes('2026-01-15')).toContain('2026')
  })
})

describe('contarVencidos', () => {
  it('cuenta los items vencidos según el límite', () => {
    const items = [{ fecha: '2000-01-01' }, { fecha: fechaLocalISO(new Date()) }]
    expect(contarVencidos(items, 5)).toBe(1)
  })
})

describe('ordenarPorTitulo', () => {
  it('ordena por título alfabéticamente', () => {
    const items = [{ titulo: 'Zeta' }, { titulo: 'Alfa' }]
    expect(ordenarPorTitulo(items).map((item) => item.titulo)).toEqual(['Alfa', 'Zeta'])
  })
})

describe('formatearResumenResolucion', () => {
  it('incluye título, estado y fecha', () => {
    const resumen = formatearResumenResolucion({
      titulo: 'Ana',
      estado: 'APPROVED',
      fecha: '2026-01-01',
      nota: null,
    })
    expect(resumen).toContain('Ana')
    expect(resumen).toContain('Aprobado')
  })

  it('incluye la nota si viene una', () => {
    const resumen = formatearResumenResolucion({
      titulo: 'Ana',
      estado: 'REJECTED',
      fecha: '2026-01-01',
      nota: 'Falta información',
    })
    expect(resumen).toContain('Falta información')
  })
})

describe('contarPorRangoFechas', () => {
  it('cuenta solo los items dentro del rango, inclusive', () => {
    const items = [{ fecha: '2026-01-01' }, { fecha: '2026-01-15' }, { fecha: '2026-02-01' }]
    expect(contarPorRangoFechas(items, '2026-01-01', '2026-01-31')).toBe(2)
  })
})

describe('formatearContadorBandeja', () => {
  it('junta el conteo y el porcentaje', () => {
    expect(formatearContadorBandeja(3, 10)).toBe('3 de 10 (30%)')
  })
})

describe('ordenarPorSubtitulo', () => {
  it('ordena por subtítulo alfabéticamente', () => {
    const items = [{ subtitulo: 'Zeta' }, { subtitulo: 'Alfa' }]
    expect(ordenarPorSubtitulo(items).map((item) => item.subtitulo)).toEqual(['Alfa', 'Zeta'])
  })
})

describe('obtenerResumenTexto', () => {
  it('junta las partes que tienen valor', () => {
    expect(obtenerResumenTexto({ pendientes: 2, aprobados: 1, rechazados: 0 })).toBe('2 pendientes, 1 aprobado')
  })

  it('usa singular cuando corresponde', () => {
    expect(obtenerResumenTexto({ pendientes: 1, aprobados: 0, rechazados: 0 })).toBe('1 pendiente')
  })

  it('dice "Sin actividad" si todo está en cero', () => {
    expect(obtenerResumenTexto({ pendientes: 0, aprobados: 0, rechazados: 0 })).toBe('Sin actividad')
  })
})
