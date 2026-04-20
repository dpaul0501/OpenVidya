// Stage and Scene data types
import type { Slide } from '@/lib/types/slides';
import type { Action } from '@/lib/types/action';
import type { PBLProjectConfig } from '@/lib/pbl/types';

export type SceneType = 'slide' | 'quiz' | 'interactive' | 'pbl' | 'conversation' | 'game';

export type StageMode = 'autonomous' | 'playback';

export type Whiteboard = Omit<Slide, 'theme' | 'turningMode' | 'sectionTag' | 'type'>;

/**
 * Stage - Represents the entire classroom/course
 */
export interface Stage {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  // Stage metadata
  language?: string;
  style?: string;
  // Whiteboard data
  whiteboard?: Whiteboard[];
  // Agent IDs selected when this classroom was created
  agentIds?: string[];
  // Learning mode used to generate this classroom
  educationMode?: import('@/lib/config/education-modes').EducationMode;
}

/**
 * Scene - Represents a single page/scene in the course
 */
export interface Scene {
  id: string;
  stageId: string; // ID of the parent stage (for data integrity checks)
  type: SceneType;
  title: string;
  order: number; // Display order

  // Type-specific content
  content: SceneContent;

  // Actions to execute during playback
  actions?: Action[];

  // Whiteboards to explain deeply
  whiteboards?: Slide[];

  // Multi-agent discussion configuration
  multiAgent?: {
    enabled: boolean; // Enable multi-agent for this scene
    agentIds: string[]; // Which agents to include (from registry)
    directorPrompt?: string; // Optional custom director instructions
  };

  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Scene content based on type
 */
export type SceneContent = SlideContent | QuizContent | InteractiveContent | PBLContent | ConversationContent | GameContent;

/**
 * Slide content - PPTist Canvas data
 */
export interface SlideContent {
  type: 'slide';
  // PPTist slide data structure
  canvas: Slide;
}

/**
 * Quiz content - React component props/data
 */
export interface QuizContent {
  type: 'quiz';
  questions: QuizQuestion[];
}

export interface QuizOption {
  label: string; // Display text
  value: string; // Selection key: "A", "B", "C", "D"
}

export interface QuizQuestion {
  id: string;
  type: 'single' | 'multiple' | 'short_answer';
  question: string;
  options?: QuizOption[];
  answer?: string[]; // Correct answer values: ["A"], ["A","C"], or undefined for text
  analysis?: string; // Explanation shown after grading
  commentPrompt?: string; // Grading guidance for text questions
  hasAnswer?: boolean; // Whether auto-grading is possible
  points?: number; // Points per question (default 1)
}

/**
 * Interactive content - Interactive web page (iframe)
 */
export interface InteractiveContent {
  type: 'interactive';
  url: string; // URL of the interactive page
  // Optional: embedded HTML content
  html?: string;
}

/**
 * PBL content - Project-based learning
 */
export interface PBLContent {
  type: 'pbl';
  projectConfig: PBLProjectConfig;
}

/**
 * Conversation content - Speaking practice and dialogue
 */
export interface ConversationContent {
  type: 'conversation';
  scenario: string; // The conversation scenario or prompt
  participants: ConversationParticipant[];
  initialMessage?: string; // Starting message from AI
}

export interface ConversationParticipant {
  id: string;
  name: string;
  role: string; // e.g., "teacher", "student", "AI assistant"
  avatar?: string;
}

/**
 * Game content - Gamified learning with challenges and scoring
 */
export interface GameContent {
  type: 'game';
  gameType: 'quiz' | 'puzzle' | 'challenge' | 'multiplayer'; // Game mode
  title: string;
  description: string;
  rulesHtml?: string; // HTML rules display
  scoringSystem?: {
    pointsPerCorrect: number;
    pointsPerWrong: number;
    timeBonus?: number;
  };
  challenges?: GameChallenge[];
}

export interface GameChallenge {
  id: string;
  question: string;
  options?: string[];
  correctAnswer?: string | number;
  explanation?: string;
  points?: number;
}

// Re-export generation types for convenience
export type {
  UserRequirements,
  SceneOutline,
  GenerationSession,
  GenerationProgress,
  UploadedDocument,
} from './generation';
