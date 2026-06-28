# Tomo Timer 公開版 仕様書

## 画面レイアウト

```
┌─────────────────────────────────┐
│  [ルームを選択 ▼]  👥 42人  🔗  │  ← 🔗が共有ボタン（1個）
│                                 │
│         14:23                   │  ← 7セグデジタル表示
│                                 │
│     [+10分]   [+1分]            │
│                                 │
│      [ スタート / ストップ ]      │
│                                 │
│           [ リセット ]            │
└─────────────────────────────────┘
```

## 共有ボタン（🔗）の動作

PINコードを知っている人全員が操作権限を共有する。  
オーナー・個人ロックの概念はない。

| 状態 | 🔗 ボタンを押したとき |
|---|---|
| PINを持っていない（閲覧者） | PIN入力ダイアログを表示 → 正解でそのまま操作可能に |
| PINを持っている（操作者） | PINコードを表示 ＋ メール・LINEなどで共有できる |

- PIN入力後はそのブラウザの localStorage に保存（次回から入力不要）
- PINが変わった場合（ルーム再利用時）は自動的に無効化 → 再入力

## プルダウン（ルーム選択）

- 初期状態：「ルームを選択してください」（タイマーは 00:00 で非活性）
- クリックで下に展開：
  ```
  ▶ ルーム #1   実行中    14:23
  ⏸ ルーム #5   一時停止  08:41
  ⏹ ルーム #7   停止中    25:00
  ────────────────────────────
  ＋ 新規ルームを作成
  ```
- 最大30件表示（lastActivity の新しい順）
- URLで直接アクセス可：`/room/42`

## ルーム

| 項目 | 仕様 |
|---|---|
| 番号 | 1〜1000 |
| 有効期間 | **作成日時から24時間** |
| 再利用優先順位 | ①空きスロット → ②期限切れルーム（作成から24時間超） |
| 閲覧 | PINなし・誰でも可 |
| 操作 | PINを知っている人全員（共有） |
| 最大視聴者数 | 無制限 |

## PIN

| 項目 | 仕様 |
|---|---|
| 桁数 | 6桁・自動生成（100万通り） |
| 表示 | 作成時に表示 ＋ 🔗ボタンでいつでも確認可能 |
| 共有方法 | 🔗ボタン → システム共有ダイアログ（メール・LINE等） |
| 保存先 | localStorage（`tomo_pin_{roomId}` に平文保存） |
| 有効期限 | ルームの有効期間（作成から24時間）と同じ |
| 残り時間表示 | 🔗 共有画面に「残り HH:MM:SS」を表示（PINを持っている人のみ） |
| 失敗制限 | なし |
| PIN変更 | ルーム再利用時に自動で新PIN発行 → 旧PINは無効化 |

## タイマー

| 操作 | 動作 |
|---|---|
| +10分 | 設定時間に10分追加（上限180分、停止中のみ） |
| +1分 | 設定時間に1分追加（停止中のみ） |
| スタート | カウントダウン開始 |
| ストップ | 一時停止（残り時間を保持） |
| リセット | **設定時間に戻す**（00:00ではなく元の設定時間） |
| 0:00到達 | 全員の画面で通知（数字点滅） |

- 操作ボタンは PIN未保持の場合グレーアウト（disabled）

## 表示

| 要素 | 仕様 |
|---|---|
| タイマー | 7セグメントデジタルフォント（DSEG7 Classic） |
| 停止中 | 暗い緑（セグオフ） |
| 実行中 | 明るい緑グロー |
| 一時停止 | 琥珀色（アンバー） |
| 残り60秒以下 | 赤・点滅 |
| 終了（0:00） | 赤・高速点滅 |
| 視聴者数 | **30秒ごと**更新 |

## Firebase 構成

### Firestoreデータモデル

```
rooms/{roomId}        roomId = "1" 〜 "1000"

  duration            number      設定時間(ms)、デフォルト25分
  state               string      "idle" | "running" | "paused"
  startedAt           Timestamp?  スタート時のサーバータイムスタンプ
  remainingAtPause    number      一時停止・リセット時の残り時間(ms)
  pinHash             string      SHA-256(6桁PIN)
  createdAt           Timestamp   作成日時（有効期限 = createdAt + 24時間）
```

フィールド数：**6個**

### Realtime Database（視聴者数のみ）

```
presence/{roomId}/{sessionId}   ServerValue.TIMESTAMP
```

- 入室時書き込み、タブ閉じ時は `onDisconnect().remove()` で自動削除
- 30秒ごとにハートビート書き込み ＋ `get()` で人数取得

### タイマー残り時間の計算（クライアント側）

```
idle / paused  →  remainingAtPause をそのまま表示
running        →  Math.max(0, remainingAtPause - (Date.now() - startedAt.toMillis()))
```

## URLルーティング

| URL | 状態 |
|---|---|
| `/` | プルダウン未選択、タイマー非活性 |
| `/room/42` | ルーム42を選択した状態で起動 |
| `/room/0` `/room/1001` 等 | `/` にリダイレクト |

## ファイル構成

### 変更不要（再利用）

```
src/firebase.ts              Firestore(db) と RTDB(rtdb)
src/hooks/useRoom.ts         Firestoreリアルタイムリスナー
src/hooks/usePresence.ts     RTDBプレゼンス（30秒ポーリング）
src/hooks/useTimer.ts        getRemainingMs / formatTime / useTimer
src/utils/hash.ts            hashPin()
src/utils/session.ts         getSessionId()
src/utils/roomAlloc.ts       findAvailableRoomId / generatePin
```

### 更新済み

```
src/types.ts                 RoomData型（ownerSessionId等を削除、pinHashに整理）
src/utils/room.ts            isValidRoomId / isRoomStale（isOwner等を削除）
src/utils/pin.ts             storePin / getStoredPin / clearPin（新規）
src/hooks/useRoomActions.ts  createRoom / enterPin / start / pause / reset / addMinutes
```

### 実装対象（再構築）

```
src/App.tsx
src/index.css
src/components/
  RoomSelector.tsx           プルダウン
  TimerDisplay.tsx           7セグ表示
  TimerControls.tsx          +10分/+1分/スタートストップ/リセット
  ShareButton.tsx            🔗 共有ボタン（PIN確認＆入力）
  ViewerCount.tsx            視聴者数
```
