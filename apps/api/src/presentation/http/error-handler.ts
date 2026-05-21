import type { Elysia } from 'elysia'
import { FolderNotFoundError, InvalidQueryError } from '../../domain/errors'

export function withErrorHandler<T extends Elysia<any, any, any, any, any, any>>(app: T) {
  return app.onError(({ error, set }) => {
    if (error instanceof FolderNotFoundError) {
      set.status = 404
      return { error: { code: error.code, message: error.message } }
    }
    if (error instanceof InvalidQueryError) {
      set.status = 400
      return { error: { code: error.code, message: error.message } }
    }
    // Validation errors from Elysia/TypeBox
    const msg = (error as { message?: string }).message
    if (msg?.includes('Validation')) {
      set.status = 422
      return { error: { code: 'VALIDATION_ERROR', message: msg } }
    }
    console.error('Unhandled error:', error)
    set.status = 500
    return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
  })
}
