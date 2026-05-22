import { Elysia } from 'elysia'
import { toFolderId } from '../../../domain/folder/folder-id'
import { listFolderFiles } from '../../../application/list-folder-files'
import { PostgresFolderRepository } from '../../../infrastructure/repositories/postgres-folder-repository'
import { PostgresFileRepository } from '../../../infrastructure/repositories/postgres-file-repository'
import { folderIdParam, paginationQuery, folderFilesResponse } from '../schemas'

const folderRepo = new PostgresFolderRepository()
const fileRepo = new PostgresFileRepository()

export const filesRouter = new Elysia({ prefix: '/api/v1' })
  .get(
    '/folders/:id/files',
    async ({ params, query }) =>
      listFolderFiles(
        folderRepo,
        fileRepo,
        toFolderId(params.id),
        query.cursor ? BigInt(query.cursor) : undefined,
        query.limit,
      ),
    { params: folderIdParam, query: paginationQuery, response: { 200: folderFilesResponse } },
  )
