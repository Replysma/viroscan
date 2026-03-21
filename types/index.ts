// ─── Archive types ───────────────────────────────────────────────────────────

export interface ArchiveEntry {
  name: string        // filename only
  path: string        // full path inside archive
  isDirectory: boolean
  size: number        // uncompressed size
  compressedSize: number
  mimeType: string
  lastModified?: Date
  children?: ArchiveEntry[]
}

export interface ArchiveInfo {
  id: string
  name: string
  type: 'zip' | 'rar'
  totalSize: number
  fileCount: number
  dirCount: number
  uploadedAt: string
  expiresAt: string
  tree: ArchiveEntry[]
}

// ─── User types ───────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  plan: 'free' | 'premium'
  createdAt: string
}

export interface AuthPayload {
  userId: string
  email: string
  plan: 'free' | 'premium'
}

// ─── API response types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface UploadResponse {
  id: string
  name: string
  type: 'zip' | 'rar'
  fileCount: number
  totalSize: number
  expiresAt: string
}

export interface PreviewResponse {
  path: string
  content: string
  mimeType: string
  isText: boolean
  isBinary: boolean
  size: number
}

// ─── File tree UI types ───────────────────────────────────────────────────────

export interface TreeNode extends ArchiveEntry {
  isOpen?: boolean
  isSelected?: boolean
  depth?: number
}

export type PreviewType = 'text' | 'image' | 'pdf' | 'video' | 'audio' | 'unsupported'

export interface PlanLimits {
  maxFileSizeMB: number
  historyHours: number
  maxFiles: number
}

export const PLAN_LIMITS: Record<'free' | 'premium', PlanLimits> = {
  free: {
    maxFileSizeMB: 50,
    historyHours: 2,
    maxFiles: 10,
  },
  premium: {
    maxFileSizeMB: 500,
    historyHours: 48,
    maxFiles: 100,
  },
}
