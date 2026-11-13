interface Props {
  locked: boolean
  onChange: (locked: boolean) => void
}

// ロック: ONにすると画面の自動消灯を止め、誤操作防止のため全ボタンを無効にする（sync-timer から移植）
export function LockToggle({ locked, onChange }: Props) {
  return (
    <label className="lock-toggle" title="ロック（画面を消さない・操作を無効化）" onClick={e => e.stopPropagation()}>
      <input
        type="checkbox"
        checked={locked}
        onChange={e => onChange(e.target.checked)}
        aria-label="ロック"
      />
      <span className="lock-track">
        <span className="lock-thumb" />
      </span>
    </label>
  )
}
