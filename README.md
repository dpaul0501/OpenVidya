# OpenVidya — AI-Powered Learning for India

> Built on [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC). Redesigned for NCERT, CBSE, and how India actually learns.

OpenMAIC is a brilliant open-source multi-agent classroom engine. OpenVidya forks it with one thesis: **Indian students learn differently**, and their AI teacher should know that.

---

## What's Different

### 5 India-First Learning Modes

Each mode is a complete pedagogical pattern — not just a UI theme. The LLM receives mode-specific scene generation rules, slide layout instructions, and a named teacher persona with its own director routing.

| Mode | Persona | What it does |
|------|---------|-------------|
| 🎙️ **Teacher Narration** | Teacher | 1:1 narration — ask anything in chat, slides update live |
| 📖 **Story Quest** | Didi | Every concept starts with a named Indian scene — auto-rickshaw braking, Rohit Sharma's pull shot, dosa on a tava |
| ⚔️ **Exam Dojo** | Coach | CBSE/JEE drill: predict → attempt → trap exposed → reinforce. PYQ-pattern questions |
| 🔬 **Lab Without Walls** | Lab Sir | Virtual NCERT lab — exact apparatus, NCERT experiment numbers, real-time simulation |
| ⚡ **Rapid Revision** | Flash | Concept chain sprint — memory triggers in ≤8 words, not re-teaching |

### NCERT/CBSE Knowledge Base

A structured KB feeds verified curriculum data directly into the LLM prompt — grounding generation in actual syllabus content:

- **`questions_registry.json`** — CBSE board questions with difficulty, type, trap, and explanation
- **`concept-graph.json`** — Concept dependency chains (prerequisite-ordered DAGs per chapter)
- **`lab-registry.json`** — NCERT prescribed experiments with apparatus, objectives, and common mistakes

No KB match → graceful fallback to LLM generation from first principles.

---

## Architecture

```
User prompt
    │
    ▼
/lesson-setup  ──► mode picker (5 modes) + PDF + URL inputs
    │
    ▼
Stage 1: Outline Generator
  ├── buildEducationModeContext(mode)    ← scene pattern rules per mode
  ├── buildKBContext(topic, class, mode) ← NCERT/CBSE curriculum grounding
  └── SceneOutline[] (educationMode stamped on each outline)
    │
    ▼
Stage 2: Slide Content Generator
  ├── buildSlideModeContext(mode)        ← layout rules per mode
  ├── teacherContext (agent persona)     ← Didi / Coach / Flash / Lab Sir / Teacher
  └── Slide JSON (visual layout)
    │
    ▼
Classroom Runtime
  ├── Director — mode-specific routing   ← single-agent rules per mode
  └── Named agent narrates live          ← persona-driven, chat-reactive
```

Each mode is wired at all three levels: **outline generation → slide content → live narration**. Changing a mode changes what the LLM generates, how it lays it out, and how the teacher speaks about it.

---

## Mode-Specific Design

### 🎙️ Teacher Narration
65% slides (mix of direct explanation, example-first, story/analogy, visual), 20% quiz, 15% conversation. Slides are sparse — the teacher narrates, not the slide. Student questions update the slide live.

### 📖 Story Quest
Pattern per concept: story slide (named Indian scenario) → "Why?" slide (single question, no answers) → concept slide (formula + story callback) → applications (2–3 images) → quiz (story-referenced questions). Video generation requested for motion scenes.

### ⚔️ Exam Dojo
Per-concept drill loop: probable Q slide (exam framing, trap flagged) → primary quiz (MCQ + assertion-reason + case-based) → solution slide (answer path, trap exposed) → practice quiz (harder variant). Every quiz includes a PYQ-pattern question. Ends with weak-spot summary.

### 🔬 Lab Without Walls
Per-experiment pattern: brief slide (NCERT experiment name, objective, apparatus) → interactive scene (full `interactiveConfig` with sliders, real-time readings, observable changes) → observation quiz. Maximum 3 interactive scenes per session.

### ⚡ Rapid Revision
Concept chain (prerequisite-first DAG): intro slide → [concept trigger slide (≤8-word bullets) → quiz] × N → weak-spots summary. 3–6 concepts, 8–14 scenes total. No re-teaching — pure memory reactivation.

---

## Credits

OpenVidya is a fork of [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) by THU-MAIC. All multi-agent orchestration infrastructure, scene generation pipeline, and classroom runtime are OpenMAIC's foundational work. OpenVidya adds India-specific pedagogy, NCERT/CBSE curriculum grounding, and mode-specific generation architecture on top.

---

## What's Next

- [ ] **Local language support** — Hindi, Tamil, Telugu, Bengali (generation + narration)
- [ ] **Full CBSE KB** — Class 6–12, JEE Mains, JEE Advanced, NEET question banks
- [ ] **NCERT MCP server** — curriculum as structured context, consumable by any LLM
- [ ] **India-specific LLM benchmarks** — Sarvam AI, Krutrim, and others on CBSE tasks
- [ ] **Adaptive difficulty** — KB tracks per-student weak spots across sessions

---

## License

MIT — same as OpenMAIC.
