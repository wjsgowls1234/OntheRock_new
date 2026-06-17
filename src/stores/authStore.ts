import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '@/config/firebase';

interface AuthStore {
  user: User | null;
  initializing: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  _setUser: (user: User | null) => void;
  _setInitializing: (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  initializing: true,
  error: null,

  signUp: async (email, password) => {
    set({ error: null });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      set({ error: authErrorMessage(code) });
      throw e;
    }
  },

  signIn: async (email, password) => {
    set({ error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      set({ error: authErrorMessage(code) });
      throw e;
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
  },

  clearError: () => set({ error: null }),
  _setUser:         (user) => set({ user }),
  _setInitializing: (v)    => set({ initializing: v }),
}));

function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':  return '이미 사용 중인 이메일입니다.';
    case 'auth/invalid-email':         return '올바른 이메일 형식을 입력해 주세요.';
    case 'auth/weak-password':         return '비밀번호는 6자 이상이어야 합니다.';
    case 'auth/user-not-found':        return '등록되지 않은 이메일입니다.';
    case 'auth/wrong-password':        return '비밀번호가 올바르지 않습니다.';
    case 'auth/invalid-credential':    return '이메일 또는 비밀번호가 올바르지 않습니다.';
    case 'auth/too-many-requests':     return '잠시 후 다시 시도해 주세요.';
    default:                            return '오류가 발생했습니다. 다시 시도해 주세요.';
  }
}

// Call once in the App root to keep auth state in sync.
export function initAuthListener(): () => void {
  const { _setUser, _setInitializing } = useAuthStore.getState();
  return onAuthStateChanged(auth, (user) => {
    _setUser(user);
    _setInitializing(false);
  });
}
