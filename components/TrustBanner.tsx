import { Cloud, Trash2, EyeOff, Lock } from 'lucide-react'

const GUARANTEES = [
  { icon: <Cloud   size={14} />, label: 'Analyse Cloud',          desc: 'Aucune installation requise' },
  { icon: <Trash2  size={14} />, label: 'Suppression immédiate',  desc: 'Fichiers effacés après analyse' },
  { icon: <EyeOff  size={14} />, label: 'No-logs',                desc: 'Aucune donnée conservée' },
  { icon: <Lock    size={14} />, label: 'Chiffrement TLS',        desc: 'Transit sécurisé end-to-end' },
]

export default function TrustBanner() {
  return (
    <div className="border border-[#242424] rounded-xl bg-[#0D0D0D] px-6 py-4">
      <div className="flex flex-wrap items-center justify-center gap-6">
        {GUARANTEES.map((g) => (
          <div key={g.label} className="flex items-center gap-2">
            <span className="text-[#D4A017]">{g.icon}</span>
            <div>
              <span className="text-sm font-medium text-white">{g.label}</span>
              <span className="text-xs text-[#555555] ml-1.5 hidden sm:inline">{g.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
