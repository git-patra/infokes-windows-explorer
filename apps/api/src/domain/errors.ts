export class FolderNotFoundError extends Error {
  readonly code = 'FOLDER_NOT_FOUND'
  constructor(id: bigint | string) {
    super(`Folder not found: ${id}`)
    this.name = 'FolderNotFoundError'
  }
}

export class InvalidQueryError extends Error {
  readonly code = 'INVALID_QUERY'
  constructor(message: string) {
    super(message)
    this.name = 'InvalidQueryError'
  }
}
