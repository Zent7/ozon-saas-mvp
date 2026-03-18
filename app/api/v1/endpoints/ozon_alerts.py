from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.v1.schemas.ozon_alerts import OzonStockAlertOut
from app.services.ozon_alerts_service import build_stock_alerts_for_seller

router = APIRouter()


@router.get(
    "/sellers/{seller_id}/alerts",
    response_model=list[OzonStockAlertOut],
)
def get_ozon_stock_alerts(
    seller_id: UUID,
    db: Session = Depends(get_db),
):
    return build_stock_alerts_for_seller(db, seller_id)