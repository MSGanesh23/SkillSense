from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models.subtopic import SubTopic
from app.db.models.topic import Topic
from app.db.models.learning_material import LearningMaterial
from app.db.models.question import Question, QuestionOption
from app.db.models.assessment import AssessmentQuestion, LearnerResponse
from app.db.models.subtopic_performance import SubTopicPerformance
from app.db.models.mastery import MasteryRecord
from app.db.schemas.subtopic import SubTopicCreate, SubTopicResponse, SubTopicUpdate

router = APIRouter(
    prefix="/topics/{topic_id}/subtopics",
    tags=["SubTopics"],
)


@router.post(
    "",
    response_model = SubTopicResponse,
    status_code = status.HTTP_201_CREATED,
)
def create_subtopic(
    topic_id: int,
    subtopic_data: SubTopicCreate,
    db: Session = Depends(get_db),
):
    topic = db.execute(
        select(Topic).where(Topic.id == topic_id)
    ).scalar_one_or_none()

    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found.",
        )

    existing_subtopic = db.execute(
        select(SubTopic).where(
            SubTopic.topic_id == topic_id,
            SubTopic.name == subtopic_data.name,
        )
    ).scalar_one_or_none()

    if existing_subtopic:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="SubTopic already exists.",
        )

    subtopic = SubTopic(
        topic_id=topic_id,
        name=subtopic_data.name,
        description=subtopic_data.description,
    )

    try:
        db.add(subtopic)
        db.commit()
        db.refresh(subtopic)

        return subtopic

    except Exception:
        db.rollback()
        raise


@router.get(
    "",
    response_model=list[SubTopicResponse],
)
def get_subtopics(
    topic_id: int,
    db: Session = Depends(get_db),
):
    topic = db.execute(
        select(Topic).where(Topic.id == topic_id)
    ).scalar_one_or_none()

    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found.",
        )
    
    result = db.execute(
        select(SubTopic).where(SubTopic.topic_id == topic_id)
    )

    

    subtopics = result.scalars().all()

    return subtopics


@router.put(
    "/{subtopic_id}",
    response_model=SubTopicResponse,
    status_code=status.HTTP_200_OK,
)
def update_subtopic(
    topic_id: int,
    subtopic_id: int,
    subtopic_data: SubTopicUpdate,
    db: Session = Depends(get_db),
):
    subtopic = db.execute(
        select(SubTopic).where(
            SubTopic.id == subtopic_id,
            SubTopic.topic_id == topic_id,
        )
    ).scalar_one_or_none()

    if subtopic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubTopic not found.",
        )

    if subtopic_data.name is not None and subtopic_data.name != subtopic.name:
        existing_subtopic = db.execute(
            select(SubTopic).where(
                SubTopic.topic_id == topic_id,
                SubTopic.name == subtopic_data.name,
                SubTopic.id != subtopic_id,
            )
        ).scalar_one_or_none()

        if existing_subtopic:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A subtopic with this name already exists in this topic.",
            )
        subtopic.name = subtopic_data.name

    if subtopic_data.description is not None:
        subtopic.description = subtopic_data.description

    try:
        db.commit()
        db.refresh(subtopic)
        return subtopic
    except Exception:
        db.rollback()
        raise


@router.delete("/{subtopic_id}", status_code=status.HTTP_200_OK)
def delete_subtopic(
    topic_id: int,
    subtopic_id: int,
    db: Session = Depends(get_db),
):
    subtopic = db.execute(
        select(SubTopic).where(
            SubTopic.id == subtopic_id,
            SubTopic.topic_id == topic_id,
        )
    ).scalar_one_or_none()

    if subtopic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SubTopic not found.",
        )

    subtopic_name = subtopic.name

    questions = db.scalars(select(Question).where(Question.subtopic_id == subtopic_id)).all()
    question_ids = [q.id for q in questions]

    try:
        # 1. Delete Question-level dependencies
        if question_ids:
            db.query(LearnerResponse).filter(LearnerResponse.question_id.in_(question_ids)).delete(synchronize_session=False)
            db.query(AssessmentQuestion).filter(AssessmentQuestion.question_id.in_(question_ids)).delete(synchronize_session=False)
            db.query(QuestionOption).filter(QuestionOption.question_id.in_(question_ids)).delete(synchronize_session=False)
            db.query(Question).filter(Question.id.in_(question_ids)).delete(synchronize_session=False)

        # 2. Delete Subtopic-level dependencies
        db.query(SubTopicPerformance).filter(SubTopicPerformance.subtopic_id == subtopic_id).delete(synchronize_session=False)
        db.query(LearningMaterial).filter(LearningMaterial.subtopic_id == subtopic_id).delete(synchronize_session=False)
        db.query(MasteryRecord).filter(MasteryRecord.subtopic_id == subtopic_id).delete(synchronize_session=False)

        # 3. Delete SubTopic
        db.delete(subtopic)
        db.commit()

        return {
            "message": f"Successfully deleted subtopic '{subtopic_name}' and all associated materials and questions.",
            "deleted_subtopic_id": subtopic_id,
        }
    except Exception:
        db.rollback()
        raise