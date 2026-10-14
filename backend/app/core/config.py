from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    db_driver : str = "mysql+pymysql"
    db_user : str
    db_password : str
    db_host : str = "localhost"
    db_port : int = 3306
    db_name : str

    gemini_api_key: str | None = None
    openai_api_key: str | None = None
    jwt_secret: str = "skillsense-super-secret-jwt-key-2026"
    jwt_algorithm: str = "HS256"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()