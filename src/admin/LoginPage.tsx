import { useState } from 'react';
import type { FormEvent } from 'react';
import { adminApi } from './adminApi';
import { describeError } from './messages';

export function LoginPage({ notice, onLoggedIn }: { notice?: string; onLoggedIn: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(notice ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { username: name } = await adminApi.login(username.trim(), password);
      onLoggedIn(name);
    } catch (e) {
      setError(describeError(e));
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login">
      <form className="login__card" onSubmit={submit}>
        <p className="eyebrow-label">Diplay Clothes</p>
        <h1 className="login__title">Masuk ke Admin</h1>

        <label className="field">
          <span className="field__label">Username</span>
          <input
            className="input"
            autoComplete="username"
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <p className="banner banner--error" role="alert" hidden={!error}>
          {error}
        </p>
        <button className="btn btn--primary" disabled={busy}>
          {busy ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>
    </main>
  );
}
