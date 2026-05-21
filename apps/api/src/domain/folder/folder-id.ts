// Branded type to prevent accidentally passing a plain number as a FolderId
export type FolderId = bigint & { readonly __brand: 'FolderId' }

export function toFolderId(id: bigint | number | string): FolderId {
  return BigInt(id) as FolderId
}
