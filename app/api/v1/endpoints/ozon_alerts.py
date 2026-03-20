from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.v1.schemas.ozon_alerts import OzonStockAlertOut
from app.services.ozon_alerts_service import build_stock_alerts_for_seller
from app.crud.crud_ozon_stock_threshold import mark_threshold_alert_sent

router = APIRouter()


@router.get(
    "/sellers/{seller_id}/alerts",
    response_model=list[OzonStockAlertOut],
)
def get_ozon_stock_alerts(
    seller_id: UUID,
    db: Session = Depends(get_db),
):
    alerts = build_stock_alerts_for_seller(db, seller_id)

    for alert in alerts:
        threshold_id = alert.get("threshold_id")

        if threshold_id:
            updated = mark_threshold_alert_sent(db=db, threshold_id=threshold_id)
            print("MARK ALERT:", threshold_id, updated.last_alert_at if updated else None)

    return alerts