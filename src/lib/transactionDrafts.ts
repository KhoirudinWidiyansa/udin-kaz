export type TransactionDraftSource = 'manual' | 'receipt' | 'bank'

export interface TransactionDraft {
  id?: string
  source: TransactionDraftSource
  sourceLabel: string
  nominal?: number
  kategori?: string
  nama?: string
  tanggal?: string
  catatan?: string
}

export interface StoredTransactionDraft extends TransactionDraft {
  id: string
  createdAt: string
}

export function createStoredDraft(draft: TransactionDraft): StoredTransactionDraft {
  return {
    ...draft,
    id: draft.id || buildDraftId(draft),
    createdAt: new Date().toISOString(),
  }
}

export function getDraftFingerprint(draft: TransactionDraft): string {
  return [
    draft.source,
    draft.nominal || 0,
    draft.kategori || '',
    draft.tanggal || '',
    draft.catatan || '',
  ].join('|')
}

function buildDraftId(draft: TransactionDraft): string {
  const fingerprint = getDraftFingerprint(draft)
  let hash = 0

  for (let i = 0; i < fingerprint.length; i += 1) {
    hash = ((hash << 5) - hash + fingerprint.charCodeAt(i)) | 0
  }

  return `draft-${draft.source}-${Math.abs(hash)}-${Date.now()}`
}
