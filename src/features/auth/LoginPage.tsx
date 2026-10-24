import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { TextField } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/useAuth'
import { useBranding } from '@/features/system-settings/useBranding'
import { isApiError, validationErrors } from '@/services/api'

interface LocationState {
  from?: string
}

export function LoginPage() {
  const { status, login } = useAuth()
  const logoUrl = useBranding()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    meta: { skipErrorToast: true },
    onSuccess: () => navigate(from, { replace: true }),
  })

  if (status === 'authenticated') {
    return <Navigate to={from} replace />
  }

  // Credenciales inválidas (401) también traen `errors.email`.
  const error = mutation.error
  const fieldErrors = isApiError(error) && error.errors ? error.errors : validationErrors(error)
  const generalError = isApiError(error) && !error.errors ? error.message : null

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          {logoUrl && <img src={logoUrl} alt="" className="mb-3" style={{ maxHeight: 72, maxWidth: '100%' }} />}
          <h1 className="h2 mb-0">SyncTaller</h1>
          <div className="text-secondary">Gestión del taller</div>
        </div>
        <form className="card card-md" onSubmit={handleSubmit} noValidate>
          <div className="card-body">
            <h2 className="h3 text-center mb-4">Iniciar sesión</h2>
            {generalError && (
              <div className="alert alert-danger" role="alert">
                {generalError}
              </div>
            )}
            <TextField
              label="Email"
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              errors={fieldErrors}
            />
            <TextField
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              errors={fieldErrors}
            />
            <div className="form-footer">
              <button type="submit" className="btn btn-primary w-100" disabled={mutation.isPending}>
                {mutation.isPending && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
                Ingresar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
