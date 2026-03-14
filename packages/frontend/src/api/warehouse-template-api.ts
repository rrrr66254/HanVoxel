import type { WarehouseTemplate } from '../types/warehouse-template';
import { MOCK_TEMPLATES } from '../data/mock-templates';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

// 창고 템플릿 목록 조회 (업종 필터)
export async function getWarehouseTemplates(industry?: string): Promise<WarehouseTemplate[]> {
  try {
    const query = industry ? `?industry=${industry}` : '';
    const res = await fetch(`${API_BASE}/api/v1/warehouse-templates${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<WarehouseTemplate[]> = await res.json();
    if (json.success && json.data) return json.data;
    throw new Error(json.error?.message ?? '알 수 없는 오류');
  } catch {
    console.warn('[API] warehouse-templates 연결 실패, mock 데이터 사용');
    return industry ? MOCK_TEMPLATES.filter((t) => t.industry === industry) : MOCK_TEMPLATES;
  }
}

// 창고 템플릿 단건 조회
export async function getWarehouseTemplate(code: string): Promise<WarehouseTemplate | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/warehouse-templates/${code}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<WarehouseTemplate> = await res.json();
    if (json.success && json.data) return json.data;
    return null;
  } catch {
    console.warn('[API] warehouse-template 연결 실패, mock 데이터 사용');
    return MOCK_TEMPLATES.find((t) => t.code === code) ?? null;
  }
}
