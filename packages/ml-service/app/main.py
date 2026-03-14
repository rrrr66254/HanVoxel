"""HanVoxel ML Service — FastAPI 진입점"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.anomaly import router as anomaly_router
from app.routers.sla import router as sla_router
from app.routers.qc import router as qc_router
from app.routers.picking import router as picking_router

app = FastAPI(
    title="HanVoxel ML Service",
    description="창고 이상 탐지 및 최적화를 위한 ML 엔진",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(anomaly_router, prefix="/api/v1")
app.include_router(sla_router, prefix="/api/v1")
app.include_router(qc_router, prefix="/api/v1")
app.include_router(picking_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"service": "HanVoxel ML Service", "version": "0.1.0"}
