// Libs for third party
import { z } from 'zod';

export const loginSchema = z.object({
  idToken: z.string().min(1, 'Missing Firebase ID token'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type AuthSession = {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
};
