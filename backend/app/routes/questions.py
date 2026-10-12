from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.question import Question, QuestionOption
from app.db.models.subtopic import SubTopic
from app.db.models.topic import Topic
from app.db.models.skill import Skill
from app.db.schemas.question import QuestionCreate, QuestionResponse, QuestionUpdate
from app.services.ai_generator import generate_questions_for_subtopic

router = APIRouter(
    prefix="/subtopics/{subtopic_id}/questions",
    tags=["Questions"],
)


@router.post(
    "",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_question(
    subtopic_id: int,
    question_data: QuestionCreate,
    db: Session = Depends(get_db),
):
    subtopic = db.execute(
        select(SubTopic).where(SubTopic.id == subtopic_id)
    ).scalar_one_or_none()

    if subtopic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubTopic not found.",
        )

    if len(question_data.options) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A question must have exactly four options.",
        )

    correct_count = sum(
        1 for option in question_data.options if option.is_correct
    )

    if correct_count != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exactly one option must be marked as correct.",
        )

    question = Question(
        subtopic_id=subtopic_id,
        question_text=question_data.question_text,
        explanation=question_data.explanation,
        difficulty=question_data.difficulty,
    )

    try:
        db.add(question)
        db.flush()

        for option_data in question_data.options:
            option = QuestionOption(
                question_id=question.id,
                option_text=option_data.option_text,
                is_correct=option_data.is_correct,
            )
            db.add(option)

        db.commit()
        db.refresh(question)

        return question

    except Exception:
        db.rollback()
        raise


@router.post(
    "/generate",
    response_model=list[QuestionResponse],
    status_code=status.HTTP_201_CREATED,
)
def generate_questions_api(
    subtopic_id: int,
    count: int = 3,
    difficulty: str = "medium",
    custom_instructions: str = "",
    db: Session = Depends(get_db),
):
    # Validate question count.
    if count < 1 or count > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question count must be between 1 and 10.",
        )

    # Validate difficulty.
    difficulty = difficulty.strip().lower()

    allowed_difficulties = {
        "easy",
        "medium",
        "hard",
        "custom",
    }

    if difficulty not in allowed_difficulties:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Difficulty must be easy, medium, hard, or custom.",
        )

    if difficulty == "custom" and not custom_instructions.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide custom question instructions.",
        )

    # Retrieve the selected subtopic.
    subtopic = db.execute(
        select(SubTopic).where(SubTopic.id == subtopic_id)
    ).scalar_one_or_none()

    if subtopic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubTopic not found.",
        )

    # Retrieve its parent topic.
    topic = db.execute(
        select(Topic).where(Topic.id == subtopic.topic_id)
    ).scalar_one_or_none()

    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent topic not found.",
        )

    # Retrieve the skill associated with the topic.
    skill = db.execute(
        select(Skill).where(Skill.id == topic.skill_id)
    ).scalar_one_or_none()

    if skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent skill not found.",
        )

    # Collect learning materials.
    learning_material_text = ""

    if subtopic.learning_materials:
        learning_material_text = "\n".join(
            f"{material.title}: {material.description or ''}"
            for material in subtopic.learning_materials
        )

    # Generate questions using the full learning hierarchy.
    generated_questions = generate_questions_for_subtopic(
        skill_name=skill.name,
        topic_name=topic.name,
        subtopic_name=subtopic.name,
        skill_description=skill.description or "",
        topic_description=topic.description or "",
        subtopic_description=subtopic.description or "",
        count=count,
        difficulty=difficulty,
        custom_instructions=custom_instructions,
        learning_material_text=learning_material_text,
    )

    # Validate the generated result before saving anything.
    if len(generated_questions) != count:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                f"AI generated {len(generated_questions)} questions, "
                f"but {count} were requested. Please try again."
            ),
        )

    for question_data in generated_questions:
        if len(question_data.options) != 4:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI generated a question without exactly four options.",
            )

        correct_count = sum(
            1
            for option in question_data.options
            if option.is_correct
        )

        if correct_count != 1:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "AI generated a question without exactly one "
                    "correct option."
                ),
            )

        if question_data.difficulty.lower() != difficulty:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI generated a question with the wrong difficulty.",
            )

    # Save all generated questions in a single transaction.
    created_questions = []

    try:
        for question_data in generated_questions:
            question = Question(
                subtopic_id=subtopic_id,
                question_text=question_data.question_text,
                explanation=question_data.explanation,
                difficulty=question_data.difficulty,
            )

            db.add(question)
            db.flush()

            for option_data in question_data.options:
                option = QuestionOption(
                    question_id=question.id,
                    option_text=option_data.option_text,
                    is_correct=option_data.is_correct,
                )

                db.add(option)

            created_questions.append(question)

        db.commit()

        for question in created_questions:
            db.refresh(question)

        return created_questions

    except Exception:
        db.rollback()
        raise


@router.get(
    "",
    response_model=list[QuestionResponse],
)
def get_questions_by_subtopic(
    subtopic_id: int,
    db: Session = Depends(get_db),
):
    subtopic = db.execute(
        select(SubTopic).where(SubTopic.id == subtopic_id)
    ).scalar_one_or_none()

    if subtopic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubTopic not found.",
        )

    result = db.execute(
        select(Question).where(
            Question.subtopic_id == subtopic_id
        )
    )

    return result.scalars().all()


@router.put(
    "/{question_id}",
    response_model=QuestionResponse,
    status_code=status.HTTP_200_OK,
)
def update_question(
    subtopic_id: int,
    question_id: int,
    question_data: QuestionUpdate,
    db: Session = Depends(get_db),
):
    question = db.execute(
        select(Question).where(
            Question.id == question_id,
            Question.subtopic_id == subtopic_id,
        )
    ).scalar_one_or_none()

    if question is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found.",
        )

    if question_data.question_text is not None:
        question.question_text = question_data.question_text
    if question_data.explanation is not None:
        question.explanation = question_data.explanation
    if question_data.difficulty is not None:
        question.difficulty = question_data.difficulty

    try:
        db.commit()
        db.refresh(question)
        return question
    except Exception:
        db.rollback()
        raise
