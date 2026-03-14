"""피킹 정책 엔진 요청/응답 스키마"""

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class PickingPolicy(str, Enum):
    FIFO = "FIFO"      # 선입선출 (입고일 기준)
    FEFO = "FEFO"      # 선만기선출 (유통기한 기준)
    NEAREST = "NEAREST"  # 최단 거리


# === 요청 스키마 ===

class BinInventory(BaseModel):
    """bin 위치의 재고 정보"""
    bin_id: str
    bin_code: str
    zone: str = ""
    sku: str
    qty_available: int
    barcode: str = ""
    expiry_date: Optional[date] = None
    received_date: Optional[date] = None
    # 좌표 (최단 경로 계산용)
    position_x: float = 0
    position_y: float = 0
    position_z: float = 0


class PickRequest(BaseModel):
    """단일 피킹 요청 아이템"""
    sku: str
    item_name: str = ""
    requested_qty: int


class PickingOptimizationRequest(BaseModel):
    """피킹 최적화 요청"""
    site_id: str
    policy: PickingPolicy = PickingPolicy.FIFO
    pick_items: list[PickRequest] = Field(..., min_length=1)
    available_bins: list[BinInventory] = Field(..., min_length=1)
    # 작업자 시작 위치 (최단 경로 계산 기준점)
    start_x: float = 0
    start_y: float = 0
    start_z: float = 0


# === 응답 스키마 ===

class BinAllocation(BaseModel):
    """정책에 의해 결정된 bin 할당"""
    sku: str
    item_name: str
    requested_qty: int
    allocated_qty: int
    bin_id: str
    bin_code: str
    zone: str
    barcode: str
    expiry_date: Optional[date] = None
    received_date: Optional[date] = None
    pick_sequence: int = Field(description="경로 최적화 피킹 순서")
    distance_from_prev: float = Field(description="이전 위치로부터 거리 (m)")


class PickingOptimizationResult(BaseModel):
    """피킹 최적화 결과"""
    site_id: str
    policy: PickingPolicy
    allocations: list[BinAllocation]
    total_items: int
    fulfilled_items: int
    short_items: int = Field(description="재고 부족 아이템 수")
    short_details: list[dict] = Field(description="재고 부족 상세")
    total_distance: float = Field(description="총 이동 거리 (m)")
    estimated_time_minutes: float = Field(description="예상 피킹 시간 (분)")
    optimized_at: datetime
