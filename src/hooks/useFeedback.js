import { createContext, useContext } from 'react'

/** Toasts + reward animations, available anywhere below <App>. */
export const FeedbackContext = createContext({
    showToast: () => {},
    showXPGain: () => {},
    showXPLoss: () => {},
    showBadge: () => {},
    showMedal: () => {},
    celebrate: () => {},
})

export const useFeedback = () => useContext(FeedbackContext)
