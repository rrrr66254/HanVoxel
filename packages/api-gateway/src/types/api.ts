// HanVoxel 표준 API 응답 형식

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
}

// 성공 응답 헬퍼
export function successResponse<T>(data: T, meta?: ApiMeta): ApiResponse<T> {
  return { success: true, data, error: null, meta };
}

// 에러 응답 헬퍼
export function errorResponse(code: string, message: string): ApiResponse<null> {
  return { success: false, data: null, error: { code, message } };
}
