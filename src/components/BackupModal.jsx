import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exportAll, importAll } from '../utils/storage'
import { toDateId } from '../utils/date'

function BackupModal({ onClose }) {
    const fileRef = useRef(null)
    const [message, setMessage] = useState('')
    const [busy, setBusy] = useState(false)

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `integrity-backup-${toDateId(new Date())}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImport = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setBusy(true)
        setMessage('Importing…')
        try {
            const data = JSON.parse(await file.text())
            const count = await importAll(data, (done, total) => setMessage(`Importing… ${done}/${total}`))
            setMessage(`Imported ${count} items.`)
        } catch (err) {
            console.error(err)
            setMessage('Import failed: ' + err.message)
        } finally {
            setBusy(false)
            e.target.value = ''
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={busy ? undefined : onClose}>
            <div className="bg-paper border-2 border-line rounded-lg shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="bg-ink text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
                    <h2 className="text-xl font-bold">Backup & Import</h2>
                    <button onClick={onClose} disabled={busy} className="text-2xl leading-none">×</button>
                </div>
                <div className="p-6 space-y-4 text-ink">
                    <div>
                        <button onClick={handleExport} className="w-full py-3 bg-ink text-white rounded-lg font-medium">
                            ⬇️ Download backup (.json)
                        </button>
                        <p className="text-xs text-ink/60 mt-1">Everything: days, habits, templates, badges, medals, reminders.</p>
                    </div>
                    <div>
                        <button onClick={() => fileRef.current?.click()} disabled={busy} className="w-full py-3 border-2 border-ink rounded-lg font-medium disabled:opacity-50">
                            ⬆️ Import from file
                        </button>
                        <p className="text-xs text-ink/60 mt-1">Accepts a backup from this app or an export from the old (Supabase) version. Items with the same id are overwritten.</p>
                        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
                    </div>
                    {message && <p className="text-sm bg-white border border-line rounded-lg p-3">{message}</p>}
                </div>
            </div>
        </div>,
        document.body
    )
}

export default BackupModal
