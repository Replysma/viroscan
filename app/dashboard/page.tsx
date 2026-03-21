'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import FileUploader from '@/components/FileUploader'
import FileTree from '@/components/FileTree'
import FilePreview from '@/components/FilePreview'
import HistoryPanel from '@/components/HistoryPanel'
import { ArchiveInfo, ArchiveEntry } from '@/types'
import { Archive, History, Upload, ShieldCheck } from 'lucide-react'
import ScanBadge from '@/components/ScanBadge'
import Link from 'next/link'

type Panel = 'upload' | 'history'

export default function DashboardPage() {
  const [activePanel, setActivePanel] = useState<Panel>('upload')
  const [currentArchive, setCurrentArchive] = useState<ArchiveInfo | null>(null)
  const [selectedFile, setSelectedFile] = useState<ArchiveEntry | null>(null)
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    // Persistent session ID for anonymous users
    let sid = localStorage.getItem('zipview_session')
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem('zipview_session', sid)
    }
    setSessionId(sid)
  }, [])

  const handleUploadSuccess = useCallback((archive: ArchiveInfo) => {
    setCurrentArchive(archive)
    setSelectedFile(null)
    setActivePanel('upload')
  }, [])

  const handleFileSelect = useCallback((file: ArchiveEntry) => {
    if (!file.isDirectory) {
      setSelectedFile(file)
    }
  }, [])

  const handleLoadFromHistory = useCallback((archive: ArchiveInfo) => {
    setCurrentArchive(archive)
    setSelectedFile(null)
    setActivePanel('upload')
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <aside className="w-56 border-r border-[#242424] flex flex-col bg-[#0A0A0A] flex-shrink-0">
          <div className="p-3 space-y-1">
            <button
              onClick={() => setActivePanel('upload')}
              className={`nav-item ${activePanel === 'upload' ? 'active' : ''}`}
            >
              <Upload size={16} /> Importer
            </button>
            <Link
              href="/scan"
              className="nav-item"
            >
              <ShieldCheck size={16} /> Analyse Virus
            </Link>
            <button
              onClick={() => setActivePanel('history')}
              className={`nav-item ${activePanel === 'history' ? 'active' : ''}`}
            >
              <History size={16} /> Historique
            </button>
          </div>

          {/* Archive info in sidebar */}
          {currentArchive && (
            <div className="p-3 mt-2 border-t border-[#242424]">
              <p className="text-xs text-[#666666] uppercase tracking-wider mb-2">En cours</p>
              <div className="card p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Archive size={14} className="text-[#D4A017] flex-shrink-0" />
                  <span className="text-xs text-[#B3B3B3] truncate">{currentArchive.name}</span>
                </div>
                <p className="text-xs text-[#666666]">{currentArchive.fileCount} fichier{currentArchive.fileCount > 1 ? 's' : ''}</p>
                <p className="text-xs text-[#444444] uppercase font-medium mb-1">
                  {currentArchive.type.toUpperCase()}
                </p>
                <ScanBadge
                  archiveId={currentArchive.id}
                  initialScanStatus="pending"
                  autoStart
                  compact
                />
              </div>
            </div>
          )}
        </aside>

        {/* Main area */}
        <main className="flex-1 flex overflow-hidden">
          {activePanel === 'history' ? (
            <div className="flex-1 overflow-auto p-6">
              <HistoryPanel
                sessionId={sessionId}
                onLoad={handleLoadFromHistory}
              />
            </div>
          ) : (
            <>
              {/* Left: upload + tree */}
              <div className={`flex flex-col border-r border-[#242424] overflow-hidden transition-all
                ${currentArchive ? 'w-80 flex-shrink-0' : 'flex-1'}`}>

                {!currentArchive ? (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="w-full max-w-lg">
                      <FileUploader
                        sessionId={sessionId}
                        onSuccess={handleUploadSuccess}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Compact uploader */}
                    <div className="p-3 border-b border-[#242424]">
                      <FileUploader
                        sessionId={sessionId}
                        onSuccess={handleUploadSuccess}
                        compact
                      />
                    </div>
                    {/* File tree */}
                    <div className="flex-1 overflow-auto">
                      <FileTree
                        archive={currentArchive}
                        selectedPath={selectedFile?.path}
                        onSelect={handleFileSelect}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Right: file preview */}
              {currentArchive && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  {selectedFile ? (
                    <FilePreview
                      archiveId={currentArchive.id}
                      file={selectedFile}
                      onClose={() => setSelectedFile(null)}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center mx-auto">
                          <Archive size={28} className="text-[#444444]" />
                        </div>
                        <p className="text-[#666666] text-sm">Sélectionnez un fichier pour le prévisualiser</p>
                      </div>
                      {/* Badge scan complet */}
                      <div className="w-full max-w-sm">
                        <ScanBadge
                          archiveId={currentArchive.id}
                          initialScanStatus="pending"
                          autoStart={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
