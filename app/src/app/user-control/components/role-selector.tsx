import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Loader2 } from 'lucide-react'

export interface SystemRole {
    id: string
    name: string
}

function getRoleBadge(role: string): { bg: string; text: string; border: string } {
    switch (role) {
        case 'Admin':
            return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' }
        case 'Project Manager':
            return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
        case 'Employee':
            return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' }
        default:
            return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
    }
}

interface RoleSelectorProps {
    userId: string
    currentRoleId: string | undefined
    systemRoles: SystemRole[]
    onRoleChange: (userId: string, roleId: string) => Promise<void>
}

export function RoleSelector({ userId, currentRoleId, systemRoles, onRoleChange }: RoleSelectorProps) {
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({
        top: 0,
        left: 0,
        width: 0,
    })
    const currentRole = systemRoles.find((r) => r.id === currentRoleId)

    useEffect(() => {
        if (open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPos({
                top: rect.bottom + 4,
                left: rect.left,
                width: Math.max(rect.width, 220),
            })
        }
    }, [open])

    useEffect(() => {
        if (!open) return
        const handleScroll = () => setOpen(false)
        window.addEventListener('scroll', handleScroll, true)
        return () => window.removeEventListener('scroll', handleScroll, true)
    }, [open])

    const handleSelect = async (roleId: string) => {
        if (roleId === currentRoleId) {
            setOpen(false)
            return
        }
        setSaving(true)
        setOpen(false)
        try {
            await onRoleChange(userId, roleId)
        } finally {
            setSaving(false)
        }
    }

    if (saving) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving…</span>
            </div>
        )
    }

    return (
        <>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 w-full"
            >
                <span className="flex-1 text-left text-gray-700 truncate">
                    {currentRole?.name ?? 'No Role'}
                </span>
                <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open &&
                createPortal(
                    <>
                        <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
                        <div
                            className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
                            style={{
                                top: dropdownPos.top,
                                left: dropdownPos.left,
                                width: dropdownPos.width,
                                maxHeight: 300,
                                overflowY: 'auto',
                            }}
                        >
                            {systemRoles.map((role) => {
                                const badge = getRoleBadge(role.name)
                                const isSelected = role.id === currentRoleId
                                return (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => handleSelect(role.id)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                                            isSelected ? 'bg-brand-50 text-brand-700' : 'text-gray-700'
                                        }`}
                                    >
                                        <span
                                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border truncate ${badge.bg} ${badge.text} ${badge.border}`}
                                        >
                                            {role.name}
                                        </span>
                                        {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 ml-2" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </>,
                    document.body
                )}
        </>
    )
}
