'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  ChevronRight, ChevronDown, Folder, FolderOpen,
  File, FileText, FileImage, FileCode, Film, Music,
  Archive, Download, Search, X
} from 'lucide-react'
import { ArchiveInfo, ArchiveEntry } from '@/types'
import { formatBytes, getFileIcon, isPreviewable } from '@/lib/utils'

interface Props {
  archive: ArchiveInfo
  selectedPath?: string
  onSelect: (file: ArchiveEntry) => void
}

export default function FileTree({ archive, selectedPath, onSelect }: Props) {
  const [openDirs, setOpenDirs] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const toggleDir = useCallback((path: string) => {
    setOpenDirs(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  // Flatten tree for search
  const allFiles = useMemo(() => {
    const result: ArchiveEntry[] = []
    const flatten = (entries: ArchiveEntry[]) => {
      for (const e of entries) {
        result.push(e)
        if (e.children) flatten(e.children)
      }
    }
    flatten(archive.tree)
    return result
  }, [archive.tree])

  const filteredFiles = useMemo(() => {
    if (!search) return null
    const q = search.toLowerCase()
    return allFiles.filter(f => !f.isDirectory && f.name.toLowerCase().includes(q))
  }, [search, allFiles])

  const handleDownload = (e: React.MouseEvent, entry: ArchiveEntry) => {
    e.stopPropagation()
    const url = `/api/files/${archive.id}/download?path=${encodeURIComponent(entry.path)}`
    const a = document.createElement('a')
    a.href = url
    a.download = entry.name
    a.click()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-2 mb-2">
          <Archive size={14} className="text-[#E1AD01] flex-shrink-0" />
          <span className="text-sm font-medium text-white truncate">{archive.name}</span>
        </div>
        <div className="flex gap-3 text-xs text-[#555555]">
          <span>{archive.fileCount} fichiers</span>
          <span>{archive.dirCount} dossiers</span>
          <span>{formatBytes(archive.totalSize)}</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[#1A1A1A]">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#555555]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input text-xs pl-7 pr-7 py-1.5"
            placeholder="Rechercher..."
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555555] hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tree / Search results */}
      <div className="flex-1 overflow-auto py-1">
        {filteredFiles ? (
          filteredFiles.length === 0 ? (
            <p className="text-center text-[#555555] text-xs py-6">Aucun fichier trouvé</p>
          ) : (
            filteredFiles.map(file => (
              <FileRow
                key={file.path}
                entry={file}
                depth={0}
                selected={file.path === selectedPath}
                onSelect={onSelect}
                onDownload={handleDownload}
              />
            ))
          )
        ) : (
          archive.tree.map(entry => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              openDirs={openDirs}
              selectedPath={selectedPath}
              onToggle={toggleDir}
              onSelect={onSelect}
              onDownload={handleDownload}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TreeNode({
  entry, depth, openDirs, selectedPath, onToggle, onSelect, onDownload,
}: {
  entry: ArchiveEntry
  depth: number
  openDirs: Set<string>
  selectedPath?: string
  onToggle: (path: string) => void
  onSelect: (f: ArchiveEntry) => void
  onDownload: (e: React.MouseEvent, f: ArchiveEntry) => void
}) {
  const isOpen = openDirs.has(entry.path)

  if (entry.isDirectory) {
    return (
      <div>
        <div
          className="tree-node flex items-center gap-1.5 px-2 py-1 cursor-pointer group"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => onToggle(entry.path)}
        >
          <span className="text-[#444444] flex-shrink-0">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="text-[#E1AD01] flex-shrink-0">
            {isOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
          </span>
          <span className="text-sm text-[#AAAAAA] truncate flex-1">{entry.name}</span>
          <button
            onClick={(e) => onDownload(e, entry)}
            className="opacity-0 group-hover:opacity-100 text-[#555555] hover:text-white flex-shrink-0 p-0.5"
            title="Télécharger le dossier en ZIP"
          >
            <Download size={12} />
          </button>
        </div>
        {isOpen && entry.children?.map(child => (
          <TreeNode
            key={child.path}
            entry={child}
            depth={depth + 1}
            openDirs={openDirs}
            selectedPath={selectedPath}
            onToggle={onToggle}
            onSelect={onSelect}
            onDownload={onDownload}
          />
        ))}
      </div>
    )
  }

  return (
    <FileRow
      entry={entry}
      depth={depth}
      selected={entry.path === selectedPath}
      onSelect={onSelect}
      onDownload={onDownload}
    />
  )
}

function FileRow({
  entry, depth, selected, onSelect, onDownload
}: {
  entry: ArchiveEntry
  depth: number
  selected: boolean
  onSelect: (f: ArchiveEntry) => void
  onDownload: (e: React.MouseEvent, f: ArchiveEntry) => void
}) {
  const { icon, color } = getFileIcon(entry.name, entry.mimeType)
  const canPreview = isPreviewable(entry.name)

  return (
    <div
      className={`tree-node flex items-center gap-1.5 px-2 py-1 cursor-pointer group
        ${selected ? 'selected' : ''}`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={() => onSelect(entry)}
      title={entry.path}
    >
      <span className="w-3.5 flex-shrink-0" />
      <span className={`flex-shrink-0 ${color}`}>{icon}</span>
      <span className={`text-sm truncate flex-1 ${selected ? 'text-[#E1AD01]' : 'text-[#AAAAAA]'}`}>
        {entry.name}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0">
        {canPreview && (
          <span className="opacity-0 group-hover:opacity-100 text-xs text-[#555555] bg-[#131313] px-1.5 py-0.5 rounded">
            aperçu
          </span>
        )}
        <span className="text-xs text-[#444444]">{formatBytes(entry.size)}</span>
        <button
          onClick={(e) => onDownload(e, entry)}
          className="opacity-0 group-hover:opacity-100 text-[#555555] hover:text-white p-0.5"
          title="Télécharger le fichier"
        >
          <Download size={12} />
        </button>
      </div>
    </div>
  )
}
