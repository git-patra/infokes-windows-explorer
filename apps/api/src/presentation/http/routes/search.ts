import { Elysia } from 'elysia'
import { searchFolders } from '../../../application/search-folders'
import { PostgresFolderRepository } from '../../../infrastructure/repositories/postgres-folder-repository'
import { PostgresFileRepository } from '../../../infrastructure/repositories/postgres-file-repository'
import { searchQuery, searchResponse } from '../schemas'

const folderRepo = new PostgresFolderRepository()
const fileRepo = new PostgresFileRepository()

export const searchRouter = new Elysia({ prefix: '/api/v1' })
  .get(
    '/search',
    async ({ query }) => searchFolders(folderRepo, fileRepo, query.q, query.limit),
    { query: searchQuery, response: { 200: searchResponse } },
  )
