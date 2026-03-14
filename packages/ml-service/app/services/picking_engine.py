"""피킹 정책 엔진 — FIFO / FEFO / NEAREST + 경로 최적화"""

import math
from datetime import date, datetime, timezone

from app.schemas.picking import (
    BinAllocation,
    BinInventory,
    PickingOptimizationRequest,
    PickingOptimizationResult,
    PickingPolicy,
    PickRequest,
)


def _distance(x1: float, y1: float, z1: float, x2: float, y2: float, z2: float) -> float:
    """3D 유클리드 거리 (층간 이동은 z 가중치 2배)."""
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + ((z2 - z1) * 2) ** 2)


def _sort_bins_fifo(bins: list[BinInventory]) -> list[BinInventory]:
    """FIFO: 입고일이 가장 오래된 순으로 정렬."""
    default_date = date(2000, 1, 1)
    return sorted(bins, key=lambda b: b.received_date or default_date)


def _sort_bins_fefo(bins: list[BinInventory]) -> list[BinInventory]:
    """FEFO: 유통기한이 가장 가까운 순으로 정렬."""
    far_future = date(2099, 12, 31)
    return sorted(bins, key=lambda b: b.expiry_date or far_future)


def _sort_bins_nearest(bins: list[BinInventory], x: float, y: float, z: float) -> list[BinInventory]:
    """NEAREST: 현재 위치에서 가장 가까운 순으로 정렬."""
    return sorted(bins, key=lambda b: _distance(x, y, z, b.position_x, b.position_y, b.position_z))


def _allocate_bins(
    item: PickRequest,
    bins: list[BinInventory],
    policy: PickingPolicy,
    current_pos: tuple[float, float, float],
) -> tuple[list[tuple[BinInventory, int]], int]:
    """정책에 따라 bin을 선택하고 수량을 할당한다.
    Returns: ([(bin, allocated_qty), ...], remaining_qty)
    """
    sku_bins = [b for b in bins if b.sku == item.sku and b.qty_available > 0]

    if policy == PickingPolicy.FIFO:
        sorted_bins = _sort_bins_fifo(sku_bins)
    elif policy == PickingPolicy.FEFO:
        sorted_bins = _sort_bins_fefo(sku_bins)
    else:
        sorted_bins = _sort_bins_nearest(sku_bins, *current_pos)

    remaining = item.requested_qty
    allocations: list[tuple[BinInventory, int]] = []

    for bin_inv in sorted_bins:
        if remaining <= 0:
            break
        take = min(remaining, bin_inv.qty_available)
        allocations.append((bin_inv, take))
        bin_inv.qty_available -= take  # 재고 차감 (중복 할당 방지)
        remaining -= take

    return allocations, remaining


def _optimize_path(
    allocations: list[tuple[BinInventory, int, PickRequest]],
    start_x: float,
    start_y: float,
    start_z: float,
) -> list[tuple[BinInventory, int, PickRequest, int, float]]:
    """탐욕적 최근접 이웃 알고리즘으로 피킹 순서를 최적화한다.
    Returns: [(bin, qty, item, sequence, distance), ...]
    """
    if not allocations:
        return []

    remaining = list(allocations)
    result: list[tuple[BinInventory, int, PickRequest, int, float]] = []
    cx, cy, cz = start_x, start_y, start_z
    seq = 0

    while remaining:
        # 가장 가까운 다음 bin 선택
        best_idx = 0
        best_dist = float("inf")
        for i, (bin_inv, _, _) in enumerate(remaining):
            d = _distance(cx, cy, cz, bin_inv.position_x, bin_inv.position_y, bin_inv.position_z)
            if d < best_dist:
                best_dist = d
                best_idx = i

        bin_inv, qty, item = remaining.pop(best_idx)
        seq += 1
        result.append((bin_inv, qty, item, seq, round(best_dist, 2)))
        cx, cy, cz = bin_inv.position_x, bin_inv.position_y, bin_inv.position_z

    return result


def optimize_picking(request: PickingOptimizationRequest) -> PickingOptimizationResult:
    """피킹 최적화를 수행한다."""
    # 1단계: 정책에 따라 bin 할당
    all_allocations: list[tuple[BinInventory, int, PickRequest]] = []
    short_details: list[dict] = []

    for item in request.pick_items:
        bin_allocs, remaining = _allocate_bins(
            item,
            request.available_bins,
            request.policy,
            (request.start_x, request.start_y, request.start_z),
        )
        for bin_inv, qty in bin_allocs:
            all_allocations.append((bin_inv, qty, item))
        if remaining > 0:
            short_details.append({
                "sku": item.sku,
                "item_name": item.item_name,
                "requested_qty": item.requested_qty,
                "short_qty": remaining,
            })

    # 2단계: 경로 최적화 (최근접 이웃)
    optimized = _optimize_path(
        all_allocations, request.start_x, request.start_y, request.start_z
    )

    # 3단계: 결과 생성
    result_allocations: list[BinAllocation] = []
    total_distance = 0.0
    for bin_inv, qty, item, seq, dist in optimized:
        total_distance += dist
        result_allocations.append(
            BinAllocation(
                sku=item.sku,
                item_name=item.item_name,
                requested_qty=item.requested_qty,
                allocated_qty=qty,
                bin_id=bin_inv.bin_id,
                bin_code=bin_inv.bin_code,
                zone=bin_inv.zone,
                barcode=bin_inv.barcode,
                expiry_date=bin_inv.expiry_date,
                received_date=bin_inv.received_date,
                pick_sequence=seq,
                distance_from_prev=dist,
            )
        )

    total_distance = round(total_distance, 2)
    # 평균 피킹 속도: 1분에 약 15m 이동 + bin당 20초 피킹
    estimated_minutes = round(total_distance / 15 + len(result_allocations) * 20 / 60, 1)

    fulfilled_skus = set()
    for item in request.pick_items:
        total_alloc = sum(qty for b, qty, i in all_allocations if i.sku == item.sku)
        if total_alloc >= item.requested_qty:
            fulfilled_skus.add(item.sku)

    return PickingOptimizationResult(
        site_id=request.site_id,
        policy=request.policy,
        allocations=result_allocations,
        total_items=len(request.pick_items),
        fulfilled_items=len(fulfilled_skus),
        short_items=len(short_details),
        short_details=short_details,
        total_distance=total_distance,
        estimated_time_minutes=estimated_minutes,
        optimized_at=datetime.now(timezone.utc),
    )
