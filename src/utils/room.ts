import { MIN_ROOM_ID, MAX_ROOM_ID, ROOM_VALID_MS } from '../types'
import type { RoomData } from '../types'

export function isValidRoomId(id: string): boolean {
  const num = parseInt(id, 10)
  return !isNaN(num) && String(num) === id && num >= MIN_ROOM_ID && num <= MAX_ROOM_ID
}

// 作成から24時間経過で期限切れ
export function isRoomExpired(room: RoomData): boolean {
  return Date.now() - room.createdAt.toMillis() > ROOM_VALID_MS
}

// 残り有効時間(ms)。0以下なら期限切れ
export function getRoomRemainingMs(room: RoomData): number {
  return Math.max(0, room.createdAt.toMillis() + ROOM_VALID_MS - Date.now())
}
