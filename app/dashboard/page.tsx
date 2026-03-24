'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/Header'
import FileUploader from '@/components/FileUploader'
import FileTree from '@/components/FileTree'
import FilePreview from '@/components/FilePreview'
import HistoryPanel from '@/components/HistoryPanel'
import { ArchiveInfo, ArchiveEntry } from '@/types'
import { Archive, History, Upload, ShieldCheck, Eye, ShieldAlert } from 'lucide-react'
import ScanBadge from '@/components/ScanBadge'
import Link from 'next/link'
import PhishingPanel from '@/components/PhishingPanel'

type Panel = 'upload' | 'history' | 'secure-info' | 'phishing'

export default function DashboardPage() {
  const [activePanel, setActivePanel] = useState<Panel>('upload')
  const [currentArchive, setCurrentArchive] = useState<ArchiveInfo | null>(null)
  const [selectedFile, setSelectedFile] = useState<ArchiveEntry | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  // Stocke le buffer de l'archive courante pour extraction client-side
  const fileBufferRef = useRef<ArrayBuffer | null>(null)

  useEffect(() => {
    // Persistent session ID for anonymous users
    let sid = localStorage.getItem('zipview_session')
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem('zipview_session', sid)
    }
    setSessionId(sid)
  }, [])

  const handleUploadSuccess = useCallback((archive: ArchiveInfo, fileBuffer: ArrayBuffer) => {
    fileBufferRef.current = fileBuffer
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
    fileBufferRef.current = null // archive serveur, pas de buffer local
    setCurrentArchive(archive)
    setSelectedFile(null)
    setActivePanel('upload')
  }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <aside className="w-56 border-r border-white/[0.05] flex flex-col bg-[#060606] flex-shrink-0">
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
            <button
              onClick={() => setActivePanel('secure-info')}
              className={`nav-item ${activePanel === 'secure-info' ? 'active' : ''}`}
            >
              <Eye size={16} /> Aperçu Sécurisé
            </button>
            <button
              onClick={() => setActivePanel('phishing')}
              className={`nav-item ${activePanel === 'phishing' ? 'active' : ''}`}
            >
              <ShieldAlert size={16} /> Anti-Phishing
            </button>
          </div>

          {/* Archive info in sidebar */}
          {currentArchive && (
            <div className="p-3 mt-2 border-t border-white/[0.04]">
              <p className="text-xs text-[#444444] uppercase tracking-wider mb-2">En cours</p>
              <div className="card p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Archive size={14} className="text-[#FFD700] flex-shrink-0" />
                  <span className="text-xs text-[#AAAAAA] truncate">{currentArchive.name}</span>
                </div>
                <p className="text-xs text-[#555555]">{currentArchive.fileCount} fichier{currentArchive.fileCount > 1 ? 's' : ''}</p>
                <p className="text-xs text-[#333333] uppercase font-medium mb-1">
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
          ) : activePanel === 'secure-info' ? (
            <SecurePreviewInfo />
          ) : activePanel === 'phishing' ? (
            <PhishingPanel />
          ) : (
            <>
              {/* Left: upload + tree */}
              <div className={`flex flex-col border-r border-white/[0.05] overflow-hidden transition-all
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
                    <div className="p-3 border-b border-white/[0.05]">
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
                      archiveType={currentArchive.type}
                      fileBuffer={fileBufferRef.current ?? undefined}
                      file={selectedFile}
                      onClose={() => setSelectedFile(null)}
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.06] rounded-3xl flex items-center justify-center mx-auto">
                          <Archive size={28} className="text-[#333333]" />
                        </div>
                        <p className="text-[#444444] text-sm">Sélectionnez un fichier pour le prévisualiser</p>
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

// ─── Panel d'info Aperçu Sécurisé ────────────────────────────────────────────

function SecurePreviewInfo() {
  const formats = [
    { label: 'Word',   exts: 'DOCX, DOC',      icon: '📝', detail: 'Converti en HTML côté serveur via Mammoth.js' },
    { label: 'Excel',  exts: 'XLSX, XLS, ODS, CSV', icon: '📊', detail: 'Rendu en tableau HTML via SheetJS' },
    { label: 'PDF',    exts: 'PDF',             icon: '📄', detail: 'Affiché via iframe sandboxée (no scripts)' },
    { label: 'Code',   exts: '50+ extensions',  icon: '💻', detail: 'Texte brut avec numérotation des lignes' },
    { label: 'Images', exts: 'JPG, PNG, WebP, SVG, GIF…', icon: '🖼️', detail: 'Rendu natif, referrer bloqué' },
  ]

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Mode Aperçu Sécurisé</h2>
          <p className="text-[#666666] text-sm">
            Tous les fichiers sont prévisualisés sans jamais être exécutés sur votre machine.
            Les documents Office sont convertis côté serveur en HTML inerte avant d'être affichés.
          </p>
        </div>

        <div className="grid gap-3">
          {formats.map(f => (
            <div key={f.label} className="card p-4 flex items-start gap-4">
              <span className="text-2xl">{f.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium text-sm">{f.label}</span>
                  <span className="text-[10px] text-[#555555] bg-white/[0.04] px-2 py-0.5 rounded font-mono">{f.exts}</span>
                </div>
                <p className="text-xs text-[#444444]">{f.detail}</p>
              </div>
              <span className="text-emerald-400 text-xs flex-shrink-0">🔒 Sûr</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
          <p className="text-xs font-semibold text-[#FFD700] uppercase tracking-wider">Garanties de sécurité</p>
          <ul className="space-y-2 text-xs text-[#666666]">
            <li>• Les documents Office ne sont <strong className="text-white">jamais exécutés</strong> — convertis en HTML pur côté serveur</li>
            <li>• L'HTML est <strong className="text-white">sanitisé</strong> (scripts, onclick, iframes supprimés)</li>
            <li>• Rendu dans un <code className="bg-white/[0.04] px-1 rounded">{'<iframe sandbox="">'}</code> — aucun JS ne peut s'exécuter</li>
            <li>• <code className="bg-white/[0.04] px-1 rounded">referrerPolicy="no-referrer"</code> sur toutes les ressources</li>
            <li>• Images converties en <strong className="text-white">data-URI</strong> — aucune requête externe possible</li>
          </ul>
        </div>

        <p className="text-xs text-[#444444] text-center">
          Pour prévisualiser un fichier : importez une archive ZIP/RAR → cliquez sur un fichier dans l'arborescence
        </p>
      </div>
    </div>
  )
}
