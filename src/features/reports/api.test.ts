import { describe, expect, it } from 'vitest'
import { reportParams, type ReportFilters } from '@/features/reports/api'

const empty: ReportFilters = {
  date_from: '',
  date_to: '',
  group_by: 'day',
  recipient_type: '',
  client_id: null,
  insurer_id: '',
  status: '',
}

const all: ReportFilters = {
  date_from: '2026-10-01',
  date_to: '2026-10-30',
  group_by: 'month',
  recipient_type: 'insurer',
  client_id: 7,
  insurer_id: '3',
  status: 'open',
}

describe('reportParams', () => {
  it('sin filtros no manda nada (el backend toma el mes en curso), salvo el agrupado de ventas', () => {
    expect(reportParams('clients', empty)).toEqual({})
    expect(reportParams('sales', empty)).toEqual({ group_by: 'day' })
  })

  it('cuentas por cobrar es a hoy: sin fechas, con destinatario y cliente', () => {
    expect(reportParams('receivables', all)).toEqual({ recipient_type: 'insurer', client_id: 7 })
  })

  it('siniestros: período, aseguradora y estado; cada reporte ignora los filtros de otro', () => {
    expect(reportParams('claims', all)).toEqual({ date_from: '2026-10-01', date_to: '2026-10-30', insurer_id: 3, status: 'open' })
    expect(reportParams('budgets', all)).toEqual({ date_from: '2026-10-01', date_to: '2026-10-30' })
  })
})
