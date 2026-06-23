const PALETTE = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-violet-100 text-violet-800 border-violet-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-rose-100 text-rose-800 border-rose-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-brand-100 text-brand-700 border-brand-200',
    'bg-teal-100 text-teal-800 border-teal-200',
]

export function projectChipColor(code: string): string {
    let hash = 0
    for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash)
    }
    return PALETTE[Math.abs(hash) % PALETTE.length]
}
