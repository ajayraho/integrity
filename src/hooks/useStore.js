import { useSyncExternalStore } from 'react'
import { subscribe, getVersion } from '../utils/storage'

/**
 * Re-render whenever the store changes (local edits or remote snapshots).
 * Returns a version number that can be used as a memo dependency.
 */
export function useStoreVersion() {
    return useSyncExternalStore(subscribe, getVersion, getVersion)
}
