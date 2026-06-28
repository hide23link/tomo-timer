import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import type { RoomData } from '../types'

type RoomState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; data: RoomData }
  | { status: 'not_found' }
  | { status: 'error'; error: Error }

export function useRoom(roomId: string): RoomState {
  const [state, setState] = useState<RoomState>({ status: 'idle' })

  useEffect(() => {
    if (!roomId) {
      setState({ status: 'idle' })
      return
    }
    setState({ status: 'loading' })
    const ref = doc(db, 'rooms', roomId)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setState({ status: 'found', data: snap.data() as RoomData })
        } else {
          setState({ status: 'not_found' })
        }
      },
      (error) => setState({ status: 'error', error })
    )
    return unsubscribe
  }, [roomId])

  return state
}
