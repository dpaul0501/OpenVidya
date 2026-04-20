/**
 * Central registry of all learning modes available in OpenVidya.
 * Add new modes here — the rest of the system reads from this config.
 *
 * Architecture:
 *   teacher-narration  — core mode: slides + live narration + chat-driven updates
 *   story-quest        — agentic workflow: Indian-story-first lesson, layers on teacher-narration
 *   exam-dojo          — agentic workflow: CBSE exam prep, auto-suggested post-session
 *   lab-without-walls  — agentic workflow: virtual NCERT lab, activates for applicable topics
 *   rapid-revision     — agentic workflow: spaced-repetition sprint, integrates after any lesson
 *   openmaic           — group classroom mode (legacy base)
 *   debate-sabha       — coming soon
 */

export type EducationMode =
  | 'teacher-narration'
  | 'story-quest'
  | 'exam-dojo'
  | 'lab-without-walls'
  | 'rapid-revision'
  | 'openmaic'
  | 'debate-sabha';

export interface ModeConfig {
  id: EducationMode;
  emoji: string;
  label: string;
  description: string;
  /** One-liner shown on hover / expanded card */
  detail?: string;
  /** Agent ID pre-selected when this mode is active. Undefined = user's settings. */
  defaultAgentId?: string;
  /** Not fully implemented yet — shows "coming soon" badge in UI */
  comingSoon?: boolean;
  /**
   * Marks this mode as an agentic workflow that layers on teacher-narration.
   * The main page surfaces these as "also available" actions, not top-level modes.
   */
  isWorkflow?: boolean;
}

export const EDUCATION_MODES: ModeConfig[] = [
  {
    id: 'teacher-narration',
    emoji: '🎙️',
    label: 'Teacher Narration',
    description: 'Slides with live narration — ask questions to update the lesson',
    detail: 'The AI teacher narrates each slide. Ask anything in chat and the lesson adapts in real time.',
    defaultAgentId: 'teacher-narration-teacher',
  },
  {
    id: 'story-quest',
    emoji: '📖',
    label: 'Story Quest',
    description: 'Real Indian stories that reveal the physics behind everyday life',
    detail: 'Every concept starts with a named Indian scenario — then the teacher pulls out the physics.',
    defaultAgentId: 'story-quest-narrator',
    isWorkflow: true,
  },
  {
    id: 'exam-dojo',
    emoji: '⚔️',
    label: 'Exam Dojo',
    description: 'CBSE-style MCQs, assertion-reason & past-paper practice',
    detail: 'Auto-suggested after any lesson. Drill the same topic with exam-pattern questions.',
    defaultAgentId: 'exam-dojo-coach',
    isWorkflow: true,
  },
  {
    id: 'lab-without-walls',
    emoji: '🔬',
    label: 'Lab',
    description: 'Virtual NCERT experiments — manipulate variables, observe results',
    detail: 'Activated automatically when the lesson topic has a prescribed NCERT experiment.',
    defaultAgentId: 'lab-instructor',
    isWorkflow: true,
  },
  {
    id: 'rapid-revision',
    emoji: '⚡',
    label: 'Rapid Revision',
    description: 'Spaced-repetition flashcard sprint to lock in what you just learned',
    detail: 'Runs after any lesson. Easy → hard card ramp, weak-spot loop, 10-minute sprint.',
    defaultAgentId: 'rapid-revision-coach',
    isWorkflow: true,
  },
  {
    id: 'openmaic',
    emoji: '🎓',
    label: 'OpenVidya Classic',
    description: 'AI classroom with teacher, students & discussion',
    detail: 'Full classroom simulation — teacher, assistant, and student personas all participate.',
  },
  {
    id: 'debate-sabha',
    emoji: '🗣️',
    label: 'Debate Sabha',
    description: 'AI personas argue both sides — you referee',
    comingSoon: true,
  },
];

export const DEFAULT_EDUCATION_MODE: EducationMode = 'teacher-narration';

export function getModeConfig(id: EducationMode): ModeConfig {
  return EDUCATION_MODES.find((m) => m.id === id) ?? EDUCATION_MODES[0];
}

export function isValidMode(value: unknown): value is EducationMode {
  return EDUCATION_MODES.some((m) => m.id === value);
}

/** Core modes shown as primary choices on the landing page */
export const PRIMARY_MODES = EDUCATION_MODES.filter((m) => !m.isWorkflow && !m.comingSoon);

/** Workflow modes shown as feature chips / secondary actions */
export const WORKFLOW_MODES = EDUCATION_MODES.filter((m) => m.isWorkflow && !m.comingSoon);
