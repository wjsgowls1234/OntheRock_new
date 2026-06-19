import { initializeApp } from 'firebase/app';
// @ts-ignore — getReactNativePersistence is only in the RN build, pinned via metro.config.js
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Firebase 프로젝트 설정 ───────────────────────────────────────
// 1. https://console.firebase.google.com 에서 프로젝트 생성
// 2. Authentication → Sign-in method → 이메일/비밀번호 활성화
// 3. 프로젝트 설정 → 내 앱 → SDK 설정 및 구성 → 아래 값 붙여넣기
// ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAkht7KUMINZsfOg9JjHcMO90qCJ3Z4uZE",
  authDomain: "ontherock-30c62.firebaseapp.com",
  projectId: "ontherock-30c62",
  storageBucket: "ontherock-30c62.firebasestorage.app",
  messagingSenderId: "1037713887682",
  appId: "1:1037713887682:web:795aede4a01dc58684865b",
  measurementId: "G-C6DC50LJEX"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});


