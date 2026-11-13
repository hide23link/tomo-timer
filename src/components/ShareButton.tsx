import { useState, useEffect } from 'react'
import type { RoomData } from '../types'
import { getStoredPin } from '../utils/pin'
import { getRoomRemainingMs } from '../utils/room'
import type { useRoomActions } from '../hooks/useRoomActions'

interface Props {
  room: RoomData | null
  roomId: string
  hasControl: boolean
  pendingPin: string | null
  onPendingPinClear: () => void
  onControlGained: () => void
  actions: ReturnType<typeof useRoomActions>
  disabled?: boolean
}

function formatRemaining(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type ModalMode = 'show' | 'enter' | null

export function ShareButton({ room, roomId, hasControl, pendingPin, onPendingPinClear, onControlGained, actions, disabled = false }: Props) {
  const [modal, setModal] = useState<ModalMode>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [remainingStr, setRemainingStr] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (pendingPin) setModal('show')
  }, [pendingPin])

  useEffect(() => {
    if (modal !== 'show' || !room) return
    const update = () => setRemainingStr(formatRemaining(getRoomRemainingMs(room)))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [modal, room?.createdAt])

  const displayPin = pendingPin ?? (hasControl ? getStoredPin(roomId) : null)

  function handleClick() {
    if (!roomId) return
    if (hasControl) {
      setModal('show')
    } else {
      setModal('enter')
      setPinInput('')
      setPinError(false)
    }
  }

  async function handleEnterPin() {
    const result = await actions.enterPin(pinInput)
    if (result === 'success') {
      onControlGained()
      setModal(null)
    } else {
      setPinError(true)
    }
  }

  function handleCopy() {
    if (!displayPin) return
    navigator.clipboard.writeText(displayPin).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleShare() {
    const url = `${window.location.origin}/room/${roomId}`
    const text = `Tomo Timer ルーム #${roomId}\nPIN: ${displayPin}\n${url}`
    if (navigator.share) {
      navigator.share({ title: 'Tomo Timer', text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  function handleClose() {
    setModal(null)
    if (pendingPin) onPendingPinClear()
    setPinInput('')
    setPinError(false)
  }

  return (
    <>
      <button className="share-btn" onClick={handleClick} disabled={!roomId || disabled} title="共有 / PIN入力">
        🔗
      </button>

      {/* PIN表示モーダル（作成者用） */}
      {modal === 'show' && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleClose}>✕</button>
            <div className="modal-title">PINコード</div>
            <div className="pin-display">{displayPin}</div>
            <div className="modal-remaining">有効残り {remainingStr}</div>
            <div className="modal-actions">
              <button className="btn btn-large" onClick={handleCopy}>
                {copied ? '✓ コピー済' : 'コピー'}
              </button>
              <button className="btn btn-large" onClick={handleShare}>共有</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN入力モーダル（参加者用） */}
      {modal === 'enter' && (
        <div className="modal-overlay" onClick={handleClose}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={handleClose}>✕</button>
            <div className="modal-title">PINコードを入力</div>
            <input
              className="pin-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError(false) }}
              onKeyDown={e => { if (e.key === 'Enter' && pinInput.length === 6) handleEnterPin() }}
              autoFocus
            />
            {pinError && <div className="pin-error">PINコードが違います</div>}
            <button
              className="btn btn-confirm btn-enter"
              onClick={handleEnterPin}
              disabled={pinInput.length !== 6}
            >
              確認
            </button>
          </div>
        </div>
      )}
    </>
  )
}
