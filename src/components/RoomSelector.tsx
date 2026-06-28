import { useState, useEffect, useRef } from 'react'
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import type { RoomData } from '../types'
import { ROOM_VALID_MS } from '../types'
import { getRemainingMs, formatTime } from '../hooks/useTimer'

interface RoomEntry {
  id: string
  data: RoomData
}

interface Props {
  roomId: string
  onSelect: (id: string) => void
  onCreateNew: () => void
}

export function RoomSelector({ roomId, onSelect, onCreateNew }: Props) {
  const [open, setOpen] = useState(false)
  const [rooms, setRooms] = useState<RoomEntry[]>([])
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // ドロップダウンを開いたときにルーム一覧を取得
  useEffect(() => {
    if (!open) return
    const cutoff = Timestamp.fromMillis(Date.now() - ROOM_VALID_MS)
    const q = query(
      collection(db, 'rooms'),
      where('createdAt', '>', cutoff),
      orderBy('createdAt', 'desc'),
      limit(30),
    )
    getDocs(q).then(snap => {
      setRooms(snap.docs.map(d => ({ id: d.id, data: d.data() as RoomData })))
    })
  }, [open])

  // 外側クリックで閉じる
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onOutside)
    return () => document.removeEventListener('click', onOutside)
  }, [])

  const label = roomId ? `ルーム #${roomId}` : 'ルームを選択 ▼'

  async function handleCreateNew() {
    setOpen(false)
    setCreating(true)
    try {
      await onCreateNew()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={ref} style={{ flex: 1, position: 'relative' }}>
      <button
        className="room-btn"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        disabled={creating}
      >
        {creating ? '作成中…' : label}
        {!creating && <i className="chev">&#9660;</i>}
      </button>

      {open && (
        <div className="room-menu">
          {rooms.length === 0 && (
            <div className="room-item" style={{ color: '#9a9a90', cursor: 'default' }}>
              アクティブなルームなし
            </div>
          )}
          {rooms.map(({ id, data }) => {
            const rem = getRemainingMs(data)
            const running = data.state === 'running'
            return (
              <button
                key={id}
                className={'room-item' + (id === roomId ? ' active' : '')}
                onClick={() => { onSelect(id); setOpen(false) }}
              >
                <span>ルーム #{id}</span>
                <span className="room-item-time">
                  {running ? '▶ ' : ''}{formatTime(rem)}
                </span>
              </button>
            )
          })}
          <button className="room-item room-item-new" onClick={handleCreateNew}>
            ＋ 新規ルームを作成
          </button>
        </div>
      )}
    </div>
  )
}
