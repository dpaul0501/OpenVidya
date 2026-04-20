'use client';

import { useEffect } from 'react';
import { useUserProfileStore } from '@/lib/store/user-profile';
import {
  getSubjectsForProfile,
  EXAMS_BY_STREAM,
  SENIOR_CLASSES,
} from '@/lib/config/curriculum';
import type { Board, Stream, TargetExam } from '@/lib/config/curriculum';
import { cn } from '@/lib/utils';

const BOARDS: Board[] = ['CBSE', 'ICSE', 'State'];
const STREAMS: Stream[] = ['Science', 'Commerce', 'Arts'];
const CLASSES = [6, 7, 8, 9, 10, 11, 12];

function Chip({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
        disabled && 'opacity-40 cursor-not-allowed',
        active
          ? 'border-violet-300 dark:border-violet-600 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
          : 'border-border/50 text-muted-foreground hover:border-violet-200 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function StudentProfileSettings() {
  const {
    studentClass,
    board,
    stream,
    subjects,
    targetExam,
    setStudentClass,
    setBoard,
    setStream,
    setSubjects,
    setTargetExam,
  } = useUserProfileStore();

  const isSenior = studentClass !== null && (SENIOR_CLASSES as readonly number[]).includes(studentClass);
  const availableSubjects = studentClass ? getSubjectsForProfile(studentClass, stream) : [];
  const availableExams = stream ? EXAMS_BY_STREAM[stream] : (['Board Only'] as TargetExam[]);

  // Reset stream when switching away from senior classes
  useEffect(() => {
    if (!isSenior && stream !== null) setStream(null);
  }, [isSenior, stream, setStream]);

  // Reset subjects when class/stream changes
  useEffect(() => {
    setSubjects([]);
  }, [studentClass, stream, setSubjects]);

  // Reset exam when stream changes
  useEffect(() => {
    setTargetExam(null);
  }, [stream, setTargetExam]);

  const toggleSubject = (s: string) => {
    setSubjects(subjects.includes(s) ? subjects.filter((x) => x !== s) : [...subjects, s]);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Class */}
      <Row label="Class">
        {CLASSES.map((c) => (
          <Chip
            key={c}
            label={`Class ${c}`}
            active={studentClass === c}
            onClick={() => setStudentClass(studentClass === c ? null : c)}
          />
        ))}
      </Row>

      {/* Board */}
      <Row label="Board">
        {BOARDS.map((b) => (
          <Chip
            key={b}
            label={b}
            active={board === b}
            onClick={() => setBoard(board === b ? null : b)}
          />
        ))}
      </Row>

      {/* Stream — only for Class 11–12 */}
      {isSenior && (
        <Row label="Stream">
          {STREAMS.map((s) => (
            <Chip
              key={s}
              label={s}
              active={stream === s}
              onClick={() => setStream(stream === s ? null : s)}
            />
          ))}
        </Row>
      )}

      {/* Subjects */}
      {availableSubjects.length > 0 && (
        <Row label="Subjects">
          {availableSubjects.map((s) => (
            <Chip key={s} label={s} active={subjects.includes(s)} onClick={() => toggleSubject(s)} />
          ))}
        </Row>
      )}

      {/* Target Exam */}
      <Row label="Target Exam">
        {availableExams.map((e) => (
          <Chip
            key={e}
            label={e}
            active={targetExam === e}
            onClick={() => setTargetExam(targetExam === e ? null : e)}
          />
        ))}
      </Row>

      {/* Summary */}
      {studentClass && (
        <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
          Lessons and questions will be scoped to the {board ?? 'NCERT'} Class {studentClass} syllabus
          {subjects.length > 0 ? ` for ${subjects.join(', ')}` : ''}.
          {targetExam ? ` Exam Dojo will use ${targetExam} question patterns.` : ''}
        </p>
      )}
    </div>
  );
}
