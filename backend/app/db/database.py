from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

url = URL.create(
    drivername = settings.db_driver,
    username = settings.db_user,
    password = settings.db_password,
    host = settings.db_host,
    port = settings.db_port,
    database = settings.db_name,

)

engine = create_engine(
    url,
    pool_pre_ping = True,
)

SessionLocal = sessionmaker(
    bind = engine,
    autoflush = False,
    autocommit = False,
)

class Base(DeclarativeBase):
    pass

def create_tables() -> None:
    from sqlalchemy import inspect, text
    from app.db.models.user import User
    from app.db.models.skill import Skill
    from app.db.models.topic import Topic
    from app.db.models.subtopic import SubTopic
    from app.db.models.learning_material import LearningMaterial
    from app.db.models.question import Question, QuestionOption
    from app.db.models.assessment import Assessment, AssessmentQuestion, LearnerResponse
    from app.db.models.subtopic_performance import SubTopicPerformance
    from app.db.models.mastery import MasteryRecord
    
    Base.metadata.create_all(bind=engine)

    # Safe schema migration check: ensure user_id column exists on assessments
    with engine.connect() as conn:
        insp = inspect(engine)
        if "assessments" in insp.get_table_names():
            columns = [c["name"] for c in insp.get_columns("assessments")]
            if "user_id" not in columns:
                try:
                    conn.execute(text("ALTER TABLE assessments ADD COLUMN user_id INT NULL"))
                    conn.execute(text("ALTER TABLE assessments ADD CONSTRAINT fk_assessments_user FOREIGN KEY (user_id) REFERENCES users(id)"))
                    conn.commit()
                except Exception as e:
                    print(f"Schema migration notice: {e}")

    # Seed default demo admin and learner accounts
    from app.db.seed_data import seed_default_users
    db = SessionLocal()
    try:
        seed_default_users(db)
    except Exception as e:
        print(f"User seeding notice: {e}")
    finally:
        db.close()




def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()