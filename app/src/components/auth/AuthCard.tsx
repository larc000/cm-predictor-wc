import type { FormEvent } from 'react';
import type { AuthMode } from '@/lib/types';

type AuthForm = {
  name: string;
  email: string;
  password: string;
};

type AuthCardProps = {
  authMode: AuthMode;
  allowedEmailDomain: string;
  form: AuthForm;
  error: string;
  message: string;
  onModeChange: (mode: AuthMode) => void;
  onFormChange: (form: AuthForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthCard({
  authMode,
  allowedEmailDomain,
  form,
  error,
  message,
  onModeChange,
  onFormChange,
  onSubmit
}: AuthCardProps) {
  return (
    <section className="auth-card">
      <h2>{authMode === 'sign-in' ? 'Ingresar' : 'Crear cuenta'}</h2>
      <p className="section-copy">Usa tu correo corporativo @{allowedEmailDomain}.</p>

      <form className="form-stack" onSubmit={onSubmit}>
        {authMode === 'sign-up' ? (
          <div className="form-field">
            <label htmlFor="name">Nombre</label>
            <input
              id="name"
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              required
            />
          </div>
        ) : null}

        <div className="form-field">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => onFormChange({ ...form, email: event.target.value })}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) => onFormChange({ ...form, password: event.target.value })}
            required
          />
        </div>

        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="success">{message}</p> : null}

        <button className="button" type="submit">
          {authMode === 'sign-in' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </form>

      <button
        className="button subtle"
        type="button"
        onClick={() => onModeChange(authMode === 'sign-in' ? 'sign-up' : 'sign-in')}
      >
        {authMode === 'sign-in' ? 'Crear cuenta nueva' : 'Ya tengo cuenta'}
      </button>
    </section>
  );
}
