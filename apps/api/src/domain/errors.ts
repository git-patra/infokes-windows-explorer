export class FolderNotFoundError extends Error {
  readonly code = 'FOLDER_NOT_FOUND'
  constructor(id: bigint | string) {
    super(`Folder not found: ${id}`)
  }
}

export class InvalidQueryError extends Error {
  readonly code = 'INVALID_QUERY'
  constructor(message: string) {
    super(message)
  }
}
