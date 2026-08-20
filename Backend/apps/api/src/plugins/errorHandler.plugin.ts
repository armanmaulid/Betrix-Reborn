import { FastifyPluginAsync, FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from '@betrix/core';
import { env } from '@betrix/config';

const errorHandlerPluginCallback: FastifyPluginAsync = async (fastify) => {
  // 1. Custom Uniform 404 Handler (ADR-31)
  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`
      }
    });
  });

  // 2. Global Error Handler (ADR-31 & ADR-38)
  fastify.setErrorHandler((error: FastifyError | AppError | Error, request, reply) => {
    // Domain AppError (Custom Status Codes & Envelopes)
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code || error.name || 'APP_ERROR',
          message: error.message,
          ...(error.details ? { details: error.details } : {})
        }
      });
    }

    // Fastify & TypeBox Validation Errors
    if ('validation' in error && error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Request validation failed.',
          details: error.validation
        }
      });
    }

    // Fastify Rate Limit Error (429)
    if ('statusCode' in error && error.statusCode === 429) {
      return reply.status(429).send({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message || 'Too many requests. Please slow down and try again later.'
        }
      });
    }

    // Fastify Standard HTTP Errors (401, 403, 404, etc.)
    if ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code || 'HTTP_ERROR',
          message: error.message
        }
      });
    }

    // Unhandled / Unexpected 500 Errors
    request.log.error(error, '[Fastify Global Error Handler]');

    const isDev = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: isDev ? error.message : 'An unexpected error occurred. Please contact support.',
        ...(isDev && error.stack ? { details: error.stack } : {})
      }
    });
  });
};

export const errorHandlerPlugin = fp(errorHandlerPluginCallback, {
  name: 'error-handler'
});
