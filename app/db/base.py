from app.db.base_class import Base

# Импорт моделей для Alembic (чтобы autogenerate их видел)
from app.models.seller import Seller
from app.models.sale import Sale
from app.models.stock_fbo import StockFbo
from app.models.product import Product
from app.models.ozon_connection import OzonConnection
from app.models.ozon_product import OzonProduct