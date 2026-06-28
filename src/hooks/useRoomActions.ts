import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import type { RoomData } from '../types'
import { DEFAULT_DURATION_MS } from '../types'
import { hashPin } from '../utils/hash'
import { generatePin } from '../utils/roomAlloc'
import { storePin } from '../utils/pin'
import { getRemainingMs } from './useTimer'

export function useRoomActions(roomId: string, room: RoomData | null) {
  // roomId が空のときはプレースホルダー（実際には書き込まない）
  const ref = doc(db, 'rooms', roomId || '_noop')

  async function start() {
    if (!room || !roomId) return
    const remaining = room.state === 'paused' ? room.remainingAtPause : room.duration
    await updateDoc(ref, {
      state: 'running',
      startedAt: serverTimestamp(),
      remainingAtPause: remaining,
    })
  }

  async function pause() {
    if (!room || !roomId) return
    await updateDoc(ref, {
      state: 'paused',
      startedAt: null,
      remainingAtPause: getRemainingMs(room),
    })
  }

  async function reset() {
    if (!room || !roomId) return
    await updateDoc(ref, {
      state: 'idle',
      startedAt: null,
      duration: 0,
      remainingAtPause: 0,
    })
  }

  async function addMinutes(minutes: number) {
    if (!room || !roomId) return
    const addMs = minutes * 60 * 1000
    if (room.state === 'running') {
      await updateDoc(ref, {
        remainingAtPause: getRemainingMs(room) + addMs,
        startedAt: serverTimestamp(),
      })
    } else {
      const newDuration = Math.min(room.duration + addMs, 180 * 60 * 1000)
      await updateDoc(ref, {
        duration: newDuration,
        remainingAtPause: newDuration,
        state: 'idle',
        startedAt: null,
      })
    }
  }

  // 新規ルーム作成。PINを自動生成してlocalStorageに保存し、平文PINを返す
  async function createRoom(): Promise<string> {
    const pin = generatePin()
    const pinHash = await hashPin(pin)
    await setDoc(ref, {
      duration: DEFAULT_DURATION_MS,
      state: 'idle',
      startedAt: null,
      remainingAtPause: DEFAULT_DURATION_MS,
      pinHash,
      createdAt: serverTimestamp(),
    })
    storePin(roomId, pin)
    return pin
  }

  // PIN入力で操作権限取得。成功したらlocalStorageに保存
  async function enterPin(pin: string): Promise<'success' | 'wrong_pin'> {
    if (!room) return 'wrong_pin'
    const pinHash = await hashPin(pin)
    if (pinHash !== room.pinHash) return 'wrong_pin'
    storePin(roomId, pin)
    return 'success'
  }

  return { start, pause, reset, addMinutes, createRoom, enterPin }
}
