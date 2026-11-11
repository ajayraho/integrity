import { useState } from 'react'
import { createPortal } from 'react-dom'
import MateriaOrb from './MateriaOrb'
import { getMateriaStats } from '../utils/storage'
import { DEFAULT_QUEST_XP, MISSED_QUEST_PENALTY } from '../game/config.js'
import { questXP } from '../game/engine.js'

/** Set a quest's XP and catalyser materia (jikanto's "New Quest" dialog). */
function QuestModal({ line, isTemplate = false, onSave, onClose }) {
    const materiaList = getMateriaStats()
    const [xp, setXp] = useState(String(questXP(line)))
    const [materiaId, setMateriaId] = useState(line.materiaId && materiaList.some(m => m.id === line.materiaId) ? line.materiaId : '')
    const selected = materiaList.find(m => m.id === materiaId)
    const base = Math.max(0, parseInt(xp, 10) || 0)
    const reward = Math.round(base * (selected?.multiplier || 1))

    const save = (e) => {
        e.preventDefault()
        onSave({ xp: base, materiaId: materiaId || null })
        onClose()
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <form onSubmit={save} onClick={e => e.stopPropagation()} className="quest-modal bg-paper border-2 border-line rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-ink text-white px-5 py-3">
                    <h3 className="text-lg font-bold">Quest</h3>
                    <p className="text-sm text-white/80 truncate">{line.content || 'Untitled quest'}</p>
                </div>
                <div className="p-5">

                <label className="flex items-center justify-between gap-4 mb-4">
                    <span className="text-sm font-medium text-ink">Quest XP</span>
                    <input
                        type="number"
                        min="0"
                        max="1000"
                        inputMode="numeric"
                        value={xp}
                        onChange={e => setXp(e.target.value)}
                        placeholder={String(DEFAULT_QUEST_XP)}
                        className="w-28 bg-white border-2 border-line rounded-lg text-center text-ink py-1 outline-none focus:border-ink"
                        autoFocus
                    />
                </label>

                <div className="mb-4">
                    <div className="text-sm font-medium text-ink mb-2">Catalyser materia</div>
                    <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => setMateriaId('')}
                            className={`flex items-center gap-3 px-3 py-1.5 text-left text-sm rounded-lg text-ink ${!materiaId ? 'bg-line/40' : 'hover:bg-line/20'}`}
                        >
                            <MateriaOrb size={12} />
                            <span>None</span>
                        </button>
                        {materiaList.map(m => (
                            <button
                                type="button"
                                key={m.id}
                                onClick={() => setMateriaId(m.id)}
                                className={`flex items-center gap-3 px-3 py-1.5 text-left text-sm rounded-lg text-ink ${materiaId === m.id ? 'bg-line/40' : 'hover:bg-line/20'}`}
                            >
                                <MateriaOrb materia={m} size={12} />
                                <span className="flex-1">{m.name}{m.category ? <span className="text-ink/60"> · {m.category}</span> : null}</span>
                                <span className="text-xs text-ink/60">×{m.multiplier}</span>
                            </button>
                        ))}
                        {materiaList.length === 0 && (
                            <p className="text-xs text-ink/60 px-3">No materia yet. Obtain some in XP &amp; Statistics.</p>
                        )}
                    </div>
                </div>

                {!isTemplate && (
                    <div className="text-sm text-center text-ink/80 mb-4">
                        Reward <span className="text-amber-600 font-semibold">{reward} XP</span>
                        {selected && <> · +{base} AP to {selected.name}</>}
                        <div className="text-xs text-ink/60 mt-1">
                            If left undone when the day ends: −{Math.round(base * MISSED_QUEST_PENALTY)} XP
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    <button type="button" onClick={onClose} className="flex-1 py-2 border-2 border-line rounded-lg hover:bg-line/20">Cancel</button>
                    <button type="submit" className="flex-1 py-2 bg-ink text-white rounded-lg font-semibold hover:bg-ink/90">Save</button>
                </div>
                </div>
            </form>
        </div>,
        document.body
    )
}

export default QuestModal
