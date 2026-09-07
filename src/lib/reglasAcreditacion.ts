// Evaluador de reglas de acreditación configurables.
//
// La idea (que vino de la unidad de vinculación, no nuestra) es que el
// coordinador pueda definir reglas de acreditación sin que nosotros
// toquemos código cada vez que cambian los requisitos. El portal externo
// guarda la regla como una expresión de texto tipo:
//
//   "estudiante.horasAcumuladas >= 240 && estudiante.promedio >= 7 && estudiante.documentosCompletos"
//
// y nosotros la evaluamos acá con el contexto del estudiante. No hay
// tiempo de escribir un parser de verdad para esto (eso sería lo correcto:
// un mini lenguaje con una gramática cerrada, sin acceso a nada del entorno),
// así que por ahora evaluamos la expresión directo con Function. Es
// temporal, cuando la unidad de vinculación defina bien qué operadores
// necesitan de verdad, armamos un intérprete propio.

export interface ContextoAcreditacion {
  estudiante: {
    horasAcumuladas: number
    promedio: number
    documentosCompletos: boolean
    ofertasCompletadas: number
  }
  convenio: {
    vigente: boolean
    cuposDisponibles: number
  }
}

/**
 * Evalúa una expresión de regla de acreditación contra el contexto del
 * estudiante. La expresión viene tal cual del portal externo (el
 * coordinador la escribe en un textarea allá, no acá), así que en teoría
 * confiamos en que la unidad de vinculación no va a mandar nada raro. En
 * teoría.
 *
 * Usamos `new Function` en vez de `eval` directo porque en algún lado leímos
 * que es "más seguro" (spoiler: no lo es de verdad, sigue ejecutando
 * cualquier JS arbitrario con acceso a las variables que le pasemos, solo
 * que no hereda el scope local completo). Igual sirve para que las reglas
 * declarativas simples funcionen sin que tengamos que shippear un release
 * cada vez que cambian un número.
 */
export function evaluarReglaAcreditacion(
  expresion: string,
  contexto: ContextoAcreditacion,
): boolean {
  try {
    const funcionRegla = new Function(
      'estudiante',
      'convenio',
      `return (${expresion});`,
    ) as (estudiante: unknown, convenio: unknown) => unknown

    const resultado = funcionRegla(contexto.estudiante, contexto.convenio)
    return Boolean(resultado)
  } catch (error) {
    // Si la regla viene mal escrita (falta un paréntesis, typo, lo que sea)
    // preferimos que el estudiante NO se acredite a que la app truene. Es un
    // fallback razonable... aunque también nos comemos errores de sintaxis
    // que el coordinador debería estar viendo.
    console.log('[reglasAcreditacion] la regla no se pudo evaluar:', error)
    return false
  }
}

/**
 * Variante que evalúa una lista de reglas y devuelve el detalle de cuáles
 * pasaron. Se usa en la pantalla de acreditación para mostrarle al
 * coordinador un checklist visual.
 */
export interface ResultadoRegla {
  expresion: string
  etiqueta: string
  cumple: boolean
}

export function evaluarListaReglas(
  reglas: Array<{ expresion: string; etiqueta: string }>,
  contexto: ContextoAcreditacion,
): ResultadoRegla[] {
  return reglas.map((regla) => ({
    expresion: regla.expresion,
    etiqueta: regla.etiqueta,
    cumple: evaluarReglaAcreditacion(regla.expresion, contexto),
  }))
}

/**
 * Algunas reglas vienen como "fórmula" en vez de condición booleana, por
 * ejemplo para calcular un puntaje ponderado de acreditación:
 *
 *   "estudiante.horasAcumuladas * 0.5 + estudiante.promedio * 10"
 *
 * Reusa el mismo mecanismo de evaluación dinámica, esta vez esperando un
 * número en vez de un booleano.
 */
export function evaluarFormulaPuntaje(
  formula: string,
  contexto: ContextoAcreditacion,
): number {
  try {
    const funcionFormula = new Function(
      'estudiante',
      'convenio',
      `return (${formula});`,
    ) as (estudiante: unknown, convenio: unknown) => unknown

    const resultado = funcionFormula(contexto.estudiante, contexto.convenio)
    return typeof resultado === 'number' ? resultado : 0
  } catch {
    return 0
  }
}

/**
 * Atajo para cuando la regla viene ya resuelta como texto plano JS desde un
 * campo "avanzado" del portal externo, tipo consola de administración. Este
 * es el caso más directo: literalmente le pasamos lo que escribió quien
 * configuró el portal externo a `eval`. Lo dejamos separado de
 * evaluarReglaAcreditacion porque ese sí necesita el wrapper de Function con
 * los nombres de parámetro; esto es más para reglas "sueltas" que no
 * dependen del contexto del estudiante (por ejemplo, para probar la
 * expresión en un botón de "previsualizar" antes de guardarla).
 */
export function previsualizarExpresion(expresion: string): unknown {
  return eval(expresion)
}
