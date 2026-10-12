from datetime import datetime
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_admin
from app.db.database import get_db
from app.db.models.assessment import Assessment
from app.db.models.skill import Skill
from app.db.models.user import User

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


@router.get(
    "/users/performance-summary",
    status_code=status.HTTP_200_OK,
)
def get_users_performance_summary(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin-only endpoint returning performance metrics for all registered users."""
    users = db.scalars(select(User).order_by(User.id.asc())).all()
    skills_count = db.query(Skill).count()

    total_platform_assessments = 0
    all_scores: List[float] = []

    user_summaries: List[Dict[str, Any]] = []

    for user in users:
        # Fetch user's completed assessments
        user_assessments = db.scalars(
            select(Assessment)
            .where(
                Assessment.user_id == user.id,
                Assessment.status == "completed",
                Assessment.total_score.isnot(None),
                Assessment.max_score.isnot(None),
                Assessment.max_score > 0,
            )
            .order_by(Assessment.completed_at.desc())
        ).all()

        completed_count = len(user_assessments)
        total_platform_assessments += completed_count

        percentages = [
            round((a.total_score / a.max_score) * 100.0, 1)
            for a in user_assessments
            if a.max_score and a.max_score > 0
        ]
        all_scores.extend(percentages)

        avg_score = round(sum(percentages) / completed_count, 1) if completed_count > 0 else 0.0
        best_score = max(percentages) if percentages else 0.0
        last_active = user_assessments[0].completed_at if completed_count > 0 else None

        # Chronological list for trend graphs and sparklines
        chronological_assessments = list(reversed(user_assessments))
        score_history = [
            {
                "attempt": idx + 1,
                "percentage": round((a.total_score / a.max_score) * 100.0, 1),
                "score": a.total_score,
                "max_score": a.max_score,
                "title": a.title,
                "date": a.completed_at.isoformat() if a.completed_at else None,
            }
            for idx, a in enumerate(chronological_assessments)
            if a.max_score and a.max_score > 0 and a.total_score is not None
        ]

        passed_count = sum(1 for p in percentages if p >= 60.0)
        pass_rate = round((passed_count / completed_count) * 100.0, 1) if completed_count > 0 else 0.0

        recent = [
            {
                "id": a.id,
                "title": a.title,
                "skill_id": a.skill_id,
                "skill_name": a.skill.name if a.skill else None,
                "total_score": a.total_score,
                "max_score": a.max_score,
                "percentage": round((a.total_score / a.max_score) * 100.0, 1) if a.max_score else 0.0,
                "completed_at": a.completed_at,
            }
            for a in user_assessments[:5]
        ]

        user_summaries.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at,
            "assessments_count": completed_count,
            "average_score": avg_score,
            "best_score": best_score,
            "pass_rate": pass_rate,
            "last_active": last_active,
            "score_history": score_history,
            "recent_assessments": recent,
        })

    platform_avg = round(sum(all_scores) / len(all_scores), 1) if all_scores else 0.0

    return {
        "kpis": {
            "total_users": len(users),
            "total_assessments": total_platform_assessments,
            "platform_average_score": platform_avg,
            "total_skills": skills_count,
        },
        "users": user_summaries,
    }


@router.get(
    "/users/{user_id}/assessments",
    status_code=status.HTTP_200_OK,
)
def get_user_assessments(
    user_id: int,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Admin-only endpoint returning detailed assessments for a specific user."""
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    assessments = db.scalars(
        select(Assessment)
        .where(Assessment.user_id == user_id)
        .order_by(Assessment.created_at.desc())
    ).all()

    return {
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
        },
        "assessments": [
            {
                "id": a.id,
                "title": a.title,
                "skill_id": a.skill_id,
                "skill_name": a.skill.name if a.skill else None,
                "status": a.status,
                "total_score": a.total_score,
                "max_score": a.max_score,
                "percentage": round((a.total_score / a.max_score) * 100.0, 1) if (a.total_score is not None and a.max_score and a.max_score > 0) else None,
                "created_at": a.created_at,
                "completed_at": a.completed_at,
            }
            for a in assessments
        ],
    }
