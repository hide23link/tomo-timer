import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getDatabase, ref, onValue } from 'firebase/database'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
export const rtdb = getDatabase(app)

// RTDBのサーバーとクライアントの時刻差を補正する
let _serverOffset = 0
onValue(ref(rtdb, '.info/serverTimeOffset'), (snap) => {
  _serverOffset = snap.val() ?? 0
})

// サーバー基準の現在時刻（デバイス間のズレを補正）
export function serverNow(): number {
  return Date.now() + _serverOffset
}
