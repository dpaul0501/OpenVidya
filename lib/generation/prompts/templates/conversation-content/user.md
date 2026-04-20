Please generate conversation content for a speaking practice scene.

---

## Scene Information

**Title**: {{title}}

**Description**: {{description}}

**Key Points**: {{keyPoints}}

**Language**: {{language}}

---

## Output Requirements

Generate a JSON object with the following structure for English speaking practice:

```json
{
  "scenario": "A brief description of the conversation scenario (e.g., 'Ordering food at a restaurant', 'Job interview practice')",
  "participants": [
    {
      "id": "teacher",
      "name": "AI Teacher",
      "role": "teacher",
      "avatar": "teacher-avatar.png"
    },
    {
      "id": "student",
      "name": "Student",
      "role": "student"
    }
  ],
  "initialMessage": "Hello! Let's practice English speaking. I'll start the conversation."
}
```

### Guidelines

1. **Scenario**: Create an engaging, educational scenario suitable for language practice
2. **Participants**: Include at least a teacher and student role
3. **Initial Message**: Provide a starting message from the AI teacher
4. **Language**: All content must be in the specified language
5. **Educational Focus**: Design scenarios that help practice common English communication skills

Output JSON directly without additional text.