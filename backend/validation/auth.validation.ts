import { z } from 'zod';

const emailSchema = z
  .string({
    required_error: 'Email is required',
    invalid_type_error: 'Email must be a string',
  })
  .email('Invalid email format')
  .transform((value) => value.trim().toLowerCase());

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters long'),
    role: z.enum(['graduate', 'company', 'admin'], {
      required_error: 'Role is required',
    }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({
        required_error: 'Refresh token is required',
      })
      .min(1, 'Refresh token is required'),
  }),
});

export const requestEmailVerificationSchema = z.object({
  body: z.object({}),
});

export const requestPasswordResetSchema = z.object({
  body: z.object({
    email: emailSchema,
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z
      .string({
        required_error: 'Reset token is required',
      })
      .min(1, 'Reset token is required'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters long'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z
      .string({
        required_error: 'Current password is required',
      })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({
        required_error: 'New password is required',
      })
      .min(8, 'New password must be at least 8 characters long'),
  }),
});
