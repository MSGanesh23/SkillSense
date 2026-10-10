
import json
import logging
from typing import List, Optional

import httpx

from app.core.config import settings
from app.db.schemas.question import QuestionCreate, QuestionOptionCreate

logger = logging.getLogger(__name__)

VALID_DIFFICULTIES = {"easy", "medium", "hard", "custom"}


def _build_prompt(
    skill_name: str,
    topic_name: str,
    subtopic_name: str,
    skill_description: str,
    topic_description: str,
    subtopic_description: str,
    count: int,
    difficulty: str,
    custom_instructions: str,
    learning_material_text: str,
) -> str:
    """Build a prompt that strictly follows the selected learning hierarchy."""

    difficulty_guidance = {
        "easy": """
- Test fundamental concepts and basic understanding.
- Use straightforward questions and clear scenarios.
- Avoid unnecessary complexity.
""",
        "medium": """
- Test conceptual understanding and practical application.
- Require reasoning beyond simple memorization.
- Use moderately challenging examples or scenarios.
""",
        "hard": """
- Test advanced understanding, analysis, and problem-solving.
- Use complex scenarios, edge cases, or multiple related concepts.
- Require careful reasoning while remaining within the specified scope.
""",
        "custom": """
- Follow the user's custom difficulty instructions carefully.
- Use the requested question style and complexity.
- Do not let custom instructions change the selected Skill, Topic, or SubTopic.
""",
    }

    material_context = (
        learning_material_text[:5000]
        if learning_material_text
        else "No learning material was provided."
    )

    custom_section = ""
    if difficulty == "custom":
        custom_section = f"""
CUSTOM QUESTION INSTRUCTIONS:
{custom_instructions}

These instructions define the requested question style and difficulty.
They must not override the selected Skill, Topic, or SubTopic.
"""

    return f"""
You are an expert technical educator and assessment-question generator.

Generate exactly {count} unique multiple-choice questions.

STRICT LEARNING HIERARCHY:
Skill: {skill_name}
Skill Description: {skill_description or "Not provided"}

Topic: {topic_name}
Topic Description: {topic_description or "Not provided"}

SubTopic: {subtopic_name}
SubTopic Description: {subtopic_description or "Not provided"}

MANDATORY SCOPE RULES:
1. Every question MUST primarily test the selected SubTopic: "{subtopic_name}".
2. Every question must belong to Topic "{topic_name}" within Skill "{skill_name}".
3. Use the Skill, Topic, and SubTopic descriptions to understand the exact context.
4. Do NOT generate questions about unrelated programming languages, technologies,
   frameworks, subjects, or concepts.
5. Do NOT assume that the user wants a different language or technology.
6. If the selected Skill is Java and the SubTopic is If-Else statements,
   generate Java If-Else questions, not Python questions.
7. Other concepts may appear only when necessary to test the selected SubTopic.
8. Learning material is supporting context. It must not change the selected scope.
9. If information is insufficient, generate questions from established concepts
   that directly belong to the specified Skill, Topic, and SubTopic.
10. Do not generate generic placeholder questions or repeat the same question
    with slightly different wording.

REQUESTED DIFFICULTY: {difficulty.upper()}

DIFFICULTY REQUIREMENTS:
{difficulty_guidance[difficulty]}

{custom_section}

LEARNING MATERIAL:
{material_context}

QUESTION REQUIREMENTS:
1. Generate exactly {count} distinct questions.
2. Every question must have exactly four options.
3. Exactly one option must have "is_correct": true.
4. The other three options must have "is_correct": false.
5. Options must be meaningful and relevant to the question.
6. Incorrect options should represent plausible mistakes or misconceptions.
7. Provide a clear explanation of the correct answer.
8. The explanation should also clarify why the other options are incorrect
   whenever appropriate.
9. Avoid ambiguous questions and questions with multiple correct answers.
10. Do not include duplicate questions.
11. The "difficulty" field of every question MUST be exactly "{difficulty}".
12. Do not include answers outside the options array.

OUTPUT FORMAT:
Return a JSON object containing a "questions" array.
Do not include Markdown, code fences, or additional text.

Use this exact structure:
{{
  "questions": [
    {{
      "question_text": "Question text",
      "explanation": "Explanation of the correct answer",
      "difficulty": "{difficulty}",
      "options": [
        {{
          "option_text": "Option A",
          "is_correct": true
        }},
        {{
          "option_text": "Option B",
          "is_correct": false
        }},
        {{
          "option_text": "Option C",
          "is_correct": false
        }},
        {{
          "option_text": "Option D",
          "is_correct": false
        }}
      ]
    }}
  ]
}}

Return exactly {count} questions and follow every requirement above.
"""


def _parse_response(raw_text: str) -> list:
    """Parse the model response into a list of question dictionaries."""

    if not raw_text or not raw_text.strip():
        raise ValueError("The AI provider returned an empty response.")

    cleaned_text = raw_text.strip()

    if cleaned_text.startswith("```"):
        lines = cleaned_text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        cleaned_text = "\n".join(lines).strip()

    parsed = json.loads(cleaned_text)

    if isinstance(parsed, dict):
        parsed = parsed.get("questions")

    if not isinstance(parsed, list):
        raise ValueError(
            "The AI response must contain a questions array."
        )

    return parsed


def _validate_questions(
    raw_questions: list,
    count: int,
    difficulty: str,
) -> List[QuestionCreate]:
    """Validate question count, difficulty, options, and correct answers."""

    if len(raw_questions) != count:
        raise ValueError(
            f"Expected {count} questions but received {len(raw_questions)}."
        )

    validated_questions = []

    for index, question in enumerate(raw_questions, start=1):
        if not isinstance(question, dict):
            raise ValueError(
                f"Question {index} must be a JSON object."
            )

        question_text = question.get("question_text")
        explanation = question.get("explanation")
        question_difficulty = question.get("difficulty")
        options = question.get("options")

        if not isinstance(question_text, str) or not question_text.strip():
            raise ValueError(
                f"Question {index} has no valid question text."
            )

        if not isinstance(explanation, str) or not explanation.strip():
            raise ValueError(
                f"Question {index} has no valid explanation."
            )

        if not isinstance(question_difficulty, str):
            raise ValueError(
                f"Question {index} has no valid difficulty."
            )

        if question_difficulty.strip().lower() != difficulty:
            raise ValueError(
                f"Question {index} does not match the requested "
                f"difficulty '{difficulty}'."
            )

        if not isinstance(options, list) or len(options) != 4:
            raise ValueError(
                f"Question {index} must contain exactly four options."
            )

        correct_count = 0
        validated_options = []

        for option_index, option in enumerate(options, start=1):
            if not isinstance(option, dict):
                raise ValueError(
                    f"Question {index}, option {option_index} is invalid."
                )

            option_text = option.get("option_text")
            is_correct = option.get("is_correct")

            if not isinstance(option_text, str) or not option_text.strip():
                raise ValueError(
                    f"Question {index}, option {option_index} "
                    "has no valid text."
                )

            if not isinstance(is_correct, bool):
                raise ValueError(
                    f"Question {index}, option {option_index} "
                    "must have a Boolean is_correct value."
                )

            if is_correct:
                correct_count += 1

            validated_options.append(
                QuestionOptionCreate(
                    option_text=option_text.strip(),
                    is_correct=is_correct,
                )
            )

        if correct_count != 1:
            raise ValueError(
                f"Question {index} must have exactly one correct answer."
            )

        validated_questions.append(
            QuestionCreate(
                question_text=question_text.strip(),
                explanation=explanation.strip(),
                difficulty=difficulty,
                options=validated_options,
            )
        )

    return validated_questions


def _generate_with_gemini(prompt: str) -> str:
    """Generate questions using the Gemini API."""

    url = (
        "https://generativelanguage.googleapis.com/"
        "v1beta/models/gemini-2.5-flash:generateContent"
    )

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.gemini_api_key,
    }

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
        },
    }

    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            url,
            headers=headers,
            json=payload,
        )

    response.raise_for_status()

    data = response.json()
    candidates = data.get("candidates", [])

    if not candidates:
        raise ValueError("Gemini returned no candidates.")

    content = candidates[0].get("content", {})
    parts = content.get("parts", [])

    if not parts or not parts[0].get("text"):
        raise ValueError("Gemini returned no question content.")

    return parts[0]["text"]


def _generate_with_openai(prompt: str) -> str:
    """Generate questions using the OpenAI API."""

    url = "https://api.openai.com/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You generate accurate, scope-specific educational "
                    "MCQs. Follow the requested learning hierarchy and "
                    "return only valid JSON."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "response_format": {
            "type": "json_object",
        },
    }

    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            url,
            headers=headers,
            json=payload,
        )

    response.raise_for_status()

    data = response.json()
    choices = data.get("choices", [])

    if not choices:
        raise ValueError("OpenAI returned no choices.")

    message = choices[0].get("message", {})
    content = message.get("content")

    if not content:
        raise ValueError("OpenAI returned no question content.")

    return content


def generate_questions_for_subtopic(
    skill_name: str,
    topic_name: str,
    subtopic_name: str,
    skill_description: Optional[str] = "",
    topic_description: Optional[str] = "",
    subtopic_description: Optional[str] = "",
    count: int = 3,
    difficulty: str = "medium",
    custom_instructions: str = "",
    learning_material_text: Optional[str] = "",
) -> List[QuestionCreate]:
    """
    Generate and validate MCQs for the exact Skill -> Topic -> SubTopic.

    The function supports Easy, Medium, Hard, and Custom difficulty.
    It does not silently generate generic fallback questions when AI
    generation is unavailable.
    """

    difficulty = (difficulty or "medium").strip().lower()

    if not 1 <= count <= 10:
        raise ValueError("Question count must be between 1 and 10.")

    if difficulty not in VALID_DIFFICULTIES:
        raise ValueError(
            "Difficulty must be easy, medium, hard, or custom."
        )

    if difficulty == "custom" and not custom_instructions.strip():
        raise ValueError(
            "Custom instructions are required for custom difficulty."
        )

    if not skill_name or not topic_name or not subtopic_name:
        raise ValueError(
            "Skill, Topic, and SubTopic names are required."
        )

    prompt = _build_prompt(
        skill_name=skill_name,
        topic_name=topic_name,
        subtopic_name=subtopic_name,
        skill_description=skill_description or "",
        topic_description=topic_description or "",
        subtopic_description=subtopic_description or "",
        count=count,
        difficulty=difficulty,
        custom_instructions=custom_instructions or "",
        learning_material_text=learning_material_text or "",
    )

    provider_errors = []

    # Try Gemini first.
    if settings.gemini_api_key:
        try:
            raw_text = _generate_with_gemini(prompt)
            parsed_questions = _parse_response(raw_text)

            return _validate_questions(
                parsed_questions,
                count,
                difficulty,
            )

        except Exception as error:
            logger.warning(
                "Gemini question generation failed: %s",
                error,
            )
            provider_errors.append(f"Gemini: {error}")

    # Try OpenAI if Gemini is unavailable or fails.
    if settings.openai_api_key:
        try:
            raw_text = _generate_with_openai(prompt)
            parsed_questions = _parse_response(raw_text)

            return _validate_questions(
                parsed_questions,
                count,
                difficulty,
            )

        except Exception as error:
            logger.warning(
                "OpenAI question generation failed: %s",
                error,
            )
            provider_errors.append(f"OpenAI: {error}")

    # Do not save fake or generic questions as if they were AI-generated.
    if not settings.gemini_api_key and not settings.openai_api_key:
        raise RuntimeError(
            "AI question generation is not configured. "
            "Configure GEMINI_API_KEY or OPENAI_API_KEY."
        )

    error_details = "; ".join(provider_errors)

    raise RuntimeError(
        "Question generation failed validation or the AI provider "
        f"failed. No questions were generated. Details: {error_details}"
    )
