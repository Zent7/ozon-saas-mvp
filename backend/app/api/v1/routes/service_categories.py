from fastapi import APIRouter, Depends
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.service import Service, ServiceCategory
from app.schemas.service_category import ServiceCategoryRead

router = APIRouter()


@router.get("", response_model=list[ServiceCategoryRead])
def list_service_categories(db: Session = Depends(get_db)) -> list[ServiceCategoryRead]:
    categories = db.execute(
        select(ServiceCategory)
        .where(exists().where(Service.category_id == ServiceCategory.id).where(Service.is_active.is_(True)))
        .order_by(ServiceCategory.sort_order.asc(), ServiceCategory.name.asc())
    ).scalars().all()
    return [ServiceCategoryRead.model_validate(item) for item in categories]
