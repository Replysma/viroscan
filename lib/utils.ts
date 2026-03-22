/**
 * Shared utility functions for UI and formatting
 */

import { FileText, FileImage, FileCode, File, Folder, Archive, Film, Music, FileJson } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import React from 'react'
import path from 'path'

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff < 0) return 'expired'

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 60) return `in ${minutes}m`
  if (hours < 24) return `in ${hours}h`
  return `in ${days}d`
}

// ─── File icons ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, { color: string; label: string }> = {
  // Text / docs
  txt: { color: 'text-slate-400', label: 'text' },
  md: { color: 'text-slate-300', label: 'text' },
  pdf: { color: 'text-red-400', label: 'pdf' },
  // Code
  js: { color: 'text-yellow-400', label: 'code' },
  ts: { color: 'text-blue-400', label: 'code' },
  jsx: { color: 'text-cyan-400', label: 'code' },
  tsx: { color: 'text-cyan-400', label: 'code' },
  py: { color: 'text-green-400', label: 'code' },
  rb: { color: 'text-red-400', label: 'code' },
  go: { color: 'text-teal-400', label: 'code' },
  rs: { color: 'text-orange-400', label: 'code' },
  java: { color: 'text-orange-400', label: 'code' },
  c: { color: 'text-blue-300', label: 'code' },
  cpp: { color: 'text-blue-400', label: 'code' },
  cs: { color: 'text-purple-400', label: 'code' },
  php: { color: 'text-indigo-400', label: 'code' },
  html: { color: 'text-orange-300', label: 'code' },
  css: { color: 'text-pink-400', label: 'code' },
  scss: { color: 'text-pink-300', label: 'code' },
  sh: { color: 'text-green-400', label: 'code' },
  // Data
  json: { color: 'text-yellow-300', label: 'json' },
  xml: { color: 'text-orange-300', label: 'code' },
  yaml: { color: 'text-teal-300', label: 'code' },
  yml: { color: 'text-teal-300', label: 'code' },
  csv: { color: 'text-green-300', label: 'text' },
  sql: { color: 'text-blue-300', label: 'code' },
  // Images
  jpg: { color: 'text-purple-400', label: 'image' },
  jpeg: { color: 'text-purple-400', label: 'image' },
  png: { color: 'text-purple-400', label: 'image' },
  gif: { color: 'text-pink-400', label: 'image' },
  svg: { color: 'text-orange-400', label: 'image' },
  webp: { color: 'text-purple-300', label: 'image' },
  // Media
  mp4: { color: 'text-red-400', label: 'video' },
  mp3: { color: 'text-green-400', label: 'audio' },
  // Archives
  zip: { color: 'text-blue-400', label: 'archive' },
  rar: { color: 'text-orange-400', label: 'archive' },
}

export function getFileIcon(filename: string, mimeType?: string): {
  icon: React.ReactElement
  color: string
} {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const info = ICON_MAP[ext]
  const color = info?.color || 'text-slate-500'

  const size = 14
  let icon: React.ReactElement

  if (info?.label === 'image') {
    icon = React.createElement(FileImage, { size, strokeWidth: 1.5 })
  } else if (info?.label === 'code' || info?.label === 'json') {
    icon = React.createElement(FileCode, { size, strokeWidth: 1.5 })
  } else if (info?.label === 'video') {
    icon = React.createElement(Film, { size, strokeWidth: 1.5 })
  } else if (info?.label === 'audio') {
    icon = React.createElement(Music, { size, strokeWidth: 1.5 })
  } else if (info?.label === 'archive') {
    icon = React.createElement(Archive, { size, strokeWidth: 1.5 })
  } else if (info?.label === 'text' || info?.label === 'pdf') {
    icon = React.createElement(FileText, { size, strokeWidth: 1.5 })
  } else {
    icon = React.createElement(File, { size, strokeWidth: 1.5 })
  }

  return { icon, color }
}

// ─── Preview helpers ──────────────────────────────────────────────────────────

export type PreviewType = 'text' | 'image' | 'pdf' | 'docx' | 'xlsx' | 'video' | 'audio' | 'unsupported'

const TEXT_EXTS = new Set([
  'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'js', 'ts', 'jsx', 'tsx',
  'css', 'scss', 'html', 'htm', 'py', 'rb', 'go', 'rs', 'java', 'c',
  'cpp', 'h', 'sh', 'bash', 'sql', 'env', 'gitignore', 'log',
  'ini', 'toml', 'cfg', 'conf', 'cs', 'php', 'vue', 'svelte',
])

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico', 'bmp'])
const DOCX_EXTS  = new Set(['docx', 'doc'])
const XLSX_EXTS  = new Set(['xlsx', 'xls', 'ods', 'csv'])

export function getPreviewType(filename: string): PreviewType {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (TEXT_EXTS.has(ext))  return 'text'
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (DOCX_EXTS.has(ext))  return 'docx'
  if (XLSX_EXTS.has(ext))  return 'xlsx'
  if (ext === 'pdf')        return 'pdf'
  if (['mp4', 'webm', 'ogg'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'flac'].includes(ext)) return 'audio'
  return 'unsupported'
}

export function isPreviewable(filename: string): boolean {
  const type = getPreviewType(filename)
  return type !== 'unsupported'
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
