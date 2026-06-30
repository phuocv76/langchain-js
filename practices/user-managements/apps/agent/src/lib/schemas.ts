// Libs for third party
import { z } from 'zod';

export const emptyObjectSchema = z.object({});
export const userIdSchema = z.string();
export const userNameSchema = z.string().min(1).max(120);
export const userEmailSchema = z.string().email();
export const toolEmailInputSchema = z.string().min(1).max(255);
export const userBioSchema = z.string().max(8000);
export const userStatusSchema = z.enum(['active', 'inactive']);
export const dateOfBirthSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dateOfBirthPatchSchema = z
  .union([dateOfBirthSchema, z.literal(''), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return undefined;
    if (v === '') return null;
    return v;
  });

export const bioPatchSchema = z
  .union([userBioSchema, z.literal(''), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return undefined;
    if (v === '') return null;
    const t = v.trim();
    return t === '' ? null : t;
  });

export const createUserToolInputSchema = z.object({
  name: userNameSchema,
  email: toolEmailInputSchema,
  date_of_birth: dateOfBirthSchema,
  bio: userBioSchema.optional(),
});

export const updateUserToolInputSchema = z.object({
  id: userIdSchema,
  name: z.string().optional(),
  date_of_birth: dateOfBirthPatchSchema,
  bio: bioPatchSchema,
  status: userStatusSchema.optional(),
});

export const updateMyProfileToolInputSchema = z.object({
  name: userNameSchema.optional(),
  date_of_birth: dateOfBirthPatchSchema,
  bio: bioPatchSchema,
});

export const deleteUserToolInputSchema = z.object({
  id: userIdSchema,
});

export const findUserByEmailSchema = z.object({
  email: toolEmailInputSchema,
});

export const knowledgeQuestionSchema = z.object({
  question: z.string().min(1),
});

export const addKnowledgeSchema = z.object({
  content: z.string().min(1),
});
