from sqlalchemy.orm import Session

from app.db.models.query_log import QueryLog


class QueryLogRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, query_log: QueryLog) -> QueryLog:
        self.db.add(query_log)
        self.db.commit()
        self.db.refresh(query_log)
        return query_log
