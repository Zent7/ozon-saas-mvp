from fastapi import FastAPI

app = FastAPI(title="Ozon SaaS MVP")

@app.get("/health")
def health():
    return {"status": "ok"}