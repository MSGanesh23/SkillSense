from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.topic import Topic
from app.db.models.skill import Skill
from app.db.models.subtopic import SubTopic
from app.db.models.learning_material import LearningMaterial
from app.db.models.question import Question, QuestionOption
from app.db.models.assessment import AssessmentQuestion, LearnerResponse
from app.db.models.subtopic_performance import SubTopicPerformance
from app.db.models.mastery import MasteryRecord
from app.db.schemas.topic import TopicCreate, TopicResponse, TopicUpdate

router = APIRouter(
    prefix="/skills/{skill_id}/topics",
    tags=["Skills"],
)


@router.post(
    "",
    response_model=TopicResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_topic(
    skill_id: int,
    topic_data: TopicCreate,
    db: Session = Depends(get_db),
):
    skill = db.execute(
        select(Skill).where(Skill.id == skill_id)
    ).scalar_one_or_none()

    if skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found.",
        )

    existing_topic = db.execute(
        select(Topic).where(
            Topic.skill_id == skill_id,
            Topic.name == topic_data.name,
        )
    ).scalar_one_or_none()

    if existing_topic:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Topic already exists.",
        )

    topic = Topic(
        skill_id=skill_id,
        name=topic_data.name,
        description=topic_data.description,
    )

    try:
        db.add(topic)
        db.commit()
        db.refresh(topic)

        return topic

    except Exception:
        db.rollback()
        raise


@router.get(
    "",
    response_model=list[TopicResponse],
)
def get_topics(
    skill_id: int,
    db: Session = Depends(get_db),
):
    skill = db.execute(
        select(Skill).where(Skill.id == skill_id)
    ).scalar_one_or_none()

    if skill is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill not found.",
        )
    
    result = db.execute(
        select(Topic).where(Topic.skill_id == skill_id)
    )

    

    topics = result.scalars().all()

    return topics


@router.put(
    "/{topic_id}",
    response_model=TopicResponse,
    status_code=status.HTTP_200_OK,
)
def update_topic(
    skill_id: int,
    topic_id: int,
    topic_data: TopicUpdate,
    db: Session = Depends(get_db),
):
    topic = db.execute(
        select(Topic).where(
            Topic.id == topic_id,
            Topic.skill_id == skill_id,
        )
    ).scalar_one_or_none()

    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found.",
        )

    if topic_data.name is not None and topic_data.name != topic.name:
        existing_topic = db.execute(
            select(Topic).where(
                Topic.skill_id == skill_id,
                Topic.name == topic_data.name,
                Topic.id != topic_id,
            )
        ).scalar_one_or_none()

        if existing_topic:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A topic with this name already exists in this skill.",
            )
        topic.name = topic_data.name

    if topic_data.description is not None:
        topic.description = topic_data.description

    try:
        db.commit()
        db.refresh(topic)
        return topic
    except Exception:
        db.rollback()
        raise


@router.delete("/{topic_id}", status_code=status.HTTP_200_OK)
def delete_topic(
    skill_id: int,
    topic_id: int,
    db: Session = Depends(get_db),
):
    topic = db.execute(
        select(Topic).where(
            Topic.id == topic_id,
            Topic.skill_id == skill_id,
        )
    ).scalar_one_or_none()

    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found.",
        )

    topic_name = topic.name

    # Collect dependent IDs
    subtopics = db.scalars(select(SubTopic).where(SubTopic.topic_id == topic_id)).all()
    subtopic_ids = [s.id for s in subtopics]

    questions = db.scalars(select(Question).where(Question.subtopic_id.in_(subtopic_ids))).all() if subtopic_ids else []
    question_ids = [q.id for q in questions]

    try:
        # 1. Delete Question-level dependencies
        if question_ids:
            db.query(LearnerResponse).filter(LearnerResponse.question_id.in_(question_ids)).delete(synchronize_session=False)
            db.query(AssessmentQuestion).filter(AssessmentQuestion.question_id.in_(question_ids)).delete(synchronize_session=False)
            db.query(QuestionOption).filter(QuestionOption.question_id.in_(question_ids)).delete(synchronize_session=False)
            db.query(Question).filter(Question.id.in_(question_ids)).delete(synchronize_session=False)

        # 2. Delete Subtopic-level dependencies
        if subtopic_ids:
            db.query(SubTopicPerformance).filter(SubTopicPerformance.subtopic_id.in_(subtopic_ids)).delete(synchronize_session=False)
            db.query(LearningMaterial).filter(LearningMaterial.subtopic_id.in_(subtopic_ids)).delete(synchronize_session=False)
            db.query(MasteryRecord).filter(MasteryRecord.subtopic_id.in_(subtopic_ids)).delete(synchronize_session=False)
            db.query(SubTopic).filter(SubTopic.id.in_(subtopic_ids)).delete(synchronize_session=False)

        # 3. Delete Topic
        db.delete(topic)
        db.commit()

        return {
            "message": f"Successfully deleted topic '{topic_name}' and all associated subtopics, materials, and questions.",
            "deleted_topic_id": topic_id,
        }
    except Exception:
        db.rollback()
        raise