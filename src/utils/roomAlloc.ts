import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { MIN_ROOM_ID, MAX_ROOM_ID } from '../types'
import type { RoomData } from '../types'
import { isRoomExpired } from './room'

async function checkSlot(id: string): Promise<'empty' | 'expired' | 'active'> {
  const snap = await getDoc(doc(db, 'rooms', id))
  if (!snap.exists()) return 'empty'
  return isRoomExpired(snap.data() as RoomData) ? 'expired' : 'active'
}

export async function findAvailableRoomId(): Promise<string | null> {
  const expiredCandidates: string[] = []

  // ランダム10回: 空きスロット優先、期限切れは候補に積む
  for (let i = 0; i < 10; i++) {
    const id = String(Math.floor(Math.random() * MAX_ROOM_ID) + MIN_ROOM_ID)
    const status = await checkSlot(id)
    if (status === 'empty') return id
    if (status === 'expired') expiredCandidates.push(id)
  }
  if (expiredCandidates.length > 0) return expiredCandidates[0]

  // 連番フォールバック: 空き → 期限切れ の順で探す
  for (let n = MIN_ROOM_ID; n <= MAX_ROOM_ID; n++) {
    const status = await checkSlot(String(n))
    if (status === 'empty') return String(n)
    if (status === 'expired') expiredCandidates.push(String(n))
  }
  if (expiredCandidates.length > 0) return expiredCandidates[0]

  // 全1000スロットが有効期間内: 新規作成不可
  return null
}

export function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}
