// Libs for third party
import { useState } from 'react';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

interface LoginPageProps {
  readonly onLogin: (user: AuthUser) => void;
}

/** Simple login form backed by the user REST API. */
export const LoginPage = ({ onLogin }: LoginPageProps): React.JSX.Element => {
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('Abcd@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = (await response.json()) as {
        user?: AuthUser;
        error?: string;
      };

      if (!response.ok || !body.user) {
        setError(body.error ?? 'Login failed');
        return;
      }

      onLogin(body.user);
    } catch {
      setError('Could not reach the API. Is `pnpm dev` running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <form className="login__form" onSubmit={handleSubmit}>
        <h1>User Management</h1>
        <p className="login__hint">LangChain.js practice — sign in to chat</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="login__error">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
};
