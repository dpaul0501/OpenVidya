Generate scene outlines **strictly about the topic in the User Requirements below**. Do not invent unrelated concepts or drift to other topics. Every concept, law, or term you use must be real and verifiable.

---

## User Requirements

{{requirement}}

---

{{userProfile}}

## Course Language

**Required language**: {{language}}

(If language is en-US, all content must be in English; if sa, all content must be in Sanskrit)

---

## Reference Materials

### PDF Content Summary

{{pdfContent}}

### Available Images

{{availableImages}}

### Web Search Results

{{researchContext}}

{{teacherContext}}

### Knowledge Base (NCERT/CBSE verified data)

{{kbContext}}

---

## Output Requirements

Please automatically infer the following from user requirements:

- Course topic and core content
- Target audience and difficulty level
- Course duration (default 15-30 minutes if not specified)
- Teaching style (formal/casual/interactive/academic)
- Visual style (minimal/colorful/professional/playful)

Then output a JSON array containing all scene outlines. Each scene must include:

```json
{
  "id": "scene_1",
  "type": "slide" or "quiz" or "interactive" or "conversation" or "game" or "pbl",
  "title": "Scene Title",
  "description": "Teaching purpose description",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "order": 1
}
```

### Special Notes

1. **quiz scenes must include quizConfig**:
   ```json
   "quizConfig": {
     "questionCount": 2,
     "difficulty": "easy" | "medium" | "hard",
     "questionTypes": ["single", "multiple"]
   }
   ```
2. **game scenes must include gameConfig**:
   ```json
   "gameConfig": {
     "gameType": "quiz" | "puzzle" | "challenge" | "multiplayer",
     "difficulty": "easy" | "medium" | "hard",
     "challengeCount": 3,
     "language": "{{language}}"
   }
   ```
3. **pbl scenes must include pblConfig**:
   ```json
   "pblConfig": {
     "projectType": "research" | "design" | "problem-solving" | "creative",
     "teamSize": 2,
     "duration": "15min"
   }
   ```
4. **Game scenes**: Use for gamified learning experiences, especially for younger students or when requirements mention "game", "fun", "interactive learning", or "gamification". Games work well for math, language practice, and critical thinking exercises.
2. **If images are available**, add `suggestedImageIds` to relevant slide scenes
3. **Interactive scenes**: If a concept benefits from hands-on simulation/visualization, use `"type": "interactive"` with an `interactiveConfig` object containing `conceptName`, `conceptOverview`, `designIdea`, and `subject`. Limit to 1-2 per course.
4. **Scene count**: Based on inferred duration, typically 1-2 scenes per minute
5. **Quiz placement**: Recommend inserting a quiz every 3-5 slides for assessment
6. **Language**: Strictly output all content in the specified course language
7. **If no suitable PDF images exist** for a slide scene that would benefit from visuals, add `mediaGenerations` array with image generation prompts. Write prompts in English. Use `elementId` format like "gen_img_1", "gen_img_2" — IDs must be **globally unique across all scenes** (do NOT restart numbering per scene). To reuse a generated image in a different scene, reference the same elementId without re-declaring it in mediaGenerations. Each generated image should be visually distinct — avoid near-identical media across slides.
8. **If web search results are provided**, reference specific findings and sources in scene descriptions and keyPoints. The search results provide up-to-date information — incorporate it to make the course content current and accurate.

{{mediaGenerationPolicy}}

{{educationModeContext}}

Please output JSON array directly without additional explanatory text.
