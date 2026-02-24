from sqlalchemy.orm import Session
from app.models.seller import Seller


class SellerService:

    @staticmethod
    def create_seller(db: Session, name: str) -> Seller:
        seller = Seller(name=name)
        db.add(seller)
        db.commit()
        db.refresh(seller)
        return seller

    @staticmethod
    def list_sellers(db: Session) -> list[Seller]:
        return db.query(Seller).all()