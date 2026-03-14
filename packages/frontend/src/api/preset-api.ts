import type { PresetCategory, SpatialPreset } from '../types/preset';
import { MOCK_CATEGORIES, MOCK_PRESETS } from '../data/mock-presets';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

// API 호출 + fallback mock 데이터
async function fetchApi<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<T> = await res.json();
    if (json.success && json.data) return json.data;
    throw new Error(json.error?.message ?? '알 수 없는 오류');
  } catch {
    // API 미연결 시 mock 데이터 사용
    console.warn(`[API] ${path} 연결 실패, mock 데이터 사용`);
    return fallback;
  }
}

export async function getPresetCategories(): Promise<PresetCategory[]> {
  return fetchApi('/api/v1/preset-categories', MOCK_CATEGORIES);
}

export async function getSpatialPresets(categoryId?: string): Promise<SpatialPreset[]> {
  const query = categoryId ? `?categoryId=${categoryId}` : '';
  const fallback = categoryId
    ? MOCK_PRESETS.filter((p) => p.categoryId === categoryId)
    : MOCK_PRESETS;
  return fetchApi(`/api/v1/spatial-presets${query}`, fallback);
}
