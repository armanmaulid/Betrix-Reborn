import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  RegisterSchema,
  LoginSchema,
  GoogleOAuthSchema,
  VerifyEmailSchema,
  ResendVerificationSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema
} from '@betrix/application';
import { Type } from '@sinclair/typebox';

export const authRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const { useCases, services } = fastify.container;

  // 1. GET /captcha — Generate dynamic math challenge for anti-bruteforce
  fastify.get(
    '/captcha',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Generate Math CAPTCHA challenge',
        description:
          'Returns a dynamic math challenge ID and question for anti-bruteforce verification.'
      }
    },
    async (request, reply) => {
      const challenge = await services.captchaService.generateChallenge();
      return reply.send({
        success: true,
        data: challenge
      });
    }
  );

  // 2. POST /register — Register a new trader account
  fastify.post(
    '/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register new user account',
        body: RegisterSchema
      }
    },
    async (request, reply) => {
      const result = await useCases.registerUseCase.execute(request.body, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      // Sign JWT token containing session ID
      const jwtToken = services.authService.signJwt(
        result.user,
        result.session,
        fastify.jwt.sign.bind(fastify.jwt)
      );

      return reply.status(201).send({
        success: true,
        data: {
          token: jwtToken,
          sessionToken: result.token,
          user: result.user.toJSON(),
          ...(result.verificationToken ? { verificationToken: result.verificationToken } : {})
        }
      });
    }
  );

  // 3. POST /login — Authenticate with email, password, device & optional CAPTCHA
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Authenticate trader account',
        body: LoginSchema
      }
    },
    async (request, reply) => {
      const result = await useCases.loginUseCase.execute(request.body, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      const jwtToken = services.authService.signJwt(
        result.user,
        result.session,
        fastify.jwt.sign.bind(fastify.jwt)
      );

      return reply.send({
        success: true,
        data: {
          token: jwtToken,
          sessionToken: result.token,
          user: result.user.toJSON()
        }
      });
    }
  );

  // 4. POST /google — Google OAuth ID token authentication / auto-link
  fastify.post(
    '/google',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Google OAuth authentication',
        body: GoogleOAuthSchema
      }
    },
    async (request, reply) => {
      const result = await useCases.googleOAuthUseCase.execute(request.body, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      const jwtToken = services.authService.signJwt(
        result.user,
        result.session,
        fastify.jwt.sign.bind(fastify.jwt)
      );

      return reply.send({
        success: true,
        data: {
          token: jwtToken,
          sessionToken: result.token,
          user: result.user.toJSON(),
          isNewUser: result.isNewUser
        }
      });
    }
  );

  // 5. POST /verify-email — Verify account email with token
  fastify.post(
    '/verify-email',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Verify account email',
        body: VerifyEmailSchema
      }
    },
    async (request, reply) => {
      const result = await useCases.verifyEmailUseCase.execute(request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 6. POST /resend-verification — Resend verification email
  fastify.post(
    '/resend-verification',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Resend email verification token',
        body: ResendVerificationSchema
      }
    },
    async (request, reply) => {
      const result = await useCases.resendVerificationUseCase.execute(request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 7. POST /forgot-password — Request password reset token
  fastify.post(
    '/forgot-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Request password reset email',
        body: ForgotPasswordSchema
      }
    },
    async (request, reply) => {
      const result = await useCases.forgotPasswordUseCase.execute(request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 8. POST /reset-password — Reset password with verification token
  fastify.post(
    '/reset-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Reset password with token',
        body: ResetPasswordSchema
      }
    },
    async (request, reply) => {
      const result = await useCases.resetPasswordUseCase.execute(request.body);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 9. POST /stream-ticket — Issue single-use SSE ticket (ADR-18)
  fastify.post(
    '/stream-ticket',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Generate single-use SSE Stream Ticket',
        description:
          'Issues a one-time ticket (60s TTL) for authenticating browser EventSource SSE connections.',
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.getStreamTicketUseCase.execute(request.user.userId, 60);
      return reply.send({
        success: true,
        data: result
      });
    }
  );

  // 10. POST /logout — Revoke current session
  fastify.post(
    '/logout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Logout current session',
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      await useCases.revokeSessionUseCase.execute(request.user.sessionId, request.user.userId, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
      return reply.send({
        success: true,
        data: { message: 'Successfully logged out.' }
      });
    }
  );

  // 11. POST /logout-all — Revoke all active sessions across all devices
  fastify.post(
    '/logout-all',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['Auth'],
        summary: 'Logout all active sessions across all devices',
        security: [{ bearerAuth: [] }]
      }
    },
    async (request, reply) => {
      const result = await useCases.logoutAllUseCase.execute(request.user.userId, {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });
      return reply.send({
        success: true,
        data: result
      });
    }
  );
};
