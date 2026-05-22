import { Elysia } from 'elysia'
import cors from '@elysiajs/cors'
import swagger from '@elysiajs/swagger'
import { foldersRouter } from './presentation/http/routes/folders'
import { filesRouter } from './presentation/http/routes/files'
import { searchRouter } from './presentation/http/routes/search'
import { FolderNotFoundError, InvalidQueryError } from './domain/errors'

export function createApp() {
  return new Elysia()
    .onError(({ error, code, set }) => {
      if (error instanceof FolderNotFoundError) {
        set.status = 404
        return { error: { code: error.code, message: error.message } }
      }
      if (error instanceof InvalidQueryError) {
        set.status = 422
        return { error: { code: error.code, message: error.message } }
      }
      if (code === 'VALIDATION') {
        set.status = 422
        return { error: { code: 'VALIDATION_ERROR', message: error.message } }
      }
      console.error('Unhandled error:', error)
      set.status = 500
      return { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }
    })
    .use(cors({ origin: true }))
    .use(swagger({
      path: '/api/v1/swagger',
      scalarConfig: {
        spec: { url: '/api/v1/swagger/json' },
      },
      documentation: {
        info: { title: 'Windows Explorer API', version: '1.0.0' },
      },
    }))
    .use(foldersRouter)
    .use(filesRouter)
    .use(searchRouter)
}
