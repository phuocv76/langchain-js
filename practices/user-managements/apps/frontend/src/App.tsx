// Libs for third party
import { useState } from 'react';

// Internal
import { AppLayout } from '@/components/app-layout';
import { LoginPage } from '@/components/login-page';
import { AppShell } from '@/providers/app-shell';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

/** Root application — login gate then dashboard / assistant. */
export default function App(): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [view, setView] = useState<'dashboard' | 'assistant'>('dashboard');

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <AppShell user={user}>
      <AppLayout
        user={user}
        view={view}
        onViewChange={setView}
        onSignOut={() => setUser(null)}
      />
    </AppShell>
  );
}
