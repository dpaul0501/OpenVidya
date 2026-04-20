/**
 * NCERT/CBSE curriculum structure.
 * Drives subject lists, chapter context, and question-bank filtering.
 */

export type Board = 'CBSE' | 'ICSE' | 'State';
export type Stream = 'Science' | 'Commerce' | 'Arts';
export type TargetExam = 'JEE' | 'NEET' | 'CA Foundation' | 'CUET' | 'Board Only';

/** Classes where stream selection applies */
export const SENIOR_CLASSES = [11, 12] as const;

/** Core subjects — English, Mathematics, Science are the primary focus */
export const CORE_SUBJECTS = ['English', 'Mathematics', 'Science'] as const;

/** Subjects by class range and stream */
export const SUBJECTS_BY_CLASS: Record<string, string[]> = {
  '6-8':            ['English', 'Mathematics', 'Science'],
  '9-10':           ['English', 'Mathematics', 'Science'],
  '11-12-Science':  ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology'],
  '11-12-Commerce': ['English', 'Mathematics', 'Economics'],
  '11-12-Arts':     ['English', 'Political Science', 'Economics'],
};

export function getSubjectsForProfile(
  studentClass: number,
  stream?: Stream | null,
): string[] {
  if (studentClass <= 8) return SUBJECTS_BY_CLASS['6-8'];
  if (studentClass <= 10) return SUBJECTS_BY_CLASS['9-10'];
  const key = `11-12-${stream ?? 'Science'}`;
  return SUBJECTS_BY_CLASS[key] ?? SUBJECTS_BY_CLASS['11-12-Science'];
}

/** Competitive exams relevant by stream */
export const EXAMS_BY_STREAM: Record<Stream, TargetExam[]> = {
  Science:  ['JEE', 'NEET', 'CUET', 'Board Only'],
  Commerce: ['CA Foundation', 'CUET', 'Board Only'],
  Arts:     ['CUET', 'Board Only'],
};

/** Build a plain-text curriculum context string for prompt injection */
export function buildCurriculumContext(profile: {
  studentClass: number | null;
  board: Board | null;
  stream: Stream | null;
  subjects: string[];
  targetExam: TargetExam | null;
}): string {
  if (!profile.studentClass) return '';

  const parts: string[] = [
    `Student is in Class ${profile.studentClass}`,
    profile.board ? `Board: ${profile.board}` : '',
    profile.stream ? `Stream: ${profile.stream}` : '',
    profile.subjects.length > 0 ? `Subjects: ${profile.subjects.join(', ')}` : '',
    profile.targetExam ? `Preparing for: ${profile.targetExam}` : '',
  ].filter(Boolean);

  return `## Student Curriculum Profile\n\n${parts.join(' | ')}\n\nConfine all content strictly to the ${profile.board ?? 'NCERT'} syllabus for Class ${profile.studentClass}. Use NCERT textbook terminology and chapter structure. Do not introduce concepts beyond the prescribed syllabus for this class.\n\n---`;
}
