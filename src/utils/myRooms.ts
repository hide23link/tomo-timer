import { ROOM_VALID_MS } from '../types'

const KEY = 'tomo_my_rooms'

interface MyRoom {
  id: string
  createdAt: number
}

function load(): MyRoom[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

function save(rooms: MyRoom[]) {
  localStorage.setItem(KEY, JSON.stringify(rooms))
}

// 有効期限内のルームだけ返す（期限切れを自動除去）
export function getActiveMyRooms(): MyRoom[] {
  const active = load().filter(r => Date.now() - r.createdAt < ROOM_VALID_MS)
  save(active)
  return active
}

export function canCreateRoom(): boolean {
  return getActiveMyRooms().length < 3
}

export function addMyRoom(id: string) {
  const rooms = getActiveMyRooms()
  if (!rooms.find(r => r.id === id)) {
    rooms.push({ id, createdAt: Date.now() })
    save(rooms)
  }
}
