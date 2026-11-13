let sentinel: WakeLockSentinel | null = null
let wanted = false

export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator
}

export async function requestWakeLock(): Promise<void> {
  wanted = true
  if (!isWakeLockSupported() || sentinel) return
  try {
    sentinel = await navigator.wakeLock.request('screen')
    sentinel.addEventListener('release', () => {
      sentinel = null
    })
  } catch {
    sentinel = null
  }
}

export async function releaseWakeLock(): Promise<void> {
  wanted = false
  if (sentinel) {
    await sentinel.release()
    sentinel = null
  }
}

if (isWakeLockSupported()) {
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible') {
      requestWakeLock()
    }
  })
}
