export interface Folder {
  id: bigint
  parentId: bigint | null
  name: string
  path: string       // ltree string e.g. "1.4.7"
  depth: number
  createdAt: Date
  updatedAt: Date
}
