from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.api.v1.schemas import SellerCreate, SellerRead
from app.services.seller_service import SellerService

router = APIRouter(prefix="/sellers", tags=["sellers"])


@router.post("/", response_model=SellerRead)
def create_seller(data: SellerCreate, db: Session = Depends(get_db)):
    return SellerService.create_seller(db, data.name)


@router.get("/", response_model=list[SellerRead])
def list_sellers(db: Session = Depends(get_db)):
    return SellerService.list_sellers(db)