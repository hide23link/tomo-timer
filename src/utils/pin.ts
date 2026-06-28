import { hashPin } from './hash'
import type { RoomData } from '../types'

const key = (roomId: string) => `tomo_pin_${roomId}`

export function getStoredPin(roomId: string): string | null {
  return localStorage.getItem(key(roomId))
}

export function storePin(roomId: string, pin: string): void {
  localStorage.setItem(key(roomId), pin)
}

export function clearPin(roomId: string): void {
  localStorage.removeItem(key(roomId))
}

export async function hasControl(roomId: string, room: RoomData): Promise<boolean> {
  const pin = getStoredPin(roomId)
  if (!pin) return false
  const hash = await hashPin(pin)
  return hash === room.pinHash
}
