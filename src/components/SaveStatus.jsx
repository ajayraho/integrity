import { useEffect, useState } from 'react'
import { subscribeStatus } from '../utils/storage'

const LABELS = {
    saving: { text: 'Saving…', cls: 'bg-white text-ink/70 border-line' },
    offline: { text: 'Offline · saved on this device', cls: 'bg-yellow-50 text-yellow-800 border-yellow-300' },
    error: { text: 'Not saved · retrying', cls: 'bg-red-50 text-red-700 border-red-300' },
}

/** Small pill showing whether edits have reached the server. Hidden when everything is saved. */
function SaveStatus() {
    const [status, setStatus] = useState('saved')
    useEffect(() => subscribeStatus(setStatus), [])

    const label = LABELS[status]
    if (!label) return null
    return (
        <div className={`fixed bottom-9 right-24 z-30 text-xs px-3 py-1 rounded-full border shadow-sm ${label.cls}`} role="status">
            {label.text}
        </div>
    )
}

export default SaveStatus
