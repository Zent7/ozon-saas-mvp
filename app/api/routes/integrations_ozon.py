from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete
from sqlalchemy.orm import Session
import httpx

from app.db.session import get_db
from app.models.ozon_connection import OzonConnection, OzonConnectionType
from app.models.ozon_product import OzonProduct
from app.models.stock_fbo import StockFbo
from app.security.crypto import encrypt_str, decrypt_str
from app.api.v1.schemas.ozon import OzonConnectIn, OzonConnectOut

router = APIRouter(prefix="/integrations/ozon", tags=["integrations:ozon"])


@router.post("/connect", response_model=OzonConnectOut)
async def ozon_connect(payload: OzonConnectIn, db: Session = Depends(get_db)):
    db.query(OzonConnection).filter(
        OzonConnection.seller_id == payload.seller_id,
        OzonConnection.is_active == True,
    ).update({"is_active": False})

    conn = OzonConnection(
        seller_id=payload.seller_id,
        type=OzonConnectionType.API_KEY,
        client_id=payload.client_id.strip(),
        api_key_enc=encrypt_str(payload.api_key.strip()),
        is_active=True,
    )

    db.add(conn)
    db.commit()
    db.refresh(conn)

    return OzonConnectOut(connection_id=conn.id, is_active=conn.is_active)


def _get_conn(seller_id: str, db: Session) -> OzonConnection:
    conn = (
        db.query(OzonConnection)
        .filter(OzonConnection.seller_id == seller_id, OzonConnection.is_active == True)
        .order_by(OzonConnection.id.desc())
        .first()
    )
    if not conn:
        raise HTTPException(status_code=404, detail="Ozon connection not found")
    return conn


def _headers(conn: OzonConnection):
    api_key = decrypt_str(conn.api_key_enc)
    return {
        "Client-Id": conn.client_id,
        "Api-Key": api_key,
        "Content-Type": "application/json",
    }


@router.get("/test/{seller_id}")
async def ozon_test(seller_id: str, db: Session = Depends(get_db)):
    conn = _get_conn(seller_id, db)
    headers = _headers(conn)

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            "https://api-seller.ozon.ru/v3/product/list",
            headers=headers,
            json={"filter": {}, "limit": 1},
        )

    return {
        "status_code": resp.status_code,
        "response_text": resp.text,
    }


@router.get("/products/{seller_id}")
async def ozon_products(
    seller_id: str,
    limit: int = 100,
    last_id: str | None = None,
    db: Session = Depends(get_db),
):
    conn = _get_conn(seller_id, db)
    headers = _headers(conn)

    payload = {"filter": {}, "limit": limit}
    if last_id:
        payload["last_id"] = last_id

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api-seller.ozon.ru/v3/product/list",
            headers=headers,
            json=payload,
        )

    return {
        "ozon_status": resp.status_code,
        "ozon_body": resp.json(),
    }


@router.post("/products_sync/{seller_id}")
async def ozon_products_sync(
    seller_id: str,
    page_limit: int = 100,
    max_pages: int = 50,
    db: Session = Depends(get_db),
):
    conn = _get_conn(seller_id, db)
    headers = _headers(conn)

    url = "https://api-seller.ozon.ru/v3/product/list"

    upserted = 0
    all_items = []
    last_id = None

    async with httpx.AsyncClient(timeout=60) as client:
        for _ in range(max_pages):
            payload = {"filter": {}, "limit": page_limit}
            if last_id:
                payload["last_id"] = last_id

            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=resp.text)

            data = resp.json()
            result = (data or {}).get("result") or {}
            items = result.get("items") or []
            last_id = result.get("last_id")

            all_items.extend(items)

            if len(items) < page_limit:
                break

    for it in all_items:
        product_id = it.get("product_id")
        offer_id = it.get("offer_id")

        if product_id is None or offer_id is None:
            continue

        row = (
            db.query(OzonProduct)
            .filter(
                OzonProduct.seller_id == seller_id,
                OzonProduct.product_id == int(product_id),
            )
            .first()
        )

        if row:
            row.offer_id = str(offer_id)
            row.has_fbo_stocks = bool(it.get("has_fbo_stocks", False))
            row.has_fbs_stocks = bool(it.get("has_fbs_stocks", False))
            row.archived = bool(it.get("archived", False))
            row.is_discounted = bool(it.get("is_discounted", False))
        else:
            db.add(
                OzonProduct(
                    seller_id=seller_id,
                    product_id=int(product_id),
                    offer_id=str(offer_id),
                    has_fbo_stocks=bool(it.get("has_fbo_stocks", False)),
                    has_fbs_stocks=bool(it.get("has_fbs_stocks", False)),
                    archived=bool(it.get("archived", False)),
                    is_discounted=bool(it.get("is_discounted", False)),
                )
            )

        upserted += 1

    db.commit()

    return {
        "items_fetched": len(all_items),
        "rows_upserted": upserted,
        "last_id": last_id,
    }


@router.post("/stocks_fbo_sync/{seller_id}")
async def ozon_stocks_fbo_sync(
    seller_id: str,
    page_limit: int = 100,
    db: Session = Depends(get_db),
):
    conn = _get_conn(seller_id, db)
    headers = _headers(conn)

    url = "https://api-seller.ozon.ru/v4/product/info/stocks"

    products = (
        db.query(OzonProduct)
        .filter(OzonProduct.seller_id == seller_id)
        .all()
    )

    if not products:
        raise HTTPException(
            status_code=400,
            detail="No Ozon products found. Run products_sync first.",
        )

    offer_ids = [p.offer_id for p in products if p.offer_id]
    all_items = []

    async with httpx.AsyncClient(timeout=60) as client:
        for i in range(0, len(offer_ids), page_limit):
            chunk = offer_ids[i:i + page_limit]

            resp = await client.post(
                url,
                headers=headers,
                json={
                    "filter": {
                        "offer_id": chunk,
                    },
                    "limit": page_limit,
                },
            )

            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail=resp.text)

            data = resp.json()
            print("OZON STOCK RESPONSE:", data)

            items = (data or {}).get("items") or []
            all_items.extend(items)

    db.execute(
        delete(StockFbo).where(StockFbo.seller_id == seller_id)
    )

    inserted = 0

    for item in all_items:
        offer_id = item.get("offer_id")
        stocks = item.get("stocks") or []

        if not offer_id:
            continue

        for stock in stocks:
            present = stock.get("present", 0)
            cluster = stock.get("type", "unknown")

            db.add(
                StockFbo(
                    seller_id=seller_id,
                    offer_id=str(offer_id),
                    cluster=str(cluster),
                    qty=int(present),
                )
            )
            inserted += 1

    db.commit()

    return {
        "items_fetched": len(all_items),
        "rows_inserted": inserted,
    }