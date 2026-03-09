import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredPrompt || dismissed) return null

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 right-4 z-50 w-10 h-10 rounded-full bg-gdc-accent text-white shadow-lg shadow-gdc-accent/30 flex items-center justify-center hover:bg-gdc-accent/90 transition-colors"
      title="Install app"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
      </svg>
      <button
        onClick={e => { e.stopPropagation(); setDismissed(true) }}
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gdc-surface border border-gdc-border text-gdc-textMuted flex items-center justify-center text-[10px] hover:text-gdc-text"
        title="Dismiss"
      >
        ×
      </button>
    </button>
  )
}
