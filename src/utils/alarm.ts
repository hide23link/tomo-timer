// sync-timer から移植。タニタ風の電子アラーム音（ピピピッ）を Web Audio API で合成する。
// 音声ファイル不要。止めるまで鳴り続ける。
// バイブレーション（Android のみ対応、iOS は無視される）も併発する。

let audioCtx: AudioContext | null = null
let alarmTimer: number | null = null
let vibeTimer: number | null = null
let running = false

// AudioContext を取得（初回はユーザー操作後に作る必要がある）
function getCtx(): AudioContext {
  if (!audioCtx) {
    // Safari 対応のため webkit プレフィックスもフォールバック
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    audioCtx = new Ctor()
  }
  return audioCtx
}

// 「ピッ」を1回鳴らす（指定周波数・長さ）
function beep(freq: number, durationMs: number, startDelayMs: number) {
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.type = 'square' // 矩形波＝電子音っぽいピッ
  osc.frequency.value = freq

  const t0 = ctx.currentTime + startDelayMs / 1000
  const t1 = t0 + durationMs / 1000

  // クリックノイズを避けるため、立ち上がり・立ち下がりを少し滑らかに
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(0.4, t0 + 0.005)
  gain.gain.setValueAtTime(0.4, t1 - 0.005)
  gain.gain.linearRampToValueAtTime(0, t1)

  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t1)
}

// 「ピピピッ」を1セット鳴らす（3連 + 少し高い1音）
function playPattern() {
  beep(2000, 80, 0)
  beep(2000, 80, 150)
  beep(2000, 80, 300)
  beep(2600, 120, 480)
}

// アラーム開始（止めるまで繰り返す）
export function startAlarm() {
  if (running) return
  running = true

  // AudioContext が止まっていたら再開（自動再生制限・iOS のバックグラウンド復帰対策）
  resumeAudio()

  playPattern()
  alarmTimer = window.setInterval(playPattern, 1200)

  // バイブレーション（Android のみ。iOS Safari は無視）
  if ('vibrate' in navigator) {
    const pattern = [80, 70, 80, 70, 80, 200]
    navigator.vibrate(pattern)
    vibeTimer = window.setInterval(() => navigator.vibrate(pattern), 1200)
  }
}

// アラーム停止
export function stopAlarm() {
  running = false
  if (alarmTimer != null) {
    clearInterval(alarmTimer)
    alarmTimer = null
  }
  if (vibeTimer != null) {
    clearInterval(vibeTimer)
    vibeTimer = null
  }
  if ('vibrate' in navigator) navigator.vibrate(0)
}

// 今アラームが鳴っているか
export function isAlarming(): boolean {
  return running
}

// ユーザーが最初に操作したときに AudioContext を準備しておく
// （iOS/Chrome の自動再生制限で、操作なしだと後で鳴らないため）
export function primeAudio() {
  resumeAudio()
}

// iOS Safari はマナーモード（消音スイッチ）だと Web Audio が無音になる。
// audioSession を playback にすると、消音スイッチに関係なく鳴る（iOS 16.4+）。
function setPlaybackSession() {
  const session = (navigator as unknown as { audioSession?: { type: string } })
    .audioSession
  if (session) {
    try {
      session.type = 'playback'
    } catch {
      // 非対応環境では無視
    }
  }
}

// AudioContext を running に戻す。
// iOS はロック・バックグラウンド復帰後に 'interrupted' になるため、
// 'suspended' だけでなく running 以外は全て resume を試みる。
function resumeAudio() {
  setPlaybackSession()
  const ctx = getCtx()
  if (ctx.state !== 'running') {
    ctx.resume().catch(() => {})
  }
}

// どこをタップしても音声を解禁する（iOS は「ジェスチャー内での resume」が必須）。
// 他人の操作を見ているだけの端末でもアラームが鳴るようにする。
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', resumeAudio, { capture: true })
  document.addEventListener('touchend', resumeAudio, { capture: true })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioCtx) resumeAudio()
  })
}
