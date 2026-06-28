import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import './index.css'

import { db } from './firebase'
import type { RoomData } from './types'
import { DEFAULT_DURATION_MS } from './types'
import { useRoom } from './hooks/useRoom'
import { useTimer } from './hooks/useTimer'
import { useRoomActions } from './hooks/useRoomActions'
import { usePresence } from './hooks/usePresence'
import { isValidRoomId } from './utils/room'
import { hasControl as checkHasControl } from './utils/pin'
import { storePin } from './utils/pin'
import { generatePin } from './utils/roomAlloc'
import { hashPin } from './utils/hash'
import { findAvailableRoomId } from './utils/roomAlloc'
import { canCreateRoom, addMyRoom } from './utils/myRooms'

import { RoomSelector } from './components/RoomSelector'
import { TimerDisplay } from './components/TimerDisplay'
import { TimerControls } from './components/TimerControls'
import { ShareButton } from './components/ShareButton'
import { ViewerCount } from './components/ViewerCount'

// 現在のroomId以外のルームを新規作成する（ドロップダウンから）
async function createRoomAt(roomId: string): Promise<string> {
  const pin = generatePin()
  const pinHash = await hashPin(pin)
  await setDoc(doc(db, 'rooms', roomId), {
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

// ===== メインページ =====
function DevicePage({ roomId }: { roomId: string }) {
  const navigate = useNavigate()
  const roomState = useRoom(roomId)
  const room: RoomData | null = roomState.status === 'found' ? roomState.data : null
  const actions = useRoomActions(roomId, room)
  const viewerCount = usePresence(roomId)
  const remainMs = useTimer(room)

  const [hasControl, setHasControl] = useState(false)
  const [pendingPin, setPendingPin] = useState<string | null>(null)
  const [alarming, setAlarming] = useState(false)
  const [blinkOn, setBlinkOn] = useState(true)
  const prevRemRef = useRef<number | null>(null)

  // localStorageからPIN権限を確認
  useEffect(() => {
    if (!roomId || !room) { setHasControl(false); return }
    checkHasControl(roomId, room).then(setHasControl)
  }, [roomId, room?.pinHash])

  // コロン点滅
  useEffect(() => {
    const t = setInterval(() => setBlinkOn(b => !b), 500)
    return () => clearInterval(t)
  }, [])

  // アラーム検出: 残り時間が0になった瞬間
  useEffect(() => {
    const prev = prevRemRef.current
    if (room?.state === 'running' && remainMs === 0 && prev !== null && prev > 0) {
      setAlarming(true)
    }
    prevRemRef.current = remainMs
  }, [remainMs, room?.state])

  // 外部リセット（他のユーザーがリセットした）でアラーム解除
  useEffect(() => {
    if (alarming && room?.state !== 'running') setAlarming(false)
  }, [room?.state, alarming])

  async function handleCreateNew() {
    if (!canCreateRoom()) {
      alert('作成できるルームは最大3個までです（24時間で自動解放）')
      return
    }
    const newId = await findAvailableRoomId()
    if (!newId) {
      alert('現在ルームが満杯です。しばらくしてからお試しください。')
      return
    }
    const pin = await createRoomAt(newId)
    addMyRoom(newId)
    setHasControl(true)
    navigate(`/room/${newId}`)
    setPendingPin(pin)
  }

  function handleToggle() {
    if (alarming) {
      setAlarming(false)
      if (hasControl) actions.resetToPreset()  // 制御権ありのみFirestore更新
      return
    }
    if (room?.state === 'running') actions.pause()
    else actions.start()
  }

  function handleReset() {
    setAlarming(false)
    actions.reset()  // 手動リセットは常に00:00
  }

  const isRunning = room?.state === 'running' && remainMs > 0
  const unselected = !roomId
  const statusLabel =
    alarming ? '⏰ アラーム' :
    isRunning  ? '▶ 実行中'   :
    '■ 停止中'

  return (
    <div className={'device' + (alarming ? ' alarm' : '')}>

      {/* ルーム選択バー */}
      <div className="room-bar">
        <RoomSelector
          roomId={roomId}
          onSelect={id => navigate(`/room/${id}`)}
          onCreateNew={handleCreateNew}
        />
        <ViewerCount count={viewerCount} />
        <ShareButton
          room={room}
          roomId={roomId}
          hasControl={hasControl}
          pendingPin={pendingPin}
          onPendingPinClear={() => setPendingPin(null)}
          onControlGained={() => setHasControl(true)}
          actions={actions}
        />
      </div>

      {/* タイマー表示 */}
      <TimerDisplay
        remainMs={remainMs}
        statusLabel={statusLabel}
        running={isRunning}
        blinkOn={blinkOn}
        unselected={unselected}
      />

      {/* 操作ボタン */}
      <TimerControls
        room={room}
        hasControl={hasControl && !unselected}
        alarming={alarming}
        onAdd={actions.addMinutes}
        onToggle={handleToggle}
        onReset={handleReset}
      />
    </div>
  )
}

// ===== ルーティング =====
function RoomRoute() {
  const { id } = useParams<{ id: string }>()
  if (!id || !isValidRoomId(id)) return <Navigate to="/" replace />
  return <DevicePage roomId={id} />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DevicePage roomId="" />} />
        <Route path="/room/:id" element={<RoomRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
