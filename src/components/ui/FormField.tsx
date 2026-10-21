import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import type { ValidationErrors } from '@/types/api'

interface FormFieldProps {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  /** Mensajes del 422 para este campo. */
  error?: string[]
  children: ReactNode
}

/** Etiqueta, control, ayuda y errores de validación de la API. */
export function FormField({ label, htmlFor, required, hint, error, children }: FormFieldProps) {
  return (
    <div className="mb-3">
      <label className={cx('form-label', required && 'required')} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error?.map((message) => (
        <div key={message} className="invalid-feedback d-block">
          {message}
        </div>
      ))}
      {hint && <small className="form-hint">{hint}</small>}
    </div>
  )
}

interface FieldBase {
  label: string
  name: string
  errors?: ValidationErrors
  hint?: string
}

type TextFieldProps = FieldBase & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>

export function TextField({ label, name, errors, hint, required, className, id, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const error = errors?.[name]

  return (
    <FormField label={label} htmlFor={inputId} required={required} hint={hint} error={error}>
      <input
        id={inputId}
        name={name}
        required={required}
        className={cx('form-control', error && 'is-invalid', className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FormField>
  )
}

type SelectFieldProps = FieldBase & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'>

export function SelectField({ label, name, errors, hint, required, className, id, children, ...props }: SelectFieldProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const error = errors?.[name]

  return (
    <FormField label={label} htmlFor={selectId} required={required} hint={hint} error={error}>
      <select
        id={selectId}
        name={name}
        required={required}
        className={cx('form-select', error && 'is-invalid', className)}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
    </FormField>
  )
}

type TextareaFieldProps = FieldBase & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'>

export function TextareaField({ label, name, errors, hint, required, className, id, ...props }: TextareaFieldProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  const error = errors?.[name]

  return (
    <FormField label={label} htmlFor={textareaId} required={required} hint={hint} error={error}>
      <textarea
        id={textareaId}
        name={name}
        required={required}
        className={cx('form-control', error && 'is-invalid', className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
    </FormField>
  )
}
