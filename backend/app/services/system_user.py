from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


def get_system_user_id(db: Session) -> int | None:
    admin_id = db.execute(select(User.id).where(User.login == "admin")).scalar_one_or_none()
    if admin_id is not None:
        return admin_id

    return db.execute(select(User.id).where(User.is_active.is_(True)).order_by(User.id.asc())).scalars().first()
