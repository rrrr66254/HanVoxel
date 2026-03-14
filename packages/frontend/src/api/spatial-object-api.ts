import type { SpatialObject } from '../types/spatial';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

// 공간 객체 생성 (DB 저장)
export async function createSpatialObject(obj: {
  siteId: string;
  typeId: string;
  name: string;
  code: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color?: string | null;
  opacity?: number;
  meshType?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<SpatialObject | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/spatial-objects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj),
    });
    const json: ApiResponse<SpatialObject> = await res.json();
    if (json.success && json.data) return json.data;
    console.error('[API] 공간 객체 생성 실패:', json.error?.message);
    return null;
  } catch (err) {
    console.warn('[API] 공간 객체 생성 요청 실패 (오프라인 모드):', err);
    return null;
  }
}

// 공간 객체 수정
export async function updateSpatialObject(
  id: string,
  data: Partial<{
    name: string;
    positionX: number;
    positionY: number;
    positionZ: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    color: string | null;
    opacity: number;
    meshType: string | null;
  }>,
): Promise<SpatialObject | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/spatial-objects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json: ApiResponse<SpatialObject> = await res.json();
    if (json.success && json.data) return json.data;
    console.error('[API] 공간 객체 수정 실패:', json.error?.message);
    return null;
  } catch (err) {
    console.warn('[API] 공간 객체 수정 요청 실패 (오프라인 모드):', err);
    return null;
  }
}

// 공간 객체 삭제
export async function deleteSpatialObject(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/spatial-objects/${id}`, {
      method: 'DELETE',
    });
    const json: ApiResponse<{ deleted: boolean }> = await res.json();
    return json.success === true;
  } catch (err) {
    console.warn('[API] 공간 객체 삭제 요청 실패 (오프라인 모드):', err);
    return false;
  }
}
