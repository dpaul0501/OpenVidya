/**
 * User Profile Store
 * Persists avatar, nickname, bio, and student curriculum profile to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Board, Stream, TargetExam } from '@/lib/config/curriculum';

/** Predefined avatar options */
export const AVATAR_OPTIONS = [
  '/avatars/user.png',
  '/avatars/teacher-2.png',
  '/avatars/assist-2.png',
  '/avatars/clown-2.png',
  '/avatars/curious-2.png',
  '/avatars/note-taker-2.png',
  '/avatars/thinker-2.png',
] as const;

export interface UserProfileState {
  /** Local avatar path or data-URL (for custom uploads) */
  avatar: string;
  nickname: string;
  bio: string;

  /** Student curriculum profile */
  studentClass: number | null;       // 6–12
  board: Board | null;               // CBSE | ICSE | State
  stream: Stream | null;             // Science | Commerce | Arts (Class 11–12 only)
  subjects: string[];                // Selected from derived list
  targetExam: TargetExam | null;     // JEE | NEET | CA Foundation | CUET | Board Only

  setAvatar: (avatar: string) => void;
  setNickname: (nickname: string) => void;
  setBio: (bio: string) => void;
  setStudentClass: (cls: number | null) => void;
  setBoard: (board: Board | null) => void;
  setStream: (stream: Stream | null) => void;
  setSubjects: (subjects: string[]) => void;
  setTargetExam: (exam: TargetExam | null) => void;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      avatar: AVATAR_OPTIONS[0],
      nickname: '',
      bio: '',
      studentClass: null,
      board: null,
      stream: null,
      subjects: [],
      targetExam: null,
      setAvatar: (avatar) => set({ avatar }),
      setNickname: (nickname) => set({ nickname }),
      setBio: (bio) => set({ bio }),
      setStudentClass: (studentClass) => set({ studentClass }),
      setBoard: (board) => set({ board }),
      setStream: (stream) => set({ stream }),
      setSubjects: (subjects) => set({ subjects }),
      setTargetExam: (targetExam) => set({ targetExam }),
    }),
    {
      name: 'user-profile-storage',
    },
  ),
);
