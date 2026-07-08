// Libs for third party
import { Suspense } from 'react';

// Internal
import { APP_NAME } from '@repo/shared';
import { LoginForm } from '@/components/auth/login-form';

/** Shared login screen used as the app entry point. */
export const LoginScreen = (): React.JSX.Element => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Welcome
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
      </div>
      <Suspense
        fallback={
          <div className="h-[280px] w-full max-w-md rounded-lg border border-border" />
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  </div>
);
