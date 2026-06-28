import { useEffect, useState } from 'react'
import { ref, set, get, onDisconnect, remove, serverTimestamp } from 'firebase/database'
import { rtdb } from '../firebase'
import { getSessionId } from '../utils/session'

const HEARTBEAT_INTERVAL = 30_000 // 30秒ごとに書き込み＆読み取り

export function usePresence(roomId: string): number {
  const [viewerCount, setViewerCount] = useState(0)

  useEffect(() => {
    if (!roomId) {
      setViewerCount(0)
      return
    }

    const sessionId = getSessionId()
    const presenceRef = ref(rtdb, `presence/${roomId}/${sessionId}`)
    const roomRef = ref(rtdb, `presence/${roomId}`)

    const writePresence = () => set(presenceRef, serverTimestamp())
    const readCount = async () => {
      const snap = await get(roomRef)
      setViewerCount(snap.exists() ? Object.keys(snap.val() as object).length : 0)
    }

    // 入室時: 書き込み＋タブ閉じ時の自動削除を登録
    writePresence()
    onDisconnect(presenceRef).remove()

    // 初回カウント取得
    readCount()

    // 30秒ごとにハートビート＋カウント更新
    const interval = setInterval(() => {
      writePresence()
      readCount()
    }, HEARTBEAT_INTERVAL)

    return () => {
      clearInterval(interval)
      remove(presenceRef)
    }
  }, [roomId])

  return viewerCount
}
