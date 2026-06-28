import { formatTime } from '../hooks/useTimer'

interface Props {
  remainMs: number
  statusLabel: string
  running: boolean
  blinkOn: boolean
  unselected: boolean
}

export function TimerDisplay({ remainMs, statusLabel, running, blinkOn, unselected }: Props) {
  const timeStr = unselected ? '00:00' : formatTime(remainMs)
  const colonHidden = running && !blinkOn

  return (
    <div className="lcd">
      <div className="lcd-status">{unselected ? '' : statusLabel}</div>
      <div className="lcd-info">分 / 秒</div>
      <div className="lcd-labels">
        <span>分</span>
        <span>秒</span>
      </div>
      <div className="lcd-digits">
        <div className="lcd-ghost">88:88</div>
        <div className="lcd-value" style={{ opacity: unselected ? 0.3 : 1 }}>
          {timeStr.slice(0, 2)}
          <span className={colonHidden ? 'colon-hidden' : ''}>:</span>
          {timeStr.slice(3)}
        </div>
      </div>
    </div>
  )
}
