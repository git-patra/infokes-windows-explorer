export interface File {
  id: bigint
  folderId: bigint
  name: string
  sizeBytes: bigint
  mimeType: string | null
  createdAt: Date
}
