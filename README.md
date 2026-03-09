# Ozon SaaS MVP

Backend for analytics and stock monitoring for Ozon sellers.

## Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- Ozon Seller API

## Features

✔ Ozon API connection  
✔ Product synchronization  
✔ FBO stock synchronization  
✔ Stock thresholds  
✔ Stock alerts API  

## API

Main endpoints:

### Connect Ozon

POST /api/v1/integrations/ozon/connect

### Sync products

POST /api/v1/integrations/ozon/products_sync/{seller_id}

### Sync FBO stocks

POST /api/v1/integrations/ozon/stocks_fbo_sync/{seller_id}

### Set threshold

POST /api/v1/ozon/sellers/{seller_id}/ozon/thresholds:upsert

### Get alerts

GET /api/v1/ozon/sellers/{seller_id}/alerts


## Status

MVP in development.