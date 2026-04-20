/**
 * KB Lookup Service
 *
 * Matches a free-form topic string against the three KB data files:
 *   kb-data/questions_registry.json  — CBSE questions
 *   kb-data/concept-graph.json       — concept dependency chains
 *   kb-data/lab-registry.json        — NCERT lab experiments
 *
 * Returns null / empty when no match — callers fall back to pure LLM generation.
 * Class number is optional; when omitted all classes are searched.
 */

import questionsRaw from '@/kb-data/questions_registry.json';
import conceptsRaw from '@/kb-data/concept-graph.json';
import labsRaw from '@/kb-data/lab-registry.json';

// ─── Raw types (mirrors JSON schema) ────────────────────────────────────────

export interface KBQuestion {
  id: string;
  subject: string;
  class: number;
  chapter: string;
  chapterNumber: number;
  topic: string;
  year: number;
  paper: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'single' | 'multiple' | 'assertion-reason' | 'short_answer';
  text: string;
  options?: string[];
  answer: string;
  explanation: string;
  trap?: string;
  marks: number;
  assertion?: string;
  reason?: string;
}

export interface KBConcept {
  id: string;
  name: string;
  order: number;
  prerequisites: string[];
  keyFormula: string;
  oneliner: string;
  examWeight: 'high' | 'medium' | 'low';
  commonError: string;
}

export interface KBConceptChapter {
  chapterNumber: number;
  chapterName: string;
  subject: string;
  class: number;
  concepts: KBConcept[];
}

export interface KBLab {
  id: string;
  class: number;
  subject: string;
  chapterNumber: number;
  chapterName: string;
  experimentName: string;
  ncertLabNumber: string;
  objective: string;
  apparatus: string[];
  variables: { independent: string[]; dependent: string[]; controlled: string[] };
  keyObservation: string;
  commonMistakes: string[];
  topics: string[];
}

// ─── Typed KB data ────────────────────────────────────────────────────────────

const QUESTIONS = questionsRaw as KBQuestion[];
const CONCEPTS = conceptsRaw as KBConceptChapter[];
const LABS = labsRaw as KBLab[];

// ─── Matching helpers ────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'in', 'to', 'for', 'is', 'are',
  'what', 'how', 'why', 'about', 'explain', 'describe', 'teach', 'learn',
  'me', 'my', 'i', 'on', 'with', 'class', 'chapter', 'ncert', 'cbse',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

function scoreMatch(tokens: string[], ...fields: string[]): number {
  const haystack = fields.join(' ').toLowerCase();
  return tokens.filter((t) => haystack.includes(t)).length;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Find questions matching topic + optional class filter.
 * Returns up to `limit` questions, prioritising high-weight / hard difficulty.
 */
export function findQuestions(
  topic: string,
  classNum?: number | null,
  limit = 20,
): KBQuestion[] {
  const tokens = tokenize(topic);
  if (tokens.length === 0) return [];

  return QUESTIONS.filter((q) => {
    if (classNum && q.class !== classNum) return false;
    return scoreMatch(tokens, q.chapter, q.topic, q.text) > 0;
  })
    .map((q) => ({ q, score: scoreMatch(tokens, q.chapter, q.topic, q.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.q);
}

/**
 * Find the best-matching concept chapter for a topic.
 * Returns null if nothing scores above 0.
 */
export function findConceptChapter(
  topic: string,
  classNum?: number | null,
): KBConceptChapter | null {
  const tokens = tokenize(topic);
  if (tokens.length === 0) return null;

  let best: KBConceptChapter | null = null;
  let bestScore = 0;

  for (const chapter of CONCEPTS) {
    if (classNum && chapter.class !== classNum) continue;
    const conceptNames = chapter.concepts.map((c) => c.name).join(' ');
    const score = scoreMatch(tokens, chapter.chapterName, conceptNames);
    if (score > bestScore) {
      bestScore = score;
      best = chapter;
    }
  }

  return bestScore > 0 ? best : null;
}

/**
 * Find labs matching topic + optional class filter.
 */
export function findLabs(
  topic: string,
  classNum?: number | null,
  limit = 5,
): KBLab[] {
  const tokens = tokenize(topic);
  if (tokens.length === 0) return [];

  return LABS.filter((lab) => {
    if (classNum && lab.class !== classNum) return false;
    return scoreMatch(tokens, lab.chapterName, lab.experimentName, lab.topics.join(' ')) > 0;
  })
    .map((lab) => ({
      lab,
      score: scoreMatch(tokens, lab.chapterName, lab.experimentName, lab.topics.join(' ')),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.lab);
}

// ─── Prompt context builders (one per mode) ─────────────────────────────────

function formatQuestionsForContext(questions: KBQuestion[]): string {
  if (questions.length === 0) return '';
  return questions
    .map(
      (q, i) =>
        `Q${i + 1} [${q.difficulty.toUpperCase()} | ${q.type} | ${q.paper} ${q.year}]\n` +
        `${q.text}\n` +
        (q.options ? q.options.map((o) => `  ${o}`).join('\n') + '\n' : '') +
        `Answer: ${q.answer}\n` +
        `Explanation: ${q.explanation}\n` +
        (q.trap ? `Trap: ${q.trap}` : ''),
    )
    .join('\n\n');
}

function formatConceptsForContext(chapter: KBConceptChapter): string {
  return (
    `Chapter: ${chapter.chapterName} (Class ${chapter.class} ${chapter.subject})\n` +
    `Concept chain (in dependency order):\n` +
    chapter.concepts
      .map(
        (c) =>
          `  ${c.order}. ${c.name}\n` +
          `     Formula: ${c.keyFormula}\n` +
          `     Key: ${c.oneliner}\n` +
          `     Common error: ${c.commonError}\n` +
          `     Exam weight: ${c.examWeight}` +
          (c.prerequisites.length > 0 ? `\n     Requires: ${c.prerequisites.join(', ')}` : ''),
      )
      .join('\n')
  );
}

function formatLabsForContext(labs: KBLab[]): string {
  if (labs.length === 0) return '';
  return labs
    .map(
      (lab) =>
        `Experiment: ${lab.experimentName} (${lab.ncertLabNumber})\n` +
        `Chapter: ${lab.chapterName} | Class ${lab.class} ${lab.subject}\n` +
        `Objective: ${lab.objective}\n` +
        `Apparatus: ${lab.apparatus.join(', ')}\n` +
        `Key observation: ${lab.keyObservation}\n` +
        `Common mistakes: ${lab.commonMistakes.join('; ')}`,
    )
    .join('\n\n');
}

/**
 * Main entry point: build a KB context string to inject into the outline prompt.
 * Returns empty string when no KB data matches — prompt stays unchanged.
 */
export function buildKBContext(
  topic: string,
  classNum: number | null | undefined,
  mode: string | undefined,
): string {
  const cls = classNum ?? null;
  const parts: string[] = [];

  if (mode === 'rapid-revision') {
    const chapter = findConceptChapter(topic, cls);
    if (chapter) {
      parts.push(
        `## KB: Concept Chain (use this as the basis for your concept DAG — do not invent different concepts)\n\n` +
        formatConceptsForContext(chapter),
      );
    }
    const questions = findQuestions(topic, cls, 10);
    if (questions.length > 0) {
      parts.push(
        `## KB: Reference Questions (use these as quiz question models — adapt wording, keep difficulty)\n\n` +
        formatQuestionsForContext(questions),
      );
    }
  } else if (mode === 'exam-dojo') {
    const questions = findQuestions(topic, cls, 20);
    if (questions.length > 0) {
      parts.push(
        `## KB: Verified CBSE Questions (use these AS-IS or rephrase slightly — these are real exam patterns)\n\n` +
        formatQuestionsForContext(questions),
      );
    }
    const chapter = findConceptChapter(topic, cls);
    if (chapter) {
      parts.push(
        `## KB: Concept Structure (use for organising drill order)\n\n` +
        formatConceptsForContext(chapter),
      );
    }
  } else if (mode === 'lab-without-walls') {
    const labs = findLabs(topic, cls);
    if (labs.length > 0) {
      parts.push(
        `## KB: NCERT Lab Experiments (use these as the basis for interactive scenes — match apparatus and objectives exactly)\n\n` +
        formatLabsForContext(labs),
      );
    }
  } else {
    // teacher-narration, story-quest, openmaic — inject concept structure as light guidance
    const chapter = findConceptChapter(topic, cls);
    if (chapter) {
      parts.push(
        `## KB: Concept Structure for Reference (use to ensure correct concept ordering and terminology)\n\n` +
        formatConceptsForContext(chapter),
      );
    }
  }

  if (parts.length === 0) return '';
  return parts.join('\n\n---\n\n');
}
