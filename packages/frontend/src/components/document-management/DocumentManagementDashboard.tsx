/**
 * HanVoxel — 문서 관리 대시보드 (다크 테마)
 *
 * 기능:
 *   - 문서 목록 (유형별 필터 + 검색 + 만료 배지)
 *   - 문서 업로드 (폼 기반 등록)
 *   - 만료 관리 (KPI + 타임라인 + 알림)
 *
 * localStorage 기반 mock 데이터 영속화
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  FileText,
  Upload,
  Clock,
  Search,
  Download,
  Share2,
  History,
  Plus,
  Save,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';

// --- 디자인 토큰 ---
const C = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  text: '#C9D1D9',
  textMuted: '#8B949E',
  accent: '#58A6FF',
  green: '#3FB950',
  yellow: '#D29922',
  orange: '#D29922',
  red: '#F85149',
} as const;

// --- 타입 정의 ---

/** 문서 유형 */
type DocType = 'CONTRACT' | 'CERTIFICATE' | 'DRAWING' | 'INSPECTION' | 'INVOICE' | 'OTHER';

/** 연결 대상 유형 */
type EntityType = 'PARTNER' | 'ORDER' | 'PRODUCT' | 'SITE';

/** 문서 레코드 */
interface DocumentRecord {
  id: string;
  title: string;
  docType: DocType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  issuedAt: string;
  expiresAt: string | null;
  tags: string[];
  fileName: string;
  fileType: string;
  fileSize: number;
  version: number;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

/** 업로드 폼 상태 */
interface UploadFormState {
  title: string;
  docType: DocType;
  entityType: EntityType;
  entityId: string;
  issuedAt: string;
  expiresAt: string;
  tags: string;
  fileName: string;
  memo: string;
}

/** 탭 식별자 */
type TabId = 'list' | 'upload' | 'expiry';

// --- 상수 ---

const DOC_TYPE_OPTIONS: { value: DocType; label: string; emoji: string }[] = [
  { value: 'CONTRACT', label: '계약서', emoji: '\uD83D\uDCC4' },
  { value: 'CERTIFICATE', label: '인증서', emoji: '\uD83D\uDCCB' },
  { value: 'DRAWING', label: '도면', emoji: '\uD83D\uDCD0' },
  { value: 'INSPECTION', label: '검사성적서', emoji: '\uD83D\uDD0D' },
  { value: 'INVOICE', label: '송장', emoji: '\uD83D\uDCB0' },
  { value: 'OTHER', label: '기타', emoji: '\uD83D\uDCC1' },
];

const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: 'PARTNER', label: '거래처' },
  { value: 'ORDER', label: '주문' },
  { value: 'PRODUCT', label: '제품' },
  { value: 'SITE', label: '사이트' },
];

/** 문서 유형 → 이모지 매핑 */
const DOC_EMOJI: Record<DocType, string> = {
  CONTRACT: '\uD83D\uDCC4',
  CERTIFICATE: '\uD83D\uDCCB',
  DRAWING: '\uD83D\uDCD0',
  INSPECTION: '\uD83D\uDD0D',
  INVOICE: '\uD83D\uDCB0',
  OTHER: '\uD83D\uDCC1',
};

/** 문서 유형 → 한글 라벨 */
const DOC_LABEL: Record<DocType, string> = {
  CONTRACT: '계약서',
  CERTIFICATE: '인증서',
  DRAWING: '도면',
  INSPECTION: '검사성적서',
  INVOICE: '송장',
  OTHER: '기타',
};

const STORAGE_KEY = 'hanvoxel_documents';

// --- 유틸 함수 ---

/** D-day 계산 (양수 = 남은 일수, 음수 = 만료 경과) */
function calcDday(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiresAt);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** D-day 표시 문자열 */
function formatDday(dday: number | null): string {
  if (dday === null) return '-';
  if (dday === 0) return 'D-DAY';
  if (dday > 0) return `D-${dday}`;
  return `D+${Math.abs(dday)}`;
}

/** D-day 기반 색상 */
function ddayColor(dday: number | null): string {
  if (dday === null) return C.textMuted;
  if (dday < 0) return C.red;
  if (dday <= 7) return C.orange;
  if (dday <= 30) return C.yellow;
  return C.green;
}

/** 파일 크기 포매팅 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 날짜 포매팅 (YYYY-MM-DD) */
function formatDate(dateStr: string): string {
  return dateStr.substring(0, 10);
}

/** 고유 ID 생성 */
function generateId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// --- Mock 데이터 ---
const INITIAL_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc-001',
    title: '현대모비스 납품 계약서 2026',
    docType: 'CONTRACT',
    entityType: 'PARTNER',
    entityId: 'partner-001',
    entityName: '현대모비스',
    issuedAt: '2026-01-15',
    expiresAt: '2026-04-15',
    tags: ['납품', '계약', '현대'],
    fileName: '현대모비스_납품계약서_2026.pdf',
    fileType: 'PDF',
    fileSize: 2457600,
    version: 2,
    memo: '2차 수정본',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-02-10T14:30:00Z',
  },
  {
    id: 'doc-002',
    title: 'ISO 9001 품질 인증서',
    docType: 'CERTIFICATE',
    entityType: 'SITE',
    entityId: 'site-001',
    entityName: '화성 물류센터',
    issuedAt: '2025-06-01',
    expiresAt: '2026-03-20',
    tags: ['ISO', '품질', '인증'],
    fileName: 'ISO9001_품질인증서.pdf',
    fileType: 'PDF',
    fileSize: 1843200,
    version: 1,
    memo: '갱신 필요',
    createdAt: '2025-06-01T10:00:00Z',
    updatedAt: '2025-06-01T10:00:00Z',
  },
  {
    id: 'doc-003',
    title: 'A동 랙 배치 도면 v3',
    docType: 'DRAWING',
    entityType: 'SITE',
    entityId: 'site-001',
    entityName: '화성 물류센터',
    issuedAt: '2026-03-01',
    expiresAt: null,
    tags: ['도면', '랙', 'A동'],
    fileName: 'A동_랙배치도면_v3.dwg',
    fileType: 'DWG',
    fileSize: 5242880,
    version: 3,
    memo: '3차 수정 - 통로 폭 조정',
    createdAt: '2026-03-01T11:00:00Z',
    updatedAt: '2026-03-01T11:00:00Z',
  },
  {
    id: 'doc-004',
    title: '삼성SDI 코발트 분말 검사성적서',
    docType: 'INSPECTION',
    entityType: 'PARTNER',
    entityId: 'partner-003',
    entityName: '삼성SDI',
    issuedAt: '2026-03-10',
    expiresAt: '2026-06-10',
    tags: ['검사', '원자재', '코발트'],
    fileName: '삼성SDI_코발트_검사성적서.pdf',
    fileType: 'PDF',
    fileSize: 921600,
    version: 1,
    memo: '',
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-03-10T09:00:00Z',
  },
  {
    id: 'doc-005',
    title: '롯데케미칼 세금계산서 2026-03',
    docType: 'INVOICE',
    entityType: 'PARTNER',
    entityId: 'partner-004',
    entityName: '롯데케미칼',
    issuedAt: '2026-03-15',
    expiresAt: null,
    tags: ['세금계산서', '3월'],
    fileName: '롯데케미칼_세금계산서_202603.pdf',
    fileType: 'PDF',
    fileSize: 307200,
    version: 1,
    memo: '3월분 정산',
    createdAt: '2026-03-15T16:00:00Z',
    updatedAt: '2026-03-15T16:00:00Z',
  },
  {
    id: 'doc-006',
    title: 'IATF 16949 자동차 품질 인증서',
    docType: 'CERTIFICATE',
    entityType: 'SITE',
    entityId: 'site-001',
    entityName: '화성 물류센터',
    issuedAt: '2025-09-01',
    expiresAt: '2026-03-25',
    tags: ['IATF', '자동차', '인증'],
    fileName: 'IATF16949_인증서.pdf',
    fileType: 'PDF',
    fileSize: 1536000,
    version: 1,
    memo: '갱신 심사 예정',
    createdAt: '2025-09-01T10:00:00Z',
    updatedAt: '2025-09-01T10:00:00Z',
  },
  {
    id: 'doc-007',
    title: 'BMW Munich 품질 협약서',
    docType: 'CONTRACT',
    entityType: 'PARTNER',
    entityId: 'partner-005',
    entityName: 'BMW Munich',
    issuedAt: '2025-12-01',
    expiresAt: '2026-03-15',
    tags: ['BMW', '품질', '협약'],
    fileName: 'BMW_품질협약서.pdf',
    fileType: 'PDF',
    fileSize: 3145728,
    version: 1,
    memo: '만료 - 갱신 필요',
    createdAt: '2025-12-01T09:00:00Z',
    updatedAt: '2025-12-01T09:00:00Z',
  },
  {
    id: 'doc-008',
    title: '포스코케미칼 리튬 원료 검사성적서',
    docType: 'INSPECTION',
    entityType: 'PARTNER',
    entityId: 'partner-006',
    entityName: '포스코케미칼',
    issuedAt: '2026-02-20',
    expiresAt: '2026-05-20',
    tags: ['검사', '리튬', '원료'],
    fileName: '포스코케미칼_리튬_검사성적서.pdf',
    fileType: 'PDF',
    fileSize: 768000,
    version: 1,
    memo: '',
    createdAt: '2026-02-20T14:00:00Z',
    updatedAt: '2026-02-20T14:00:00Z',
  },
  {
    id: 'doc-009',
    title: '냉장창고 HACCP 인증서',
    docType: 'CERTIFICATE',
    entityType: 'SITE',
    entityId: 'site-002',
    entityName: '평택 냉장센터',
    issuedAt: '2025-11-01',
    expiresAt: '2026-04-01',
    tags: ['HACCP', '냉장', '인증'],
    fileName: 'HACCP_인증서.pdf',
    fileType: 'PDF',
    fileSize: 1228800,
    version: 1,
    memo: '',
    createdAt: '2025-11-01T09:00:00Z',
    updatedAt: '2025-11-01T09:00:00Z',
  },
  {
    id: 'doc-010',
    title: '위험물 취급 허가서',
    docType: 'OTHER',
    entityType: 'SITE',
    entityId: 'site-001',
    entityName: '화성 물류센터',
    issuedAt: '2025-08-01',
    expiresAt: '2026-03-19',
    tags: ['위험물', '허가', '안전'],
    fileName: '위험물취급허가서.pdf',
    fileType: 'PDF',
    fileSize: 614400,
    version: 2,
    memo: '내일 만료 - 긴급 갱신 필요',
    createdAt: '2025-08-01T09:00:00Z',
    updatedAt: '2026-03-01T15:00:00Z',
  },
];

// --- localStorage 헬퍼 ---

/** localStorage에서 문서 목록 로드 */
function loadDocuments(): DocumentRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as DocumentRecord[];
  } catch {
    // 파싱 실패 시 초기 데이터 사용
  }
  return INITIAL_DOCUMENTS;
}

/** localStorage에 문서 목록 저장 */
function saveDocuments(docs: DocumentRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

// --- 컴포넌트 Props ---
interface DocumentManagementDashboardProps {
  onBack: () => void;
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================
export function DocumentManagementDashboard({ onBack }: DocumentManagementDashboardProps) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('list');

  // 초기 데이터 로드
  useEffect(() => {
    setDocuments(loadDocuments());
  }, []);

  // 문서 추가 핸들러
  const handleAddDocument = useCallback((doc: DocumentRecord) => {
    setDocuments((prev) => {
      const updated = [doc, ...prev];
      saveDocuments(updated);
      return updated;
    });
    // 등록 후 목록 탭으로 이동
    setActiveTab('list');
  }, []);

  // 탭 정의
  const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
    { id: 'list', label: '문서 목록', icon: FileText },
    { id: 'upload', label: '문서 업로드', icon: Upload },
    { id: 'expiry', label: '만료 관리', icon: Clock },
  ];

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 24px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: C.textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
          title="뒤로 가기"
        >
          <ArrowLeft size={20} />
        </button>
        <FileText size={22} color={C.accent} />
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>문서 관리</h1>
      </div>

      {/* 탭 네비게이션 */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '12px 24px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                background: isActive ? C.accent + '20' : 'transparent',
                color: isActive ? C.accent : C.textMuted,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 탭 컨텐츠 */}
      <div style={{ padding: 24 }}>
        {activeTab === 'list' && <DocumentListTab documents={documents} />}
        {activeTab === 'upload' && <UploadTab onSubmit={handleAddDocument} />}
        {activeTab === 'expiry' && <ExpiryTab documents={documents} />}
      </div>
    </div>
  );
}

// =============================================================================
// Tab 1: 문서 목록
// =============================================================================

/** 문서 유형 필터 탭 값 */
type DocFilterType = 'ALL' | DocType;

function DocumentListTab({ documents }: { documents: DocumentRecord[] }) {
  const [filterType, setFilterType] = useState<DocFilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 필터 탭 목록
  const filterTabs: { value: DocFilterType; label: string }[] = [
    { value: 'ALL', label: '전체' },
    { value: 'CONTRACT', label: '계약서' },
    { value: 'CERTIFICATE', label: '인증서' },
    { value: 'DRAWING', label: '도면' },
    { value: 'INSPECTION', label: '검사성적서' },
    { value: 'OTHER', label: '기타' },
  ];

  // 필터링된 문서 목록
  const filtered = useMemo(() => {
    let result = documents;

    // 유형 필터
    if (filterType !== 'ALL') {
      result = result.filter((d) => d.docType === filterType);
    }

    // 검색 필터 (제목 + 태그)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [documents, filterType, searchQuery]);

  return (
    <div>
      {/* 유형 필터 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterType(tab.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1px solid ${filterType === tab.value ? C.accent : C.border}`,
              background: filterType === tab.value ? C.accent + '20' : 'transparent',
              color: filterType === tab.value ? C.accent : C.textMuted,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: filterType === tab.value ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 검색 입력 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 20,
        }}
      >
        <Search size={16} color={C.textMuted} />
        <input
          type="text"
          placeholder="제목 또는 태그로 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: C.text,
            fontSize: 14,
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              background: 'none',
              border: 'none',
              color: C.textMuted,
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 결과 카운트 */}
      <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 16 }}>
        {filtered.length}건의 문서
      </p>

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 48,
            color: C.textMuted,
          }}
        >
          <FileText size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p>검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

/** 개별 문서 카드 */
function DocumentCard({ doc }: { doc: DocumentRecord }) {
  const dday = calcDday(doc.expiresAt);
  const color = ddayColor(dday);

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* 상단: 아이콘 + 제목 + 만료 배지 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>{DOC_EMOJI[doc.docType]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              margin: 0,
              color: C.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {doc.title}
          </h3>
          <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>
            {DOC_LABEL[doc.docType]}
          </p>
        </div>
        {/* 만료 배지 */}
        {doc.expiresAt && dday !== null && dday <= 30 && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 12,
              background: color + '20',
              color,
              whiteSpace: 'nowrap',
            }}
          >
            {formatDday(dday)}
          </span>
        )}
      </div>

      {/* 연결 엔티티 */}
      <div style={{ fontSize: 13, color: C.textMuted }}>
        <span style={{ color: C.accent }}>{doc.entityName}</span>
      </div>

      {/* 정보 행 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
          color: C.textMuted,
        }}
      >
        {doc.expiresAt && (
          <span>
            만료: <span style={{ color }}>{formatDate(doc.expiresAt)}</span>
            {dday !== null && (
              <span style={{ color, marginLeft: 4 }}>({formatDday(dday)})</span>
            )}
          </span>
        )}
        <span>v{doc.version}</span>
        <span>{doc.fileType}</span>
        <span>{formatFileSize(doc.fileSize)}</span>
      </div>

      {/* 태그 */}
      {doc.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {doc.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 10,
                background: C.accent + '15',
                color: C.accent,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 'auto',
          paddingTop: 8,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <ActionButton icon={Download} label="다운로드" />
        <ActionButton icon={Share2} label="공유" />
        <ActionButton icon={History} label="버전 이력" />
      </div>
    </div>
  );
}

/** 카드 내 액션 버튼 */
function ActionButton({ icon: Icon, label }: { icon: typeof Download; label: string }) {
  return (
    <button
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '5px 10px',
        borderRadius: 6,
        border: `1px solid ${C.border}`,
        background: 'transparent',
        color: C.textMuted,
        cursor: 'pointer',
        fontSize: 12,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.color = C.accent;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.color = C.textMuted;
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

// =============================================================================
// Tab 2: 문서 업로드
// =============================================================================

const EMPTY_FORM: UploadFormState = {
  title: '',
  docType: 'CONTRACT',
  entityType: 'PARTNER',
  entityId: '',
  issuedAt: '',
  expiresAt: '',
  tags: '',
  fileName: '',
  memo: '',
};

/** 연결 대상 목록 (mock) */
const ENTITY_OPTIONS: Record<EntityType, { id: string; name: string }[]> = {
  PARTNER: [
    { id: 'partner-001', name: '현대모비스' },
    { id: 'partner-002', name: 'LG화학' },
    { id: 'partner-003', name: '삼성SDI' },
    { id: 'partner-004', name: '롯데케미칼' },
    { id: 'partner-005', name: 'BMW Munich' },
    { id: 'partner-006', name: '포스코케미칼' },
  ],
  ORDER: [
    { id: 'order-001', name: 'SO-20260317-0001' },
    { id: 'order-002', name: 'SO-20260315-0001' },
    { id: 'order-003', name: 'PO-20260310-0001' },
  ],
  PRODUCT: [
    { id: 'prod-001', name: '가솔린 엔진 밸브 (SKU-2891)' },
    { id: 'prod-002', name: '리튬이온 배터리 셀 (SKU-4501)' },
    { id: 'prod-003', name: '양극재 분말 (SKU-1120)' },
  ],
  SITE: [
    { id: 'site-001', name: '화성 물류센터' },
    { id: 'site-002', name: '평택 냉장센터' },
  ],
};

/** 파일 확장자 → 파일 타입 매핑 */
function inferFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toUpperCase() ?? '';
  const map: Record<string, string> = {
    PDF: 'PDF',
    DWG: 'DWG',
    DXF: 'DXF',
    XLSX: 'Excel',
    XLS: 'Excel',
    DOCX: 'Word',
    DOC: 'Word',
    PNG: 'PNG',
    JPG: 'JPG',
    JPEG: 'JPEG',
  };
  return map[ext] ?? ext || 'Unknown';
}

function UploadTab({ onSubmit }: { onSubmit: (doc: DocumentRecord) => void }) {
  const [form, setForm] = useState<UploadFormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof UploadFormState, string>>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // 폼 필드 업데이트
  const updateField = useCallback(
    <K extends keyof UploadFormState>(field: K, value: UploadFormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      // 해당 필드 에러 클리어
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    },
    []
  );

  // entityType 변경 시 entityId 초기화
  const handleEntityTypeChange = useCallback(
    (value: EntityType) => {
      updateField('entityType', value);
      updateField('entityId', '');
    },
    [updateField]
  );

  // 유효성 검증
  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof UploadFormState, string>> = {};
    if (!form.title.trim()) errs.title = '제목을 입력하세요';
    if (!form.entityId) errs.entityId = '연결 대상을 선택하세요';
    if (!form.issuedAt) errs.issuedAt = '발행일을 입력하세요';
    if (!form.fileName.trim()) errs.fileName = '파일을 선택하세요';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  // 제출 핸들러
  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const entityOptions = ENTITY_OPTIONS[form.entityType];
    const entity = entityOptions.find((e) => e.id === form.entityId);

    const doc: DocumentRecord = {
      id: generateId(),
      title: form.title.trim(),
      docType: form.docType,
      entityType: form.entityType,
      entityId: form.entityId,
      entityName: entity?.name ?? '',
      issuedAt: form.issuedAt,
      expiresAt: form.expiresAt || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      fileName: form.fileName.trim(),
      fileType: inferFileType(form.fileName.trim()),
      fileSize: Math.floor(Math.random() * 5000000) + 100000, // mock 파일 크기
      version: 1,
      memo: form.memo.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(doc);
    setForm(EMPTY_FORM);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  }, [form, validate, onSubmit]);

  // 공통 입력 스타일
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.bg,
    color: C.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: C.text,
    marginBottom: 6,
  };

  const errorStyle: React.CSSProperties = {
    fontSize: 12,
    color: C.red,
    marginTop: 4,
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 24,
          }}
        >
          <Plus size={18} color={C.accent} />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>새 문서 등록</h2>
        </div>

        {/* 성공 메시지 */}
        {showSuccess && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              marginBottom: 16,
              borderRadius: 8,
              background: C.green + '20',
              color: C.green,
              fontSize: 14,
            }}
          >
            <CheckCircle2 size={16} />
            문서가 성공적으로 등록되었습니다.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 제목 */}
          <div>
            <label style={labelStyle}>
              제목 <span style={{ color: C.red }}>*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="문서 제목을 입력하세요"
              style={{
                ...inputStyle,
                borderColor: errors.title ? C.red : C.border,
              }}
            />
            {errors.title && <p style={errorStyle}>{errors.title}</p>}
          </div>

          {/* 문서 유형 */}
          <div>
            <label style={labelStyle}>문서 유형</label>
            <select
              value={form.docType}
              onChange={(e) => updateField('docType', e.target.value as DocType)}
              style={selectStyle}
            >
              {DOC_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.emoji} {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 연결 대상 유형 + ID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>연결 대상 유형</label>
              <select
                value={form.entityType}
                onChange={(e) => handleEntityTypeChange(e.target.value as EntityType)}
                style={selectStyle}
              >
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>
                연결 대상 <span style={{ color: C.red }}>*</span>
              </label>
              <select
                value={form.entityId}
                onChange={(e) => updateField('entityId', e.target.value)}
                style={{
                  ...selectStyle,
                  borderColor: errors.entityId ? C.red : C.border,
                }}
              >
                <option value="">선택하세요</option>
                {ENTITY_OPTIONS[form.entityType].map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
              {errors.entityId && <p style={errorStyle}>{errors.entityId}</p>}
            </div>
          </div>

          {/* 발행일 / 만료일 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>
                발행일 <span style={{ color: C.red }}>*</span>
              </label>
              <input
                type="date"
                value={form.issuedAt}
                onChange={(e) => updateField('issuedAt', e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: errors.issuedAt ? C.red : C.border,
                }}
              />
              {errors.issuedAt && <p style={errorStyle}>{errors.issuedAt}</p>}
            </div>
            <div>
              <label style={labelStyle}>만료일</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => updateField('expiresAt', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* 태그 */}
          <div>
            <label style={labelStyle}>태그</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => updateField('tags', e.target.value)}
              placeholder="쉼표로 구분 (예: 계약, 납품, 긴급)"
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
              쉼표(,)로 구분하여 여러 태그를 입력할 수 있습니다.
            </p>
          </div>

          {/* 파일 선택 (가상 파일 입력) */}
          <div>
            <label style={labelStyle}>
              파일 <span style={{ color: C.red }}>*</span>
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <input
                type="text"
                value={form.fileName}
                onChange={(e) => updateField('fileName', e.target.value)}
                placeholder="파일명을 입력하세요 (예: 계약서.pdf)"
                style={{
                  ...inputStyle,
                  flex: 1,
                  borderColor: errors.fileName ? C.red : C.border,
                }}
              />
              <button
                onClick={() => {
                  // 가상 파일 선택 — 데모에서는 샘플 파일명 삽입
                  if (!form.fileName) {
                    updateField('fileName', '문서_' + Date.now() + '.pdf');
                  }
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: `1px solid ${C.border}`,
                  background: C.bg,
                  color: C.accent,
                  cursor: 'pointer',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                }}
              >
                파일 선택
              </button>
            </div>
            {errors.fileName && <p style={errorStyle}>{errors.fileName}</p>}
          </div>

          {/* 메모 */}
          <div>
            <label style={labelStyle}>메모</label>
            <textarea
              value={form.memo}
              onChange={(e) => updateField('memo', e.target.value)}
              placeholder="추가 메모 사항..."
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 제출 버튼 */}
          <button
            onClick={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: C.accent,
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <Save size={16} />
            문서 등록
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tab 3: 만료 관리
// =============================================================================

function ExpiryTab({ documents }: { documents: DocumentRecord[] }) {
  // 만료일이 있는 문서만 추출 + D-day 계산
  const docsWithExpiry = useMemo(() => {
    return documents
      .filter((d): d is DocumentRecord & { expiresAt: string } => d.expiresAt !== null)
      .map((d) => ({
        ...d,
        dday: calcDday(d.expiresAt) as number,
      }))
      .sort((a, b) => a.dday - b.dday); // D-day 오름차순 (급한 것 먼저)
  }, [documents]);

  // KPI 계산
  const kpis = useMemo(() => {
    const expired = docsWithExpiry.filter((d) => d.dday < 0).length;
    const within7 = docsWithExpiry.filter((d) => d.dday >= 0 && d.dday <= 7).length;
    const within30 = docsWithExpiry.filter((d) => d.dday >= 0 && d.dday <= 30).length;
    return { expired, within7, within30 };
  }, [docsWithExpiry]);

  // 긴급 알림 (만료 또는 7일 이내)
  const criticalDocs = useMemo(
    () => docsWithExpiry.filter((d) => d.dday <= 7),
    [docsWithExpiry]
  );

  return (
    <div>
      {/* KPI 카드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <KpiCard
          label="만료 예정 (30일)"
          value={kpis.within30}
          color={C.yellow}
          icon={Clock}
        />
        <KpiCard
          label="만료 예정 (7일)"
          value={kpis.within7}
          color={C.orange}
          icon={AlertTriangle}
        />
        <KpiCard
          label="이미 만료"
          value={kpis.expired}
          color={C.red}
          icon={AlertTriangle}
        />
      </div>

      {/* 긴급 알림 섹션 */}
      {criticalDocs.length > 0 && (
        <div
          style={{
            background: C.red + '10',
            border: `1px solid ${C.red}40`,
            borderRadius: 10,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={18} color={C.red} />
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: C.red }}>
              긴급 만료 알림
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {criticalDocs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                }}
              >
                <span style={{ fontSize: 16 }}>{DOC_EMOJI[doc.docType]}</span>
                <span style={{ flex: 1, fontSize: 13, color: C.text }}>
                  {doc.title}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: doc.dday < 0 ? C.red : C.orange,
                  }}
                >
                  {formatDday(doc.dday)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 만료 타임라인 */}
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
        만료 타임라인
      </h3>
      {docsWithExpiry.length === 0 ? (
        <p style={{ color: C.textMuted, textAlign: 'center', padding: 32 }}>
          만료일이 설정된 문서가 없습니다.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docsWithExpiry.map((doc) => {
            const color = ddayColor(doc.dday);
            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${color}`,
                }}
              >
                {/* 타임라인 도트 */}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                  }}
                />

                {/* 문서 아이콘 */}
                <span style={{ fontSize: 20, flexShrink: 0 }}>
                  {DOC_EMOJI[doc.docType]}
                </span>

                {/* 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      margin: 0,
                      color: C.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.title}
                  </p>
                  <p style={{ fontSize: 12, color: C.textMuted, margin: '2px 0 0' }}>
                    {DOC_LABEL[doc.docType]} &middot; {doc.entityName}
                  </p>
                </div>

                {/* 만료일 */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>
                    {formatDday(doc.dday)}
                  </p>
                  <p style={{ fontSize: 11, color: C.textMuted, margin: '2px 0 0' }}>
                    {formatDate(doc.expiresAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** KPI 카드 컴포넌트 */
function KpiCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: typeof Clock;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: color + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color }}>{value}</p>
        <p style={{ fontSize: 12, color: C.textMuted, margin: '2px 0 0' }}>{label}</p>
      </div>
    </div>
  );
}
