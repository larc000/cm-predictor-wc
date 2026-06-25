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
  const isSignIn = authMode === 'sign-in';

  return (
    <section className="auth-card">
      <div className="auth-card-heading">
        <div className="auth-heading-accent" aria-hidden="true" />
        <h2>{isSignIn ? 'Sign In' : 'Create Account'}</h2>
      </div>
      <p className="section-copy">
        {isSignIn ? (
          <>
            Use your corporate email <strong>@{allowedEmailDomain}</strong> to continue.
          </>
        ) : (
          <>
            Use your corporate email <strong>@{allowedEmailDomain}</strong> and set a new password.
          </>
        )}
      </p>

      <form className="form-stack" onSubmit={onSubmit}>
        {isSignIn ? null : (
          <div className="form-field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              placeholder="Jordan"
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              required
            />
          </div>
        )}

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder={`jordan@${allowedEmailDomain}`}
            value={form.email}
            onChange={(event) => onFormChange({ ...form, email: event.target.value })}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            minLength={8}
            placeholder="***********"
            value={form.password}
            onChange={(event) => onFormChange({ ...form, password: event.target.value })}
            required
          />
        </div>

        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="success">{message}</p> : null}

        <button className="button" type="submit">
          {isSignIn ? 'Sign In' : 'Sign Up'}
        </button>
      </form>

      <button
        className="button subtle"
        type="button"
        onClick={() => onModeChange(isSignIn ? 'sign-up' : 'sign-in')}
      >
        {isSignIn ? (
          <>
            Need an account? <span>Create Account</span>
          </>
        ) : (
          <>
            Already have an account? <span>Sign In</span>
          </>
        )}
      </button>
    </section>
  );
}
