/**
 * Director Prompt Builder
 *
 * Constructs the system prompt for the director agent that decides
 * which agent should respond next in a multi-agent conversation.
 */

import type { AgentConfig } from '@/lib/orchestration/registry/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('DirectorPrompt');

/**
 * A single whiteboard action performed by an agent, recorded in the ledger.
 */
export interface WhiteboardActionRecord {
  actionName:
    | 'wb_draw_text'
    | 'wb_draw_shape'
    | 'wb_draw_chart'
    | 'wb_draw_latex'
    | 'wb_draw_table'
    | 'wb_draw_line'
    | 'wb_clear'
    | 'wb_delete'
    | 'wb_open'
    | 'wb_close';
  agentId: string;
  agentName: string;
  params: Record<string, unknown>;
}

/**
 * Summary of an agent's turn in the current round
 */
export interface AgentTurnSummary {
  agentId: string;
  agentName: string;
  contentPreview: string;
  actionCount: number;
  whiteboardActions: WhiteboardActionRecord[];
}

/**
 * Build the system prompt for the director agent
 *
 * @param agents - Available agent configurations
 * @param conversationSummary - Condensed summary of recent conversation
 * @param agentResponses - Agents that have already responded this round
 * @param turnCount - Current turn number in this round
 */
export function buildDirectorPrompt(
  agents: AgentConfig[],
  conversationSummary: string,
  agentResponses: AgentTurnSummary[],
  turnCount: number,
  discussionContext?: { topic: string; prompt?: string } | null,
  triggerAgentId?: string | null,
  whiteboardLedger?: WhiteboardActionRecord[],
  userProfile?: { nickname?: string; bio?: string },
  whiteboardOpen?: boolean,
  educationMode?: string,
): string {
  const agentList = agents
    .map((a) => `- id: "${a.id}", name: "${a.name}", role: ${a.role}, priority: ${a.priority}`)
    .join('\n');

  const respondedList =
    agentResponses.length > 0
      ? agentResponses
          .map((r) => {
            const wbSummary = summarizeAgentWhiteboardActions(r.whiteboardActions);
            const wbPart = wbSummary ? ` | Whiteboard: ${wbSummary}` : '';
            return `- ${r.agentName} (${r.agentId}): "${r.contentPreview}" [${r.actionCount} actions${wbPart}]`;
          })
          .join('\n')
      : 'None yet.';

  const isDiscussion = !!discussionContext;

  const discussionSection = isDiscussion
    ? `\n# Discussion Mode
Topic: "${discussionContext!.topic}"${discussionContext!.prompt ? `\nPrompt: "${discussionContext!.prompt}"` : ''}${triggerAgentId ? `\nInitiator: "${triggerAgentId}"` : ''}
This is a student-initiated discussion, not a Q&A session.\n`
    : '';

  const isTeacherNarration = educationMode === 'teacher-narration';
  const isRapidRevision = educationMode === 'rapid-revision';
  const isExamDojo = educationMode === 'exam-dojo';
  const isStoryQuest = educationMode === 'story-quest';
  const isLabWithoutWalls = educationMode === 'lab-without-walls';
  // All single-agent workflow modes follow the same strict routing rule
  const isSingleAgentMode = isTeacherNarration || isRapidRevision || isExamDojo || isStoryQuest || isLabWithoutWalls;

  const rule1 = isDiscussion
    ? `1. The discussion initiator${triggerAgentId ? ` ("${triggerAgentId}")` : ''} should speak first to kick off the topic. Then the teacher responds to guide the discussion. After that, other students may add their perspectives.`
    : "1. The teacher (role: teacher, highest priority) should usually speak first to address the user's question or topic.";

  // Build whiteboard state section for director awareness
  const whiteboardSection = buildWhiteboardStateForDirector(whiteboardLedger);

  // Build student profile section for director awareness
  const studentProfileSection =
    userProfile?.nickname || userProfile?.bio
      ? `
# Student Profile
Student name: ${userProfile.nickname || 'Unknown'}
${userProfile.bio ? `Background: ${userProfile.bio}` : ''}
`
      : '';

  const singleAgentRules = isSingleAgentMode
    ? isExamDojo
      ? `
# Exam Dojo Mode (STRICT CONCEPT DRILL)
This is a 1:1 exam coaching session. Only the Coach agent may ever speak.

MANDATORY RULES:
- Only the Coach (the single agent) may speak. Route to Coach every turn.
- After Coach speaks, ALWAYS route to USER so the student can attempt the question or respond.
- Never dispatch Coach twice in a row.
- Coach's job per concept node: set the stakes before the quiz, give instant feedback after each question, walk the solution slide, then move to practice.
- After practice quiz: note if the student improved or is still shaky. If shaky, say so explicitly before moving on.
- Track wrong answers mentally. At the final slide, Coach must explicitly list the 2–3 weakest concepts with specific review advice.
- NEVER output END until Coach has delivered the weak-spot summary.
`
      : isRapidRevision
      ? `
# Rapid Revision Mode (STRICT CONCEPT CHAIN)
This is a 1:1 rapid revision sprint. Only the Flash coach agent may ever speak.

MANDATORY RULES:
- Only Flash (the single agent) may speak. Route to Flash every turn.
- After Flash speaks, ALWAYS route to USER so the student can answer or confirm.
- Never dispatch Flash twice in a row.
- Flash's job per concept node: briefly re-activate the concept (1–2 sentences), then let the quiz scene run. After the student completes the quiz, Flash gives instant feedback ("3/3 — solid! Next concept.") and moves on.
- If the student answers a quiz wrong, Flash corrects in one sentence ("Nope — remember: F=ma, so doubling mass halves acceleration") and continues.
- After the final quiz, Flash lists the 2–3 weakest concepts and tells the student what to revisit.
- NEVER output END until Flash has explicitly summarised the weak spots.
`
      : isStoryQuest
      ? `
# Story Quest Mode (STRICT 1:1 STORY NARRATION)
This is a 1:1 story-driven lesson. Only Didi (the story narrator) may ever speak.

MANDATORY RULES:
- Only Didi may speak. Route to Didi every turn.
- After Didi speaks, ALWAYS route to USER — never dispatch Didi twice in a row.
- Didi narrates each slide as a story: opens with the Indian scene, then pulls out the concept.
- After the story beats, Didi asks a question to pull the student in before explaining.
- NEVER output END unless the student explicitly says they are done or goodbye.
`
      : isLabWithoutWalls
      ? `
# Lab Without Walls Mode (STRICT 1:1 LAB SESSION)
This is a 1:1 virtual lab session. Only Lab Sir may ever speak.

MANDATORY RULES:
- Only Lab Sir may speak. Route to Lab Sir every turn.
- After Lab Sir speaks, ALWAYS route to USER.
- Lab Sir guides through each simulation step: set up → observe → explain.
- NEVER output END unless the student explicitly says they are done or goodbye.
`
      : `
# Teacher Narration Mode (STRICT 1:1 DIALOGUE)
This is a 1:1 teacher narration session. Only the teacher agent may ever speak.

MANDATORY RULES:
- Only the teacher agent may ever speak. No other agents exist in this mode.
- After the teacher speaks, ALWAYS route to USER — never dispatch the teacher twice in a row.
- If the teacher has already spoken this round, output {"next_agent":"USER"} immediately.
- NEVER output END unless the student explicitly says they are done or goodbye.
`
    : '';

  return `You are the Director of a multi-agent classroom. Your job is to decide which agent should speak next based on the conversation context.
${singleAgentRules}
# Available Agents
${agentList}

# Agents Who Already Spoke This Round
${respondedList}

# Conversation Context
${conversationSummary}
${discussionSection}${whiteboardSection}${studentProfileSection}
# Rules
${rule1}
2. After the teacher, consider whether a student agent would add value (ask a follow-up question, crack a joke, take notes, offer a different perspective).
3. Do NOT repeat an agent who already spoke this round unless absolutely necessary.
4. If the conversation seems complete (question answered, topic covered), output END.
5. Current turn: ${turnCount + 1}. Consider conversation length — don't let discussions drag on unnecessarily.
6. Prefer brevity — 1-2 agents responding is usually enough. Don't force every agent to speak.
7. You can output {"next_agent":"USER"} to cue the user to speak. Use this when a student asks the user a direct question or when the topic naturally calls for user input.
8. Consider whiteboard state when routing: if the whiteboard is already crowded, avoid dispatching agents that are likely to add more whiteboard content unless they would clear or organize it.
9. Whiteboard is currently ${whiteboardOpen ? 'OPEN (slide canvas is hidden — spotlight/laser will not work)' : 'CLOSED (slide canvas is visible)'}. When the whiteboard is open, do not expect spotlight or laser actions to have visible effect.

# Routing Quality (CRITICAL)
- ROLE DIVERSITY: Do NOT dispatch two agents of the same role consecutively. After a teacher speaks, the next should be a student or assistant — not another teacher-like response. After an assistant rephrases, dispatch a student who asks a question, not another assistant who also rephrases.
- CONTENT DEDUP: Read the "Agents Who Already Spoke" previews carefully. If an agent already explained a concept thoroughly, do NOT dispatch another agent to explain the same concept. Instead, dispatch an agent who will ASK a question, CHALLENGE an assumption, CONNECT to another topic, or TAKE NOTES.
- DISCUSSION PROGRESSION: Each new agent should advance the conversation. Good progression: explain → question → deeper explanation → different perspective → summary. Bad progression: explain → re-explain → rephrase → paraphrase.
- GREETING RULE: If any agent has already greeted the students, no subsequent agent should greet again. Check the previews for greetings.

# Output Format
You MUST output ONLY a JSON object, nothing else:
{"next_agent":"<agent_id>"}
or
{"next_agent":"USER"}
or
{"next_agent":"END"}`;
}

/**
 * Summarize a single agent's whiteboard actions into a compact description.
 */
function summarizeAgentWhiteboardActions(actions: WhiteboardActionRecord[]): string {
  if (!actions || actions.length === 0) return '';

  const parts: string[] = [];
  for (const a of actions) {
    switch (a.actionName) {
      case 'wb_draw_text': {
        const content = String(a.params.content || '').slice(0, 30);
        parts.push(`drew text "${content}${content.length >= 30 ? '...' : ''}"`);
        break;
      }
      case 'wb_draw_shape':
        parts.push(`drew shape(${a.params.type || 'rectangle'})`);
        break;
      case 'wb_draw_chart': {
        const labels = Array.isArray(a.params.labels)
          ? a.params.labels
          : (a.params.data as Record<string, unknown>)?.labels;
        const chartType = a.params.chartType || a.params.type || 'bar';
        parts.push(
          `drew chart(${chartType}${labels ? `, labels: [${(labels as string[]).slice(0, 4).join(',')}]` : ''})`,
        );
        break;
      }
      case 'wb_draw_latex': {
        const latex = String(a.params.latex || '').slice(0, 30);
        parts.push(`drew formula "${latex}${latex.length >= 30 ? '...' : ''}"`);
        break;
      }
      case 'wb_draw_table': {
        const data = a.params.data as unknown[][] | undefined;
        const rows = data?.length || 0;
        const cols = (data?.[0] as unknown[])?.length || 0;
        parts.push(`drew table(${rows}×${cols})`);
        break;
      }
      case 'wb_draw_line': {
        const pts = a.params.points as string[] | undefined;
        const hasArrow = pts?.includes('arrow') ? ' arrow' : '';
        parts.push(`drew${hasArrow} line`);
        break;
      }
      case 'wb_clear':
        parts.push('CLEARED whiteboard');
        break;
      case 'wb_delete':
        parts.push(`deleted element "${a.params.elementId}"`);
        break;
      case 'wb_open':
      case 'wb_close':
        // Skip open/close from summary — they're structural, not content
        break;
    }
  }
  return parts.join(', ');
}

/**
 * Replay the whiteboard ledger to compute current element count and contributors.
 */
export function summarizeWhiteboardForDirector(ledger: WhiteboardActionRecord[]): {
  elementCount: number;
  contributors: string[];
} {
  let elementCount = 0;
  const contributorSet = new Set<string>();

  for (const record of ledger) {
    if (record.actionName === 'wb_clear') {
      elementCount = 0;
      // Don't reset contributors — they still participated
    } else if (record.actionName === 'wb_delete') {
      elementCount = Math.max(0, elementCount - 1);
    } else if (record.actionName.startsWith('wb_draw_')) {
      elementCount++;
      contributorSet.add(record.agentName);
    }
  }

  return {
    elementCount,
    contributors: Array.from(contributorSet),
  };
}

/**
 * Build the whiteboard state section for the director prompt.
 * Returns empty string if there are no whiteboard actions.
 */
function buildWhiteboardStateForDirector(ledger?: WhiteboardActionRecord[]): string {
  if (!ledger || ledger.length === 0) return '';

  const { elementCount, contributors } = summarizeWhiteboardForDirector(ledger);
  const crowdedWarning =
    elementCount > 5
      ? '\n⚠ The whiteboard is getting crowded. Consider routing to an agent that will organize or clear it rather than adding more.'
      : '';

  return `
# Whiteboard State
Elements on whiteboard: ${elementCount}
Contributors: ${contributors.length > 0 ? contributors.join(', ') : 'none'}${crowdedWarning}
`;
}

/**
 * Parse the director's decision from its response
 *
 * @param content - Raw LLM response content
 * @returns Parsed decision with nextAgentId and shouldEnd flag
 */
export function parseDirectorDecision(content: string): {
  nextAgentId: string | null;
  shouldEnd: boolean;
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*?"next_agent"[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const nextAgent = parsed.next_agent;

      if (!nextAgent || nextAgent === 'END') {
        return { nextAgentId: null, shouldEnd: true };
      }

      return { nextAgentId: nextAgent, shouldEnd: false };
    }
  } catch (_e) {
    log.warn('[Director] Failed to parse decision:', content.slice(0, 200));
  }

  // Default: end the round if we can't parse
  return { nextAgentId: null, shouldEnd: true };
}
