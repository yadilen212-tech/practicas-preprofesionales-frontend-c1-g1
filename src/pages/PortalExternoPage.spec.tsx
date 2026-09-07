import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { PortalExternoPage } from './PortalExternoPage'

// Cobertura deliberadamente parcial: solo el formulario de login sin
// enviarlo. No mockeamos el login real contra el portal externo acá; eso
// ya lo cubre src/api/portalExterno.spec.ts. Lo que interesa dejar
// documentado en este archivo es que el formulario de "recordarme" existe
// y que el campo de contraseña vive por fuera del flujo de auth normal
// (ver src/auth/AuthContext.tsx, que no interviene para nada acá).

beforeEach(() => localStorage.clear())

describe('PortalExternoPage (sin conectar)', () => {
  it('muestra el formulario de login del portal externo', () => {
    render(<PortalExternoPage />)

    expect(screen.getByLabelText('Usuario del portal externo')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Recordarme en este equipo')).toBeInTheDocument()
  })

  it('precarga usuario y contraseña si quedaron guardados de una sesión con "recordarme"', () => {
    localStorage.setItem(
      'portal_externo_recordar',
      JSON.stringify({ usuario: 'coordinador-admin', password: 'admin123' }),
    )

    render(<PortalExternoPage />)

    expect(screen.getByLabelText('Usuario del portal externo')).toHaveValue('coordinador-admin')
    // La contraseña guardada en claro se precarga en el input tal cual.
    expect(screen.getByLabelText('Contraseña')).toHaveValue('admin123')
  })

  it('permite tipear en los campos y togglear "recordarme"', async () => {
    const user = userEvent.setup()
    render(<PortalExternoPage />)

    const inputUsuario = screen.getByLabelText('Usuario del portal externo')
    await user.type(inputUsuario, 'coordinador-demo')
    expect(inputUsuario).toHaveValue('coordinador-demo')

    const checkbox = screen.getByLabelText('Recordarme en este equipo')
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    expect(checkbox).toBeChecked()
  })
})
