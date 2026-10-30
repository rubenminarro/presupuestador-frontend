import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { ClaimEconomicSummary } from '@/features/claims/api'
import { SummaryBody } from '@/features/claims/ClaimSummaryCard'

vi.mock('@/features/auth/useAuth', () => ({ useAuth: () => ({ can: () => true }) }))

const billing: NonNullable<ClaimEconomicSummary['billing']> = {
  totals: { net_invoiced: '1650000.00', collected: '0.00', balance: '1650000.00' },
  by_recipient: [
    {
      recipient_type: 'insurer',
      recipient_label: 'Aseguradora',
      invoices_count: 1,
      drafts_count: 1,
      invoiced_total: '1650000.00',
      credited_total: '0.00',
      net_invoiced: '1650000.00',
      collected: '0.00',
      balance: '1650000.00',
    },
  ],
  invoices: [],
}

describe('SummaryBody', () => {
  it('muestra solo los bloques que llegan (según el permiso) y las alertas', () => {
    render(
      <MemoryRouter>
        <SummaryBody summary={{ claim: { id: 1, code: 'SIN-000001', deductible_amount: null }, billing, alerts: ['El deducible del siniestro es desconocido.'] }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('El deducible del siniestro es desconocido.')).toBeInTheDocument()
    expect(screen.getByText('Facturación (con IVA)')).toBeInTheDocument()
    expect(screen.getByText(/1 en borrador/)).toBeInTheDocument()
    expect(screen.queryByText('Presupuestos (sin IVA)')).not.toBeInTheDocument()
    expect(screen.queryByText('Reparto confirmado (sin IVA)')).not.toBeInTheDocument()
  })

  it('sin bloques ni alertas lo dice', () => {
    render(
      <MemoryRouter>
        <SummaryBody summary={{ claim: { id: 1, code: 'SIN-000001', deductible_amount: '0.00' }, alerts: [] }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Sin información económica disponible para su usuario.')).toBeInTheDocument()
  })
})
