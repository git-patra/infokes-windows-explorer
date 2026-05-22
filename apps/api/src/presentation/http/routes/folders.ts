import { Elysia } from 'elysia'
import { toFolderId } from '../../../domain/folder/folder-id'
import { getFolderTree } from '../../../application/get-folder-tree'
import { getFolderChildren } from '../../../application/get-folder-children'
import { getFolderById } from '../../../application/get-folder-by-id'
import { PostgresFolderRepository } from '../../../infrastructure/repositories/postgres-folder-repository'
import {
  folderIdParam,
  paginationQuery,
  treeQuery,
  treeResponse,
  folderDetailResponse,
  folderChildrenResponse,
} from '../schemas'

const folderRepo = new PostgresFolderRepository()

export const foldersRouter = new Elysia({ prefix: '/api/v1/folders' })
  .get(
    '/tree',
    async ({ query }) => getFolderTree(folderRepo, query.depth),
    { query: treeQuery, response: { 200: treeResponse } },
  )
  .get(
    '/:id',
    async ({ params }) => getFolderById(folderRepo, toFolderId(params.id)),
    { params: folderIdParam, response: { 200: folderDetailResponse } },
  )
  .get(
    '/:id/children',
    async ({ params, query }) =>
      getFolderChildren(
        folderRepo,
        toFolderId(params.id),
        query.cursor ? BigInt(query.cursor) : undefined,
        query.limit,
      ),
    { params: folderIdParam, query: paginationQuery, response: { 200: folderChildrenResponse } },
  )
