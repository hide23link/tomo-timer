import type { RoomData } from '../types'

interface Props {
  room: RoomData | null
  hasControl: boolean
  alarming: boolean
  locked: boolean
  onAdd: (minutes: number) => void
  onToggle: () => void
  onReset: () => void
}

export function TimerControls({ room, hasControl, alarming, locked, onAdd, onToggle, onReset }: Props) {
  const running = room?.state === 'running'
  const addDisabled = locked || !hasControl || (running && !alarming)

  return (
    <>
      <div className="btn-row">
        <button className="btn" disabled={addDisabled} onClick={() => onAdd(10)}>
          10分
        </button>
        <button className="btn" disabled={addDisabled} onClick={() => onAdd(1)}>
          1分
        </button>
        <button className="btn" disabled={locked || !hasControl} onClick={onReset}>
          リセット
        </button>
      </div>
      <button className="btn btn-main" disabled={locked || (!hasControl && !alarming)} onClick={onToggle}>
        {alarming ? 'アラームを止める' : 'スタート / ストップ'}
      </button>
    </>
  )
}
