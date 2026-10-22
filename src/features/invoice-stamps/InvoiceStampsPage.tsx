import { useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconPencil, IconPlus } from '@tabler/icons-react'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { FormModal } from '@/components/ui/FormModal'
import { IconButton } from '@/components/ui/IconButton'
import { PageBody, PageHeader } from '@/components/ui/Page'
import { SwitchField, TextField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { invoiceStampsApi, type InvoiceStamp } from '@/features/invoice-stamps/api'
import { formatDate } from '@/lib/format'
import { toNumber } from '@/lib/forms'
import { useApiMutation } from '@/lib/useApiMutation'
import { validationErrors } from '@/services/api'

/** Timbrados: autorizan la numeración de las facturas. Uno activo por establecimiento y punto de expedición. */
export function InvoiceStampsPage() {
  const { can } = useAuth()
  const [editing, setEditing] = useState<InvoiceStamp | 'new' | null>(null)
  const query = useQuery({ queryKey: ['invoice-stamps'], queryFn: invoiceStampsApi.list })

  const columns: Column<InvoiceStamp>[] = [
    { key: 'stamp', header: 'Timbrado', className: 'text-nowrap', render: (stamp) => stamp.stamp_number },
    {
      key: 'point',
      header: 'Establecimiento / punto',
      className: 'text-nowrap',
      render: (stamp) => `${stamp.establishment}-${stamp.expedition_point}`,
    },
    {
      key: 'validity',
      header: 'Vigencia',
      className: 'text-nowrap',
      render: (stamp) => `${formatDate(stamp.valid_from)} al ${formatDate(stamp.valid_until)}`,
    },
    { key: 'next', header: 'Próximo número', className: 'text-nowrap', render: (stamp) => stamp.next_invoice_number },
    {
      key: 'status',
      header: 'Estado',
      render: (stamp) =>
        !stamp.is_active ? (
          <span className="badge bg-secondary-lt">Inactivo</span>
        ) : stamp.is_valid_today ? (
          <span className="badge bg-green-lt">Activo y vigente</span>
        ) : (
          <span className="badge bg-yellow-lt">Activo, fuera de vigencia</span>
        ),
    },
    ...(can('invoice-stamps.update')
      ? [
          {
            key: 'actions',
            header: <span className="visually-hidden">Acciones</span>,
            className: 'w-1 text-nowrap',
            render: (stamp: InvoiceStamp) => <IconButton label={`Editar timbrado ${stamp.stamp_number}`} icon={IconPencil} onClick={() => setEditing(stamp)} />,
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        pretitle="Configuración"
        title="Timbrados"
        actions={
          can('invoice-stamps.store') && (
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <IconPlus size={18} className="me-1" aria-hidden="true" />
              Nuevo timbrado
            </button>
          )
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={query.data}
          rowKey={(stamp) => stamp.id}
          isLoading={query.isFetching}
          error={query.error}
          onRetry={() => void query.refetch()}
          emptyMessage="No hay timbrados: registre uno para poder emitir facturas."
        />
        <div className="small text-secondary mt-2">
          Al emitir una factura se usa el timbrado activo y vigente de ese día; si hay más de uno, se elige al emitir.
        </div>
      </PageBody>
      {editing === 'new' && <CreateStampModal onClose={() => setEditing(null)} />}
      {editing && editing !== 'new' && <EditStampModal stamp={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function CreateStampModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    stamp_number: '',
    establishment: '001',
    expedition_point: '001',
    valid_from: '',
    valid_until: '',
    next_number: '',
  })
  const [isActive, setIsActive] = useState(true)
  const set = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: event.target.value })

  const mutation = useApiMutation(
    () =>
      invoiceStampsApi.create({
        stamp_number: form.stamp_number.trim(),
        establishment: form.establishment.trim(),
        expedition_point: form.expedition_point.trim(),
        valid_from: form.valid_from,
        valid_until: form.valid_until,
        next_number: toNumber(form.next_number),
        is_active: isActive,
      }),
    { invalidate: [['invoice-stamps']], successMessage: 'Timbrado registrado.', onSuccess: onClose },
  )
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title="Nuevo timbrado" onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending}>
      <TextField
        label="Número de timbrado"
        name="stamp_number"
        required
        inputMode="numeric"
        maxLength={8}
        autoFocus
        value={form.stamp_number}
        onChange={set('stamp_number')}
        errors={errors}
        hint="8 dígitos."
      />
      <div className="row">
        <div className="col-6">
          <TextField
            label="Establecimiento"
            name="establishment"
            required
            inputMode="numeric"
            maxLength={3}
            value={form.establishment}
            onChange={set('establishment')}
            errors={errors}
          />
        </div>
        <div className="col-6">
          <TextField
            label="Punto de expedición"
            name="expedition_point"
            required
            inputMode="numeric"
            maxLength={3}
            value={form.expedition_point}
            onChange={set('expedition_point')}
            errors={errors}
          />
        </div>
        <div className="col-6">
          <TextField label="Vigente desde" name="valid_from" required type="date" value={form.valid_from} onChange={set('valid_from')} errors={errors} />
        </div>
        <div className="col-6">
          <TextField
            label="Vigente hasta"
            name="valid_until"
            required
            type="date"
            min={form.valid_from || undefined}
            value={form.valid_until}
            onChange={set('valid_until')}
            errors={errors}
          />
        </div>
      </div>
      <TextField
        label="Próximo número"
        name="next_number"
        type="number"
        inputMode="numeric"
        min={1}
        max={9999999}
        step={1}
        value={form.next_number}
        onChange={set('next_number')}
        errors={errors}
        hint="Vacío: empieza en 1. Si el talonario ya se usó, el número siguiente al último emitido."
      />
      <SwitchField
        label="Activo"
        name="is_active"
        checked={isActive}
        onChange={setIsActive}
        errors={errors}
        hint="Solo puede haber uno activo por establecimiento y punto de expedición."
      />
    </FormModal>
  )
}

function EditStampModal({ stamp, onClose }: { stamp: InvoiceStamp; onClose: () => void }) {
  const [validUntil, setValidUntil] = useState(stamp.valid_until)
  const [isActive, setIsActive] = useState(stamp.is_active)

  const mutation = useApiMutation(() => invoiceStampsApi.update(stamp.id, { valid_until: validUntil, is_active: isActive }), {
    invalidate: [['invoice-stamps']],
    successMessage: 'Timbrado actualizado.',
    onSuccess: onClose,
  })
  const errors = validationErrors(mutation.error)

  return (
    <FormModal title={`Timbrado ${stamp.stamp_number}`} onClose={onClose} onSubmit={() => mutation.mutate()} isSubmitting={mutation.isPending}>
      <p className="text-secondary">
        {stamp.establishment}-{stamp.expedition_point} · vigente desde {formatDate(stamp.valid_from)}. Próximo número:{' '}
        {stamp.next_invoice_number}.
      </p>
      <TextField
        label="Vigente hasta"
        name="valid_until"
        required
        type="date"
        min={stamp.valid_from}
        value={validUntil}
        onChange={(event) => setValidUntil(event.target.value)}
        errors={errors}
      />
      <SwitchField label="Activo" name="is_active" checked={isActive} onChange={setIsActive} errors={errors} />
    </FormModal>
  )
}
