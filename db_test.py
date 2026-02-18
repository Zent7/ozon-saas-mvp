from sqlalchemy import create_engine, text

engine = create_engine(
    "postgresql+psycopg://ozon:ozon123@127.0.0.1:5432/ozon_saas",
    pool_pre_ping=True
)

with engine.connect() as conn:
    print("DB OK:", conn.execute(text("select 1")).scalar())