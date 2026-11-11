import { createContext, useContext } from 'react'

/** Toasts + reward animations, available anywhere below <App>. */
export const FeedbackContext = createContext({
    showToast: () => {},
    showXPGain: () => {},
    showXPLoss: () => {},
    showBadge: () => {},
    showMedal: () => {},
    act: (_dayId, fn) => fn(),
})

export const useFeedback = () => useContext(FeedbackContext)
