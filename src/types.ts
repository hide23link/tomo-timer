import type { Timestamp } from 'firebase/firestore'

export type TimerState = 'idle' | 'running' | 'paused'

export interface RoomData {
  duration: number
  state: TimerState
  startedAt: Timestamp | null
  remainingAtPause: number
  pinHash: string
  createdAt: Timestamp
}

export const ROOM_VALID_MS       = 24 * 60 * 60 * 1000  // 作成から24時間で期限切れ
export const DEFAULT_DURATION_MS = 30 * 60 * 1000
export const MIN_ROOM_ID         = 1
export const MAX_ROOM_ID         = 1000
