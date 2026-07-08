// Libs for third party
import { redirect } from 'next/navigation';

// Internal
import { LOGIN_PATH } from '@/lib/auth/constants';

/** Backwards-compatible alias for the login page at `/`. */
const LegacyLoginPage = (): never => {
  redirect(LOGIN_PATH);
};

export default LegacyLoginPage;
