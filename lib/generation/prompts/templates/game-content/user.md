Please generate gamified learning content for an educational game scene.

---

## Scene Information

**Title**: {{title}}

**Description**: {{description}}

**Game Type**: {{gameType}}

**Difficulty Level**: {{difficulty}}

**Number of Challenges**: {{challengeCount}}

**Language**: {{language}}

**Key Points**: {{keyPoints}}

---

## Output Requirements

Generate a JSON object with the following structure:

```json
{
  "title": "English Vocabulary Challenge",
  "description": "A fun game to practice English vocabulary through interactive challenges",
  "gameType": "quiz",
  "challenges": [
    {
      "question": "What is the opposite of 'happy'?",
      "options": ["sad", "angry", "tired", "bored"],
      "correctAnswer": 0,
      "points": 10,
      "explanation": "Opposite of 'happy' is 'sad'"
    },
    {
      "question": "Which sentence is grammatically correct?",
      "options": [
        "She go to school every day",
        "She goes to school every day",
        "She going to school every day",
        "She gone to school every day"
      ],
      "correctAnswer": 1,
      "points": 15,
      "explanation": "Third person singular requires 'goes' with the base verb 'go'"
    }
  ],
  "scoringSystem": {
    "pointsPerCorrect": 10,
    "pointsPerWrong": -5
  }
}
```

### Guidelines

1. **Game Type**: Use one of: "quiz", "puzzle", "challenge", "multiplayer"
2. **Challenges**: Create {{challengeCount}} educational challenges appropriate for {{difficulty}} difficulty
3. **Questions**: Make questions clear, concise, and aligned with {{keyPoints}}
4. **Options**: Provide plausible multiple choice options (typically 3-4)
5. **Points**: Assign points based on difficulty and importance
6. **Language**: All content must be in {{language}}
7. **Educational Focus**: Ensure challenges test understanding, not just recall
8. **Variety**: Mix different types of questions where possible

Output JSON directly without additional text. Ensure all challenges are engaging and appropriate for the specified language and educational level.
