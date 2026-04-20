/**
 * Stage 1: Generate scene outlines from user requirements.
 * Also contains outline fallback logic.
 */

import { nanoid } from 'nanoid';
import { MAX_PDF_CONTENT_CHARS, MAX_VISION_IMAGES } from '@/lib/constants/generation';
import type {
  UserRequirements,
  SceneOutline,
  PdfImage,
  ImageMapping,
} from '@/lib/types/generation';
import { buildPrompt, PROMPT_IDS } from './prompts';
import { formatImageDescription, formatImagePlaceholder } from './prompt-formatters';
import { parseJsonResponse } from './json-repair';
import { uniquifyMediaElementIds } from './scene-builder';
import type { AICallFn, GenerationResult, GenerationCallbacks } from './pipeline-types';
import { buildKBContext } from '@/lib/kb/lookup';
import { createLogger } from '@/lib/logger';
const log = createLogger('Generation');

/**
 * Generate scene outlines from user requirements
 * Now uses simplified UserRequirements with just requirement text and language
 */
export async function generateSceneOutlinesFromRequirements(
  requirements: UserRequirements,
  pdfText: string | undefined,
  pdfImages: PdfImage[] | undefined,
  aiCall: AICallFn,
  callbacks?: GenerationCallbacks,
  options?: {
    visionEnabled?: boolean;
    imageMapping?: ImageMapping;
    imageGenerationEnabled?: boolean;
    videoGenerationEnabled?: boolean;
    researchContext?: string;
    teacherContext?: string;
  },
): Promise<GenerationResult<SceneOutline[]>> {
  // Build available images description for the prompt
  let availableImagesText =
    'No images available';
  let visionImages: Array<{ id: string; src: string }> | undefined;

  if (pdfImages && pdfImages.length > 0) {
    if (options?.visionEnabled && options?.imageMapping) {
      // Vision mode: split into vision images (first N) and text-only (rest)
      const allWithSrc = pdfImages.filter((img) => options.imageMapping![img.id]);
      const visionSlice = allWithSrc.slice(0, MAX_VISION_IMAGES);
      const textOnlySlice = allWithSrc.slice(MAX_VISION_IMAGES);
      const noSrcImages = pdfImages.filter((img) => !options.imageMapping![img.id]);

      const visionDescriptions = visionSlice.map((img) =>
        formatImagePlaceholder(img, requirements.language),
      );
      const textDescriptions = [...textOnlySlice, ...noSrcImages].map((img) =>
        formatImageDescription(img, requirements.language),
      );
      availableImagesText = [...visionDescriptions, ...textDescriptions].join('\n');

      visionImages = visionSlice.map((img) => ({
        id: img.id,
        src: options.imageMapping![img.id],
        width: img.width,
        height: img.height,
      }));
    } else {
      // Text-only mode: full descriptions
      availableImagesText = pdfImages
        .map((img) => formatImageDescription(img, requirements.language))
        .join('\n');
    }
  }

  // Build user profile string for prompt injection
  const profileParts: string[] = [];
  if (requirements.userNickname || requirements.userBio) {
    profileParts.push(
      `## Student Profile\n\nStudent: ${requirements.userNickname || 'Unknown'}${requirements.userBio ? ` — ${requirements.userBio}` : ''}\n\nConsider this student's background when designing the course. Adapt difficulty, examples, and teaching approach accordingly.\n\n---`,
    );
  }
  if (requirements.curriculumContext) {
    profileParts.push(requirements.curriculumContext);
  }
  const userProfileText = profileParts.join('\n\n');

  // Build media generation policy based on enabled flags
  const imageEnabled = options?.imageGenerationEnabled ?? false;
  const videoEnabled = options?.videoGenerationEnabled ?? false;
  let mediaGenerationPolicy = '';
  if (!imageEnabled && !videoEnabled) {
    mediaGenerationPolicy =
      '**IMPORTANT: Do NOT include any mediaGenerations in the outlines. Both image and video generation are disabled.**';
  } else if (!imageEnabled) {
    mediaGenerationPolicy =
      '**IMPORTANT: Do NOT include any image mediaGenerations (type: "image") in the outlines. Image generation is disabled. Video generation is allowed.**';
  } else if (!videoEnabled) {
    mediaGenerationPolicy =
      '**IMPORTANT: Do NOT include any video mediaGenerations (type: "video") in the outlines. Video generation is disabled. Image generation is allowed.**';
  }

  // Build education-mode-specific scene generation guidance
  const educationModeContext = buildEducationModeContext(requirements.educationMode);

  // KB lookup — matches topic against NCERT/CBSE data; empty string if no match (graceful fallback)
  const kbContext = buildKBContext(
    requirements.requirement,
    requirements.studentClass ?? null,
    requirements.educationMode,
  );

  // Use simplified prompt variables
  const prompts = buildPrompt(PROMPT_IDS.REQUIREMENTS_TO_OUTLINES, {
    requirement: requirements.requirement,
    language: requirements.language,
    pdfContent: pdfText ? pdfText.substring(0, MAX_PDF_CONTENT_CHARS) : 'None',
    availableImages: availableImagesText,
    userProfile: userProfileText,
    mediaGenerationPolicy,
    educationModeContext,
    kbContext: kbContext || 'No KB match for this topic — generate from first principles.',
    researchContext: options?.researchContext || 'None',
    teacherContext: options?.teacherContext || '',
  });

  if (!prompts) {
    return { success: false, error: 'Prompt template not found' };
  }

  try {
    callbacks?.onProgress?.({
      currentStage: 1,
      overallProgress: 20,
      stageProgress: 50,
      statusMessage: '正在分析需求，生成场景大纲...',
      scenesGenerated: 0,
      totalScenes: 0,
    });

    const response = await aiCall(prompts.system, prompts.user, visionImages);
    const outlines = parseJsonResponse<SceneOutline[]>(response);

    if (!outlines || !Array.isArray(outlines)) {
      return {
        success: false,
        error: 'Failed to parse scene outlines response',
      };
    }
    // Ensure IDs, order, and language
    const enriched = outlines.map((outline, index) => ({
      ...outline,
      id: outline.id || nanoid(),
      order: index + 1,
      language: requirements.language,
      educationMode: requirements.educationMode,
    }));

    // Replace sequential gen_img_N/gen_vid_N with globally unique IDs
    const result = uniquifyMediaElementIds(enriched);

    callbacks?.onProgress?.({
      currentStage: 1,
      overallProgress: 50,
      stageProgress: 100,
      statusMessage: `已生成 ${result.length} 个场景大纲`,
      scenesGenerated: 0,
      totalScenes: result.length,
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Apply type fallbacks for outlines that can't be generated as their declared type.
 * - interactive without interactiveConfig → slide
 * - pbl without pblConfig or languageModel → slide
 */
export function applyOutlineFallbacks(
  outline: SceneOutline,
  hasLanguageModel: boolean,
): SceneOutline {
  if (outline.type === 'interactive' && !outline.interactiveConfig) {
    log.warn(
      `Interactive outline "${outline.title}" missing interactiveConfig, falling back to slide`,
    );
    return { ...outline, type: 'slide' };
  }
  if (outline.type === 'pbl' && (!outline.pblConfig || !hasLanguageModel)) {
    log.warn(
      `PBL outline "${outline.title}" missing pblConfig or languageModel, falling back to slide`,
    );
    return { ...outline, type: 'slide' };
  }
  return outline;
}

/**
 * Build mode-specific instructions injected into the outline generation prompt.
 * Tells the LLM how to bias scene types and question styles for each mode.
 */
function buildEducationModeContext(mode: string | undefined): string {
  switch (mode) {
    case 'exam-dojo':
      return `## Exam Dojo Mode — Concept Drill Pattern
The student is preparing for CBSE board or competitive exams. This session drills each major concept of the topic through a predict → attempt → understand → reinforce loop. The Coach doesn't lecture — they expose exam traps and build the student's answer instinct.

**STRICT scene pattern — repeat for every major concept:**
1. **"Probable Q" slide** — one high-probability exam question for this concept (framed as a challenge, not a lesson).
   - title: the concept name (e.g. "Ohm's Law — Examiner's Trap")
   - keyPoints: ["Probable question type: assertion-reason", "Common trap: confusing V∝I with I∝V", "CBSE 2023 asked this — 3-marker"]
   - description: one line the Coach uses to set stakes: "This came up in 4 of the last 6 CBSE papers."
2. **Primary quiz scene** — 3 questions on this concept in CBSE exam pattern:
   - Q1: MCQ (single correct) — medium difficulty, tests application not definition
   - Q2: Assertion-Reason — always include one per concept
   - Q3: Case-based or numerical — hard, tests whether student can apply under pressure
   - questionTypes: ["single", "multiple"], difficulty: "medium" to "hard"
3. **Solution slide** — coach walkthrough of the correct approach:
   - keyPoints: step-by-step solution logic (max 3 steps), the examiner's trap exposed, the 1-line shortcut
   - title: "Solution: [concept name]"
   - NO re-teaching — just the answer path and the trap
4. **Practice quiz** — 2 questions of the same concept, different surface:
   - One rephrased version of a question the student got wrong (or a parallel if all correct)
   - One "harder variant" question
   - difficulty: "hard", questionTypes: ["single"]

**Bookend scenes:**
- **First scene**: intro slide — topic, concept count, "What the examiner wants to see"
- **Last scene**: "Weak Spots" slide — lists 2–3 concepts where student struggled; keyPoints = what specifically to review

**PYQ interleaving rule:** In every primary quiz scene, at least one question must be explicitly framed as a previous year question ("CBSE 2022 Q3:", "JEE Mains 2021:"). The LLM should generate questions in the style and difficulty of those exams — not actual questions, but indistinguishable in pattern.

**No game scenes. No interactive scenes. No pbl scenes.**
Total scenes: (concepts × 3) + 2 bookends. 3–4 concepts = 11–14 scenes.`;

    case 'story-quest':
      return `## Story Quest Mode — Scene Generation Rules
Generate a story-driven physics lesson rooted in real Indian life scenarios. Follow this repeating pattern for each concept:

**Scene pattern per concept (repeat for each topic):**
1. **Story slide** — open with a vivid, specific Indian scene (auto-rickshaw braking, cricket ball trajectory, dosa on a tava, kite in Ahmedabad, monsoon rain on a tin roof, ceiling fan, pressure cooker). Request a video generation if the scene involves motion or change.
2. **"Why?" slide** — pose exactly one question the story raises. No answers yet.
3. **Concept slide** — explain the physics that answers the story question. Formula + plain-language meaning. Reference the story explicitly.
4. **Real-world applications slide** — show 2–3 more places this same physics appears in Indian daily life. Use images.
5. **Quiz scene** — 2 questions, both story-referenced ("In the auto-rickshaw story, which law explains..."). Difficulty: medium.

**Media generation rules for Story Quest:**
- Request video generation for any scene involving motion, forces, waves, heat, or electricity — show the story scene as it unfolds
- Request images for application slides — real photos, not diagrams
- Slides must be visual-first: large image/video + max 3 bullet points

**Total scenes:** 10–15. Each Indian scenario must be specific and named (not generic "a moving object" — say "Rohit Sharma's pull shot at Wankhede").`;

    case 'lab-without-walls':
      return `## Lab Without Walls Mode — Scene Generation Rules
Generate a hands-on virtual lab session matching NCERT prescribed experiments.

**Scene pattern per experiment:**
1. **Brief slide** — experiment name (as in NCERT lab manual), objective in one sentence, apparatus list
2. **Interactive scene** — the simulation itself. Must have a complete interactiveConfig with:
   - conceptName: the NCERT experiment name
   - designIdea: describe every interactive element (sliders for voltage/angle/concentration, real-time meter readings, observable colour changes, graph updates)
   - subject: Physics / Chemistry / Biology / Maths
3. **Observation quiz** — 2–3 questions asking student to record and explain observations

**Interactive scene requirements:**
- Simulate real apparatus: galvanometer, ammeter, voltmeter, prism, lens, burette, litmus paper, spring balance
- Students must manipulate at least 2 variables and observe the result
- Include measurement readings that update in real time
- Show the experiment failing under wrong conditions (safety awareness)

**Total scenes:** 6–10. Maximum 3 interactive scenes — each must justify its complexity.`;

    case 'teacher-narration':
      return `## Teacher Narration Mode — Scene Generation Rules
Generate a narration-first lesson for 1:1 delivery. Each slide is a spoken beat. Vary the teaching style naturally across slides — a good teacher doesn't explain everything the same way.

**Scene ratios:**
- **65% slide scenes** — mix of styles (see below)
- **20% quiz scenes** — every 3–4 slides; mix single + short_answer; difficulty easy→medium
- **15% conversation scenes** — natural pause points where teacher checks in or invites a question

**Slide style variety — distribute these across the lesson naturally:**
- **Direct explanation slides** (majority): one concept, phrase-length keyPoints (≤8 words), teacher expands verbally
- **Example-first slides**: open with a concrete real-world example BEFORE stating the concept — title like "What happens when you brake suddenly?"
- **Story/analogy slides**: frame the concept as a brief narrative or analogy — an Indian scene, a familiar situation, something the student has experienced
- **Visual slides**: image or video generation requested — concept shown, minimal text, teacher narrates around it
- Do NOT label slide types. Just write them differently. A mix of ~2–3 example/story slides per lesson feels natural.

**Slide design:**
- keyPoints: phrase-length (≤8 words each) — the teacher expands them verbally, never reads them
- description field: the teacher's opening line for that slide — one sentence that hooks attention
- Request image/video mediaGenerations freely — visual slides are easiest to narrate

**Flow:**
1. Opening slide — topic + why it matters today
2. Concept slides with varied styles (bulk)
3. Quiz every 3–4 slides
4. Closing slide — what was covered + what's next

**Total scenes:** 8–12. No pbl scenes.`;

    case 'rapid-revision':
      return `## Rapid Revision Mode — Concept Chain Rules
The student already knows this topic at a surface level. This session re-activates memory through a structured concept chain — not a lecture. Think of it as walking a dependency tree: foundational concepts first, derived concepts after.

**STRICT scene pattern — repeat for every concept in the topic:**
1. **Concept slide** — ONE concept per slide. Title = concept name (e.g. "Newton's Second Law").
   - keyPoints: exactly 2–3 items. Each ≤ 8 words. Written as memory triggers, not explanations.
     Example: ["F = ma", "Force ∝ acceleration (mass constant)", "Direction of force = direction of a"]
   - description: one sentence the coach can say to re-activate the concept
   - NO lengthy explanation — this is a recall cue, not a lesson
2. **Quiz scene** (immediately after each concept slide) — 2–3 questions on that concept only.
   - questionTypes: ["single"] — one correct answer, fast to pick
   - quizConfig.difficulty: easy for foundational concepts, medium for derived ones
   - quizConfig.questionCount: 2–3
   - Questions test application, not definition recall

**Bookend scenes:**
- **First scene**: one intro slide — topic name + concept count + "~10 min sprint"
- **Last scene**: one "Weak Spots" slide — title "Concepts to Review", keyPoints list the hardest 2–3 concepts from the chain (Flash fills this in verbally based on performance, but the slide anchors it)

**Concept ordering rules (DAG):**
- Order concepts prerequisite-first: if concept B requires concept A, A comes before B
- 3–6 concepts total — pick the most testable ones, not all of them
- Each concept+quiz pair is one "node" in the chain

**No game scenes. No interactive scenes. No pbl scenes.**
Total scenes: (concepts × 2) + 2 bookends = 8–14 scenes for 3–6 concepts.`;

    default:
      return '';
  }
}
