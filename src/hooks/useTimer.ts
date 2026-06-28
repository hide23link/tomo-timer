import { useEffect, useState } from 'react'
import type { RoomData } from '../types'
import { serverNow } from '../firebase'

export function getRemainingMs(room: RoomData): number {
  if (room.state !== 'running' || !room.startedAt) {
    return room.remainingAtPause
  }
  const elapsed = serverNow() - room.startedAt.toMillis()
  return Math.max(0, room.remainingAtPause - elapsed)
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function useTimer(room: RoomData | null): number {
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    if (!room) {
      setRemainingMs(0)
      return
    }

    const update = () => setRemainingMs(getRemainingMs(room))
    update()

    if (room.state !== 'running') return

    const interval = setInterval(update, 250)
    return () => clearInterval(interval)
  }, [room])

  return remainingMs
}
