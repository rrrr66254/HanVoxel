/**
 * B2C 대량 출고 업로드 컨트롤러
 */
import type { Request, Response } from 'express';
import multer from 'multer';
import * as bulkService from '../services/bulk-outbound.service';

// ── multer 설정 (메모리 저장, 10MB 제한) ─────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('CSV 또는 Excel 파일만 업로드 가능합니다'));
    }
  },
});

export const uploadMiddleware = upload.single('file');

// ── CSV/Excel 파싱 유틸 ──────────────────────────

async function parseFileToRows(buffer: Buffer, filename: string): Promise<Record<string, string>[]> {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'csv' || ext === 'txt') {
    // CSV 파싱
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    return lines.slice(1).map((line) => {
      const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
      return row;
    });
  }

  if (ext === 'xlsx' || ext === 'xls') {
    // Excel 파싱 (동적 import)
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
  }

  throw new Error('지원하지 않는 파일 형식입니다');
}

// ── 파일 업로드 + 파싱 + 검증 ────────────────────

export async function bulkUploadHandler(req: Request, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: '파일이 필요합니다' } });
      return;
    }

    const siteId = String(req.body.siteId ?? 'demo');
    const platformType = String(req.body.platformType ?? 'CUSTOM');
    const uploadedBy = req.body.uploadedBy ? String(req.body.uploadedBy) : undefined;

    // 커스텀 매핑이 있으면 사용, 없으면 플랫폼 기본값
    let columnMapping: bulkService.ColumnMapping;
    if (req.body.columnMapping) {
      columnMapping = typeof req.body.columnMapping === 'string'
        ? JSON.parse(req.body.columnMapping)
        : req.body.columnMapping;
    } else {
      columnMapping = bulkService.getPlatformMapping(platformType);
    }

    // 파일 파싱
    const rawRows = await parseFileToRows(file.buffer, file.originalname);
    if (rawRows.length === 0) {
      res.status(400).json({ success: false, error: { code: 'EMPTY_FILE', message: '파일에 데이터가 없습니다' } });
      return;
    }

    // 검증
    const result = await bulkService.parseAndValidate(
      siteId,
      file.originalname,
      file.size,
      rawRows,
      platformType,
      columnMapping,
      uploadedBy,
    );

    // 응답에 파일 헤더(컬럼명) 추가
    const fileHeaders = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

    res.json({
      success: true,
      data: {
        ...result,
        fileHeaders,
        columnMapping,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '파일 업로드 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 대량 출고 주문 생성 ──────────────────────────

export async function bulkCreateHandler(req: Request, res: Response) {
  try {
    const { siteId, uploadLogId, rows } = req.body;
    if (!siteId || !uploadLogId || !rows?.length) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId, uploadLogId, rows 필수' } });
      return;
    }

    const result = await bulkService.bulkCreateOrders(siteId, uploadLogId, rows);
    res.json({ success: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '대량 생성 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 업로드 이력 조회 ─────────────────────────────

export async function uploadLogsHandler(req: Request, res: Response) {
  try {
    const siteId = String(req.query.siteId ?? '');
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    if (!siteId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'siteId 필수' } });
      return;
    }

    const result = await bulkService.getUploadLogs(siteId, page, limit);
    res.json({ success: true, data: result.logs, meta: { total: result.total, page, limit } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '이력 조회 실패';
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: msg } });
  }
}

// ── 플랫폼 매핑 조회 ─────────────────────────────

export function platformMappingHandler(req: Request, res: Response) {
  const platform = String(req.query.platform ?? 'CUSTOM');
  const mapping = bulkService.getPlatformMapping(platform);
  res.json({ success: true, data: { platform, mapping } });
}

// ── 플랫폼 템플릿 CSV 다운로드 ──────────────────

export function templateDownloadHandler(req: Request, res: Response) {
  const platform = String(req.params.platform ?? 'CUSTOM').toUpperCase();
  const mapping = bulkService.getPlatformMapping(platform);

  // 헤더 행 = 매핑의 value (소스 컬럼명)
  const headers = Object.values(mapping);
  const csvContent = headers.join(',') + '\n';

  const platformLabel = platform === 'COUPANG' ? '쿠팡'
    : platform === 'SMARTSTORE' ? '스마트스토어'
    : '기본';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${platformLabel}_출고_템플릿.csv"`);
  // BOM 추가 (Excel에서 한글 정상 표시)
  res.send('\uFEFF' + csvContent);
}
