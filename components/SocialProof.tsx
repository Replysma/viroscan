'use client'

import { useEffect, useState } from 'react'
import { Shield, Users, FileSearch } from 'lucide-react'

// Chiffres simulés avec légère variation pour donner un effet "live"
function useAnimatedCount(base: number, variance: number) {
  const [count, setCount] = useState(base)
  useEffect(() => {
    const jitter = Math.floor(Math.random() * variance)
    setCount(base + jitter)
    const interval = setInterval(() => {
      setCount(c => c + Math.floor(Math.random() * 3))
    }, 8000)
    return () => clearInterval(interval)
  }, [base, variance])
  return count.toLocaleString('fr-FR')
}

export default function SocialProof() {
  const files   = useAnimatedCount(1240, 80)
  const users   = useAnimatedCount(3400, 200)
  const threats = useAnimatedCount(187, 20)

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 py-6">
      <Stat icon={<FileSearch size={16} className="text-[#D4A017]" />} value={files}   label="fichiers analysés aujourd'hui" />
      <div className="w-px h-8 bg-[#242424] hidden sm:block" />
      <Stat icon={<Users      size={16} className="text-[#D4A017]" />} value={users}   label="utilisateurs actifs" />
      <div className="w-px h-8 bg-[#242424] hidden sm:block" />
      <Stat icon={<Shield     size={16} className="text-[#D4A017]" />} value={threats} label="menaces détectées cette semaine" />
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="font-bold text-white">{value}</span>
      <span className="text-[#666666]">{label}</span>
    </div>
  )
}
