import { useState } from 'react'

/**
 * A reusable checkbox grid over a module catalog — the one piece of UI
 * every "assign this staffer a subset of modules" flow shares (platform
 * staff editing PlatformModule, hospital staff editing HospitalModule).
 * Kept dumb on purpose: it holds no fetch/save logic of its own, just a
 * local draft + a Save button that calls back with the final list — the
 * two callers (SuperAdminPage, StaffTeamPage) each own their own API
 * call and error handling, which differ (super-staff vs clinic-staff
 * endpoints) even though the grid itself doesn't.
 */
export function PermissionEditor({
  modules,
  selected,
  onSave,
  saving,
}: {
  modules: { id: string; label: string }[]
  selected: string[]
  onSave: (permissions: string[]) => void
  saving?: boolean
}) {
  const [draft, setDraft] = useState<Set<string>>(new Set(selected))
  const dirty = draft.size !== selected.length || selected.some((p) => !draft.has(p))

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {modules.map((m) => (
          <label key={m.id} className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={draft.has(m.id)}
              onChange={() => toggle(m.id)}
              className="h-4 w-4 rounded border-[var(--color-border-strong)] accent-[var(--color-brand-600)]"
            />
            {m.label}
          </label>
        ))}
      </div>
      <button
        disabled={!dirty || saving}
        onClick={() => onSave([...draft])}
        className="press-scale w-fit rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] px-3.5 py-1.5 text-[12px] font-bold text-[var(--color-text)] disabled:opacity-40"
      >
        {saving ? 'Saving…' : dirty ? 'Save permissions' : 'Saved'}
      </button>
    </div>
  )
}
