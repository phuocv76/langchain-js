// Libs for third party
import { useState } from 'react';

// Internal
import { AppLayout } from '@/components/layout/app-layout';
import { LoginPage } from '@/components/auth/login-page';
import { AppShell } from '@/providers/app-shell';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
}

/** Root application — login gate then chat assistant. */
export default function App(): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <AppShell user={user}>
      <AppLayout user={user} onSignOut={() => setUser(null)} />
    </AppShell>
  );
}
