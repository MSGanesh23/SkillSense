
from datetime import datetime
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.assessment import (
    Assessment,
    AssessmentQuestion,
    LearnerResponse,
)
from app.db.models.mastery import MasteryRecord
from app.db.models.question import Question, QuestionOption
from app.db.models.skill import Skill
from app.db.models.subtopic import SubTopic
from app.db.models.topic import Topic

from app.db.schemas.assessment import (
    PublicOptionResponse,
    PublicQuestionResponse,
    AssessmentSessionResponse,
)
from app.db.schemas.mastery import (
    MasteryOverviewResponse,
    MasteryRecordResponse,
    RetestResponse,
)

from app.services.ai_generator import generate_questions_for_subtopic
from app.services.gap_diagnosis import evaluate_and_persist_gaps


def create_targeted_retest(
    assessment_id: int,
    db: Session,
) -> RetestResponse:
    """
    Create a targeted retest focused on weak or critical subtopics.
    Generated questions use the correct Skill -> Topic -> SubTopic hierarchy.
    """

    gap_report = evaluate_and_persist_gaps(assessment_id, db)

    weak_diagnoses = [
        diagnosis
        for diagnosis in gap_report.diagnoses
        if diagnosis.status in ("weak", "critical")
    ]

    if weak_diagnoses:
        target_diagnoses = weak_diagnoses
    else:
        target_diagnoses = list(gap_report.diagnoses)

    weak_subtopic_ids = [
        diagnosis.subtopic_id for diagnosis in target_diagnoses
    ]

    target_names = [
        diagnosis.subtopic_name for diagnosis in target_diagnoses
    ]

    new_questions: List[Question] = []

    for sub_id in weak_subtopic_ids:
        subtopic = db.execute(
            select(SubTopic).where(SubTopic.id == sub_id)
        ).scalar_one_or_none()

        if not subtopic:
            continue

        # Get the parent topic.
        topic = db.execute(
            select(Topic).where(Topic.id == subtopic.topic_id)
        ).scalar_one_or_none()

        if not topic:
            continue

        # Get the skill associated with that topic.
        skill = db.execute(
            select(Skill).where(Skill.id == topic.skill_id)
        ).scalar_one_or_none()

        if not skill:
            continue

        # Include available learning materials as additional context.
        material_parts = []

        for material in subtopic.learning_materials:
            title = getattr(material, "title", "") or ""
            description = getattr(material, "description", "") or ""

            if title or description:
                material_parts.append(
                    f"Title: {title}\nDescription: {description}"
                )

        learning_material_text = "\n\n".join(material_parts)

        # IMPORTANT: Pass the complete Skill -> Topic -> SubTopic context.
        q_payloads = generate_questions_for_subtopic(
            skill_name=skill.name,
            topic_name=topic.name,
            subtopic_name=subtopic.name,
            skill_description=skill.description or "",
            topic_description=topic.description or "",
            subtopic_description=subtopic.description or "",
            count=2,
            difficulty="medium",
            custom_instructions="",
            learning_material_text=learning_material_text,
        )

        for q_data in q_payloads:
            question = Question(
                subtopic_id=sub_id,
                question_text=f"[Retest] {q_data.question_text}",
                explanation=q_data.explanation,
                difficulty=q_data.difficulty,
            )

            db.add(question)
            db.flush()

            for option in q_data.options:
                db.add(
                    QuestionOption(
                        question_id=question.id,
                        option_text=option.option_text,
                        is_correct=option.is_correct,
                    )
                )

            new_questions.append(question)

    # Create the new retest assessment.
    retest_assessment = Assessment(
        skill_id=gap_report.skill_id,
        title=f"Targeted Retest - {gap_report.skill_name}",
        status="in_progress",
    )

    db.add(retest_assessment)
    db.flush()

    for question in new_questions:
        db.add(
            AssessmentQuestion(
                assessment_id=retest_assessment.id,
                question_id=question.id,
            )
        )

    db.commit()
    db.refresh(retest_assessment)

    public_questions = []

    for question in new_questions:
        public_options = [
            PublicOptionResponse(
                id=option.id,
                option_text=option.option_text,
            )
            for option in question.options
        ]

        public_questions.append(
            PublicQuestionResponse(
                id=question.id,
                subtopic_id=question.subtopic_id,
                question_text=question.question_text,
                difficulty=question.difficulty,
                options=public_options,
            )
        )

    session_response = AssessmentSessionResponse(
        id=retest_assessment.id,
        skill_id=retest_assessment.skill_id,
        title=retest_assessment.title,
        status=retest_assessment.status,
        created_at=retest_assessment.created_at,
        questions=public_questions,
    )

    return RetestResponse(
        original_assessment_id=assessment_id,
        retest_assessment=session_response,
        target_weak_subtopics=target_names,
        message=(
            f"Targeted retest generated with {len(new_questions)} "
            "fresh questions focusing on weak subtopics."
        ),
    )


def update_mastery_records(
    assessment_id: int,
    db: Session,
):
    """
    Evaluate learner accuracy per subtopic and update mastery records.
    """

    responses = db.scalars(
        select(LearnerResponse).where(
            LearnerResponse.assessment_id == assessment_id
        )
    ).all()

    subtopic_stats = {}

    for response in responses:
        question = db.execute(
            select(Question).where(
                Question.id == response.question_id
            )
        ).scalar_one_or_none()

        if question:
            subtopic_id = question.subtopic_id
            total, correct = subtopic_stats.get(
                subtopic_id,
                (0, 0),
            )

            subtopic_stats[subtopic_id] = (
                total + 1,
                correct + (1 if response.is_correct else 0),
            )

    for subtopic_id, (total, correct) in subtopic_stats.items():
        accuracy = (
            correct / total * 100.0
            if total > 0
            else 0.0
        )

        if accuracy >= 85.0:
            level = "mastered"
        elif accuracy >= 70.0:
            level = "proficient"
        elif accuracy >= 50.0:
            level = "learning"
        else:
            level = "novice"

        record = db.execute(
            select(MasteryRecord).where(
                MasteryRecord.subtopic_id == subtopic_id
            )
        ).scalar_one_or_none()

        if record:
            record.mastery_score = round(accuracy, 2)
            record.mastery_level = level
            record.attempts_count += 1
            record.last_evaluated_at = datetime.utcnow()
        else:
            record = MasteryRecord(
                subtopic_id=subtopic_id,
                mastery_score=round(accuracy, 2),
                mastery_level=level,
                attempts_count=1,
                last_evaluated_at=datetime.utcnow(),
            )
            db.add(record)

    db.commit()


def get_skill_mastery_overview(
    skill_id: int,
    db: Session,
) -> MasteryOverviewResponse:
    """
    Calculate overall mastery metrics across all subtopics under a skill.
    """

    topics = db.scalars(
        select(Topic).where(Topic.skill_id == skill_id)
    ).all()

    topic_ids = [topic.id for topic in topics]

    if topic_ids:
        subtopics = db.scalars(
            select(SubTopic).where(
                SubTopic.topic_id.in_(topic_ids)
            )
        ).all()
    else:
        subtopics = []

    records: List[MasteryRecordResponse] = []
    total_score_sum = 0.0
    mastered_count = 0

    for subtopic in subtopics:
        record = db.execute(
            select(MasteryRecord).where(
                MasteryRecord.subtopic_id == subtopic.id
            )
        ).scalar_one_or_none()

        topic_name = (
            subtopic.topic.name
            if subtopic.topic
            else "General"
        )

        score = record.mastery_score if record else 0.0
        level = record.mastery_level if record else "novice"
        attempts = record.attempts_count if record else 0
        last_evaluated = (
            record.last_evaluated_at
            if record
            else datetime.utcnow()
        )

        if level == "mastered":
            mastered_count += 1

        total_score_sum += score

        records.append(
            MasteryRecordResponse(
                subtopic_id=subtopic.id,
                subtopic_name=subtopic.name,
                topic_name=topic_name,
                mastery_score=score,
                mastery_level=level,
                attempts_count=attempts,
                last_evaluated_at=last_evaluated,
            )
        )

    overall_percentage = (
        total_score_sum / len(subtopics)
        if subtopics
        else 0.0
    )

    skill_name = (
        topics[0].skill.name
        if topics and topics[0].skill
        else "Skill"
    )

    return MasteryOverviewResponse(
        skill_id=skill_id,
        skill_name=skill_name,
        overall_mastery_percentage=round(
            overall_percentage,
            2,
        ),
        mastered_subtopics_count=mastered_count,
        total_subtopics_count=len(subtopics),
        records=records,
    )
