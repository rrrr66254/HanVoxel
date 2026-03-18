/**
 * ERP 커넥터 관리 대시보드
 * - 다크 테마 UI (#0D1117 기반)
 * - 커넥터 설정/상태 모니터링 (ping, 활성/비활성 토글)
 * - 동기화 로그 + 오류 재시도
 * - 필드 매핑 커스터마이징 UI (화살표 연결)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plug,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  ArrowLeft,
  Loader2,
  Zap,
  Activity,
  Database,
  Hash,
  Percent,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  ConnectorConfig,
  SyncLog,
  SyncStats,
  FieldMapping,
  PingResult,
} from '../../api/connector-api';
import {
  getConnectors,
  upsertConnector,
  toggleConnector,
  pingConnector,
  getSyncLogs,
  getSyncStats,
  getFieldMappings,
  upsertFieldMapping,
  deleteFieldMapping,
  syncVoucher,
} from '../../api/connector-api';
import { MOCK_COMPANY_ID } from '../../constants/mock-ids';

// ── 디자인 토큰 ──────────────────────────────────────
const COLORS = {
  bg: '#0D1117',
  card: '#161B22',
  border: '#30363D',
  hoverRow: '#1C2128',
  connected: '#3FB950',
  disconnected: '#F85149',
  error: '#D29922',
  accent: '#58A6FF',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B949E',
  textMuted: '#484F58',
} as const;

interface Props {
  onBack: () => void;
}

type Tab = 'connectors' | 'logs' | 'mappings';

// 데모용 회사 ID
const DEMO_COMPANY_ID = MOCK_COMPANY_ID;

// ── 애니메이션 카운터 훅 ──────────────────────────────
function useAnimatedCounter(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    const diff = target - start;
    if (diff === 0) {
      setValue(target);
      return;
    }
    const startTime = performance.now();
    let rafId: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return value;
}

// ── 메인 대시보드 ─────────────────────────────────────
export function ConnectorDashboard({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('connectors');
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorConfig | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const [pingLoading, setPingLoading] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [logFilter, setLogFilter] = useState<{ status?: string; entityType?: string }>({});
  const [error, setError] = useState<string | null>(null);

  // 커넥터 목록 로드
  const loadConnectors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getConnectors(DEMO_COMPANY_ID);
      setConnectors(data);
      if (data.length > 0 && !selectedConnector) {
        setSelectedConnector(data[0]);
      }
    } catch {
      setError('커넥터 목록을 불러오지 못했습니다.');
      // 데모용 mock 데이터
      setConnectors(MOCK_CONNECTORS);
      if (!selectedConnector) setSelectedConnector(MOCK_CONNECTORS[0]);
    } finally {
      setLoading(false);
    }
  }, [selectedConnector]);

  // 로그/통계 로드
  const loadLogsAndStats = useCallback(async (connectorId: string) => {
    try {
      const [logsData, statsData] = await Promise.all([
        getSyncLogs(connectorId, { ...logFilter, limit: 50 }),
        getSyncStats(connectorId),
      ]);
      setLogs(logsData);
      setStats(statsData);
    } catch {
      setLogs(MOCK_LOGS);
      setStats(MOCK_STATS);
    }
  }, [logFilter]);

  // 필드 매핑 로드
  const loadMappings = useCallback(async (connectorId: string) => {
    try {
      const data = await getFieldMappings(connectorId);
      setMappings(data);
    } catch {
      setMappings(MOCK_MAPPINGS);
    }
  }, []);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  useEffect(() => {
    if (selectedConnector) {
      if (tab === 'logs') loadLogsAndStats(selectedConnector.id);
      if (tab === 'mappings') loadMappings(selectedConnector.id);
    }
  }, [selectedConnector, tab, loadLogsAndStats, loadMappings]);

  // 핑 실행 (로딩 애니메이션 포함)
  const handlePing = async (id: string) => {
    setPingLoading((prev) => ({ ...prev, [id]: true }));
    // 기존 결과 제거하여 애니메이션 트리거
    setPingResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    try {
      const result = await pingConnector(id);
      setPingResults((prev) => ({ ...prev, [id]: result }));
    } catch {
      setPingResults((prev) => ({
        ...prev,
        [id]: { ok: false, latencyMs: 0, status: 'ERROR' },
      }));
    } finally {
      setPingLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  // 활성/비활성 토글
  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const updated = await toggleConnector(id, !isActive);
      setConnectors((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (selectedConnector?.id === id) setSelectedConnector(updated);
    } catch {
      setError('토글에 실패했습니다.');
    }
  };

  // 재시도 (전표 동기화)
  const handleRetry = async (log: SyncLog) => {
    if (!selectedConnector) return;
    try {
      await syncVoucher(selectedConnector.id, log.entityId ?? '');
      loadLogsAndStats(selectedConnector.id);
    } catch {
      setError('재시도에 실패했습니다.');
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Plug }[] = [
    { key: 'connectors', label: '커넥터 설정', icon: Settings },
    { key: 'logs', label: '동기화 로그', icon: Activity },
    { key: 'mappings', label: '필드 매핑', icon: ArrowRight },
  ];

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: COLORS.bg, color: COLORS.textPrimary }}
    >
      {/* 헤더 */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-white/5"
            style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }}
          >
            <ArrowLeft size={14} />
            뒤로
          </button>
          <div className="flex items-center gap-2.5">
            <Plug size={20} style={{ color: COLORS.accent }} />
            <h1 className="text-xl font-bold">ERP 커넥터 관리</h1>
          </div>
          {selectedConnector && (
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: `${COLORS.accent}15`,
                color: COLORS.accent,
                border: `1px solid ${COLORS.accent}30`,
              }}
            >
              {selectedConnector.displayName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 커넥터 선택 드롭다운 */}
          {connectors.length > 0 && (
            <select
              value={selectedConnector?.id ?? ''}
              onChange={(e) => {
                const c = connectors.find((x) => x.id === e.target.value);
                if (c) setSelectedConnector(c);
              }}
              className="rounded-lg px-3 py-1.5 text-sm outline-none"
              style={{
                backgroundColor: COLORS.card,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.textSecondary,
              }}
            >
              {connectors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName} ({c.erpType})
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* 탭 */}
      <div
        className="flex gap-1 px-6"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        {tabs.map((t) => {
          const isActive = tab === t.key;
          const IconComp = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
              style={{
                color: isActive ? COLORS.accent : COLORS.textMuted,
                borderBottom: isActive ? `2px solid ${COLORS.accent}` : '2px solid transparent',
              }}
            >
              <IconComp size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div
          className="mx-6 mt-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
          style={{
            backgroundColor: `${COLORS.disconnected}15`,
            border: `1px solid ${COLORS.disconnected}40`,
            color: COLORS.disconnected,
          }}
        >
          <AlertCircle size={14} />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 transition-opacity hover:opacity-70"
          >
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin" style={{ color: COLORS.accent }} />
          </div>
        ) : (
          <>
            {tab === 'connectors' && (
              <ConnectorsTab
                connectors={connectors}
                selectedConnector={selectedConnector}
                pingResults={pingResults}
                pingLoading={pingLoading}
                onPing={handlePing}
                onToggle={handleToggle}
                onSelect={setSelectedConnector}
                showAddForm={showAddForm}
                setShowAddForm={setShowAddForm}
                onAdd={async (data) => {
                  try {
                    await upsertConnector(data);
                    setShowAddForm(false);
                    loadConnectors();
                  } catch {
                    setError('커넥터 추가에 실패했습니다.');
                  }
                }}
              />
            )}
            {tab === 'logs' && selectedConnector && (
              <LogsTab
                logs={logs}
                stats={stats}
                logFilter={logFilter}
                setLogFilter={setLogFilter}
                onRetry={handleRetry}
              />
            )}
            {tab === 'mappings' && selectedConnector && (
              <MappingsTab
                mappings={mappings}
                connectorId={selectedConnector.id}
                showForm={showMappingForm}
                setShowForm={setShowMappingForm}
                onSave={async (data) => {
                  try {
                    await upsertFieldMapping(selectedConnector.id, data);
                    setShowMappingForm(false);
                    loadMappings(selectedConnector.id);
                  } catch {
                    setError('매핑 저장에 실패했습니다.');
                  }
                }}
                onDelete={async (mappingId) => {
                  try {
                    await deleteFieldMapping(selectedConnector.id, mappingId);
                    loadMappings(selectedConnector.id);
                  } catch {
                    setError('매핑 삭제에 실패했습니다.');
                  }
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── 커넥터 상태 판별 ──────────────────────────────────
function getConnectorStatus(c: ConnectorConfig): 'connected' | 'disconnected' | 'error' {
  if (!c.isActive) return 'disconnected';
  if (c.lastPingStatus === 'OK') return 'connected';
  if (c.lastPingStatus && c.lastPingStatus !== 'OK') return 'error';
  return 'disconnected';
}

function getStatusColor(status: 'connected' | 'disconnected' | 'error'): string {
  switch (status) {
    case 'connected': return COLORS.connected;
    case 'disconnected': return COLORS.disconnected;
    case 'error': return COLORS.error;
  }
}

function getStatusLabel(status: 'connected' | 'disconnected' | 'error'): string {
  switch (status) {
    case 'connected': return '연결됨';
    case 'disconnected': return '연결 안됨';
    case 'error': return '오류';
  }
}

// ── 커넥터 설정 탭 ──────────────────────────────────

function ConnectorsTab({
  connectors,
  selectedConnector,
  pingResults,
  pingLoading,
  onPing,
  onToggle,
  onSelect,
  showAddForm,
  setShowAddForm,
  onAdd,
}: {
  connectors: ConnectorConfig[];
  selectedConnector: ConnectorConfig | null;
  pingResults: Record<string, PingResult>;
  pingLoading: Record<string, boolean>;
  onPing: (id: string) => void;
  onToggle: (id: string, isActive: boolean) => void;
  onSelect: (c: ConnectorConfig) => void;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  onAdd: (data: {
    companyId: string;
    erpType: string;
    displayName: string;
    baseUrl: string;
    authType: string;
    credentials: Record<string, string>;
  }) => void;
}) {
  return (
    <div className="space-y-6">
      {/* 상단 액션 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: COLORS.textPrimary }}>
          등록된 커넥터
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: showAddForm ? COLORS.card : COLORS.accent,
            color: showAddForm ? COLORS.textSecondary : '#ffffff',
            border: showAddForm ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          {showAddForm ? (
            <>
              <XCircle size={14} />
              취소
            </>
          ) : (
            <>
              <Plus size={14} />
              새 커넥터
            </>
          )}
        </button>
      </div>

      {/* 추가 폼 */}
      {showAddForm && <AddConnectorForm onSubmit={onAdd} />}

      {/* 커넥터 카드 목록 */}
      <div className="grid gap-4 md:grid-cols-2">
        {connectors.map((c) => {
          const ping = pingResults[c.id];
          const isPinging = pingLoading[c.id] ?? false;
          const isSelected = selectedConnector?.id === c.id;
          const status = getConnectorStatus(c);
          const statusColor = getStatusColor(status);

          return (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              className="cursor-pointer rounded-xl p-5 transition-all duration-200"
              style={{
                backgroundColor: COLORS.card,
                border: isSelected
                  ? `1px solid ${COLORS.accent}`
                  : `1px solid ${COLORS.border}`,
                boxShadow: isSelected ? `0 0 0 1px ${COLORS.accent}40` : 'none',
              }}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold"
                    style={{
                      backgroundColor: c.erpType === 'DOUZON'
                        ? '#1F6FEB20'
                        : `${COLORS.connected}20`,
                      color: c.erpType === 'DOUZON'
                        ? COLORS.accent
                        : COLORS.connected,
                    }}
                  >
                    {c.erpType === 'DOUZON' ? 'DZ' : 'YL'}
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: COLORS.textPrimary }}>
                      {c.displayName}
                    </h3>
                    <p className="text-xs" style={{ color: COLORS.textMuted }}>
                      {c.erpType === 'DOUZON' ? '더존 iCUBE' : '영림원 K-System'}
                    </p>
                  </div>
                </div>
                {/* 상태 표시 (컬러 닷 + 라벨) */}
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: statusColor }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: statusColor }}
                  >
                    {getStatusLabel(status)}
                  </span>
                </div>
              </div>

              {/* 상세 정보 */}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: COLORS.textMuted }}>Base URL</span>
                  <span style={{ color: COLORS.textSecondary }}>{c.baseUrl || '(미설정)'}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: COLORS.textMuted }}>인증 방식</span>
                  <span style={{ color: COLORS.textSecondary }}>{c.authType}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: COLORS.textMuted }}>마지막 핑</span>
                  <span style={{ color: c.lastPingStatus === 'OK' ? COLORS.connected : COLORS.textMuted }}>
                    {c.lastPingAt
                      ? `${c.lastPingStatus} (${new Date(c.lastPingAt).toLocaleString('ko-KR')})`
                      : '없음'}
                  </span>
                </div>
              </div>

              {/* 핑 결과 애니메이션 */}
              {isPinging && (
                <div
                  className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
                  style={{
                    backgroundColor: `${COLORS.accent}15`,
                    color: COLORS.accent,
                  }}
                >
                  <Loader2 size={12} className="animate-spin" />
                  연결 테스트 중...
                </div>
              )}
              {!isPinging && ping && (
                <div
                  className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-300"
                  style={{
                    backgroundColor: ping.ok
                      ? `${COLORS.connected}15`
                      : `${COLORS.disconnected}15`,
                    color: ping.ok ? COLORS.connected : COLORS.disconnected,
                  }}
                >
                  {ping.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {ping.ok
                    ? `연결 성공 (${ping.latencyMs}ms)`
                    : `연결 실패: ${ping.status}`}
                </div>
              )}

              {/* 액션 버튼 */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPing(c.id);
                  }}
                  disabled={isPinging}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs transition-colors hover:bg-white/5 disabled:opacity-50"
                  style={{
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.textSecondary,
                  }}
                >
                  <Zap size={12} />
                  연결 테스트
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(c.id, c.isActive);
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: c.isActive
                      ? `${COLORS.connected}15`
                      : `${COLORS.textMuted}20`,
                    color: c.isActive ? COLORS.connected : COLORS.textMuted,
                    border: `1px solid ${c.isActive ? `${COLORS.connected}30` : COLORS.border}`,
                  }}
                >
                  {c.isActive ? '활성' : '비활성'}
                </button>
              </div>
            </div>
          );
        })}

        {connectors.length === 0 && (
          <div
            className="col-span-2 flex flex-col items-center gap-3 rounded-xl py-16 text-center"
            style={{
              border: `2px dashed ${COLORS.border}`,
              color: COLORS.textMuted,
            }}
          >
            <Plug size={40} strokeWidth={1} />
            <p className="text-sm">등록된 커넥터가 없습니다.</p>
            <p className="text-xs">"새 커넥터" 버튼으로 추가하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 커넥터 추가 폼 ──────────────────────────────────

function AddConnectorForm({
  onSubmit,
}: {
  onSubmit: (data: {
    companyId: string;
    erpType: string;
    displayName: string;
    baseUrl: string;
    authType: string;
    credentials: Record<string, string>;
  }) => void;
}) {
  const [erpType, setErpType] = useState('DOUZON');
  const [displayName, setDisplayName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [authType, setAuthType] = useState('OAUTH2');
  const [credKey, setCredKey] = useState('');
  const [credSecret, setCredSecret] = useState('');

  const handleSubmit = () => {
    const credentials: Record<string, string> =
      authType === 'OAUTH2'
        ? { client_id: credKey, client_secret: credSecret }
        : { api_key: credKey };

    onSubmit({
      companyId: DEMO_COMPANY_ID,
      erpType,
      displayName: displayName || (erpType === 'DOUZON' ? '더존 iCUBE' : '영림원 K-System'),
      baseUrl,
      authType,
      credentials,
    });
  };

  const inputStyle = {
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textPrimary,
  };

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.accent}40`,
      }}
    >
      <div className="flex items-center gap-2">
        <Plus size={16} style={{ color: COLORS.accent }} />
        <h3 className="font-semibold" style={{ color: COLORS.accent }}>새 커넥터 등록</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
            ERP 타입
          </label>
          <select
            value={erpType}
            onChange={(e) => {
              setErpType(e.target.value);
              setAuthType(e.target.value === 'DOUZON' ? 'OAUTH2' : 'API_KEY');
            }}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="DOUZON">더존 iCUBE</option>
            <option value="YOUNGLIMWON">영림원 K-System</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
            표시 이름
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={erpType === 'DOUZON' ? '더존 iCUBE' : '영림원 K-System'}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-gray-600"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
            Base URL
          </label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={erpType === 'DOUZON' ? 'https://icube.example.com' : 'https://ksystem.example.com'}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-gray-600"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
            인증 방식
          </label>
          <select
            value={authType}
            onChange={(e) => setAuthType(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="OAUTH2">OAuth2</option>
            <option value="API_KEY">API Key</option>
            <option value="BASIC">Basic Auth</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
            {authType === 'OAUTH2' ? 'Client ID' : 'API Key'}
          </label>
          <input
            type="password"
            value={credKey}
            onChange={(e) => setCredKey(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        {authType === 'OAUTH2' && (
          <div>
            <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
              Client Secret
            </label>
            <input
              type="password"
              value={credSecret}
              onChange={(e) => setCredSecret(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </div>
        )}
      </div>
      <button
        onClick={handleSubmit}
        className="flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: COLORS.accent }}
      >
        <CheckCircle size={14} />
        등록
      </button>
    </div>
  );
}

// ── 동기화 로그 탭 ──────────────────────────────────

function LogsTab({
  logs,
  stats,
  logFilter,
  setLogFilter,
  onRetry,
}: {
  logs: SyncLog[];
  stats: SyncStats | null;
  logFilter: { status?: string; entityType?: string };
  setLogFilter: (f: { status?: string; entityType?: string }) => void;
  onRetry: (log: SyncLog) => void;
}) {
  const statusIcon = (s: string) => {
    switch (s) {
      case 'SUCCESS': return <CheckCircle size={14} style={{ color: COLORS.connected }} />;
      case 'FAILED': return <XCircle size={14} style={{ color: COLORS.disconnected }} />;
      case 'RETRYING': return <RefreshCw size={14} style={{ color: COLORS.error }} />;
      default: return <AlertCircle size={14} style={{ color: COLORS.textMuted }} />;
    }
  };

  const statusColor = (s: string): string => {
    switch (s) {
      case 'SUCCESS': return COLORS.connected;
      case 'FAILED': return COLORS.disconnected;
      case 'RETRYING': return COLORS.error;
      default: return COLORS.textMuted;
    }
  };

  const selectStyle = {
    backgroundColor: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textSecondary,
  };

  return (
    <div className="space-y-6">
      {/* KPI 통계 카드 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard
            label="전체 동기화"
            value={stats.total}
            topColor={COLORS.accent}
            icon={<Database size={18} style={{ color: COLORS.accent }} />}
          />
          <KpiCard
            label="성공"
            value={stats.success}
            topColor={COLORS.connected}
            icon={<CheckCircle size={18} style={{ color: COLORS.connected }} />}
          />
          <KpiCard
            label="실패"
            value={stats.failed}
            topColor={COLORS.disconnected}
            icon={<XCircle size={18} style={{ color: COLORS.disconnected }} />}
          />
          <KpiCard
            label="성공률"
            value={stats.successRate}
            suffix="%"
            topColor={
              stats.successRate >= 90
                ? COLORS.connected
                : stats.successRate >= 70
                  ? COLORS.error
                  : COLORS.disconnected
            }
            icon={<Percent size={18} style={{
              color: stats.successRate >= 90
                ? COLORS.connected
                : stats.successRate >= 70
                  ? COLORS.error
                  : COLORS.disconnected,
            }} />}
            isPercent
          />
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-3">
        <select
          value={logFilter.status ?? ''}
          onChange={(e) => setLogFilter({ ...logFilter, status: e.target.value || undefined })}
          className="rounded-lg px-3 py-1.5 text-sm outline-none"
          style={selectStyle}
        >
          <option value="">전체 상태</option>
          <option value="SUCCESS">성공</option>
          <option value="FAILED">실패</option>
          <option value="RETRYING">재시도 중</option>
          <option value="SKIPPED">건너뜀</option>
        </select>
        <select
          value={logFilter.entityType ?? ''}
          onChange={(e) => setLogFilter({ ...logFilter, entityType: e.target.value || undefined })}
          className="rounded-lg px-3 py-1.5 text-sm outline-none"
          style={selectStyle}
        >
          <option value="">전체 타입</option>
          <option value="VOUCHER">전표</option>
          <option value="PARTNER">거래처</option>
          <option value="INVENTORY">재고</option>
          <option value="RECEIPT">입금</option>
        </select>
      </div>

      {/* 로그 테이블 */}
      <div className="overflow-hidden rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: COLORS.card }}>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>상태</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>방향</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>엔티티</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>참조번호</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>에러</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>재시도</th>
              <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: COLORS.textMuted }}>시간</th>
              <th className="px-4 py-3 text-right text-xs font-medium" style={{ color: COLORS.textMuted }}>액션</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr
                key={log.id}
                className="transition-colors"
                style={{
                  backgroundColor: idx % 2 === 0 ? 'transparent' : `${COLORS.card}80`,
                  borderTop: `1px solid ${COLORS.border}40`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = COLORS.hoverRow;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : `${COLORS.card}80`;
                }}
              >
                {/* 상태 */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {statusIcon(log.status)}
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${statusColor(log.status)}15`,
                        color: statusColor(log.status),
                      }}
                    >
                      {log.status}
                    </span>
                  </div>
                </td>
                {/* 방향 */}
                <td className="px-4 py-3">
                  <span
                    className="rounded px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: log.direction === 'PUSH' ? '#1F6FEB20' : '#8957E520',
                      color: log.direction === 'PUSH' ? COLORS.accent : '#BC8CFF',
                    }}
                  >
                    {log.direction === 'PUSH' ? 'PUSH' : 'PULL'}
                  </span>
                </td>
                {/* 엔티티 */}
                <td className="px-4 py-3">
                  <span style={{ color: COLORS.textPrimary }}>{log.entityType}</span>
                  {log.entityId && (
                    <span className="ml-2 text-xs" style={{ color: COLORS.textMuted }}>
                      {log.entityId}
                    </span>
                  )}
                </td>
                {/* 참조번호 */}
                <td className="px-4 py-3 text-xs" style={{ color: COLORS.textSecondary }}>
                  {log.erpRefNo ? `ERP#${log.erpRefNo}` : '-'}
                </td>
                {/* 에러 메시지 */}
                <td className="max-w-[200px] truncate px-4 py-3 text-xs" style={{ color: COLORS.disconnected }}>
                  {log.errorMessage ?? '-'}
                </td>
                {/* 재시도 횟수 */}
                <td className="px-4 py-3 text-xs" style={{ color: log.retryCount > 0 ? COLORS.error : COLORS.textMuted }}>
                  {log.retryCount > 0 ? `${log.retryCount}회` : '-'}
                </td>
                {/* 시간 */}
                <td className="px-4 py-3 text-xs" style={{ color: COLORS.textMuted }}>
                  {new Date(log.syncedAt).toLocaleString('ko-KR')}
                </td>
                {/* 액션 */}
                <td className="px-4 py-3 text-right">
                  {log.status === 'FAILED' && (
                    <button
                      onClick={() => onRetry(log)}
                      className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition-colors hover:bg-white/5"
                      style={{
                        border: `1px solid ${COLORS.disconnected}40`,
                        color: COLORS.disconnected,
                      }}
                    >
                      <RefreshCw size={10} />
                      재시도
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && (
          <div
            className="flex flex-col items-center gap-3 py-16 text-center"
            style={{ color: COLORS.textMuted }}
          >
            <Activity size={40} strokeWidth={1} />
            <p className="text-sm">동기화 로그가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI 카드 (상단 3px 컬러 라인 + 아이콘 + 애니메이션 카운터) ──

function KpiCard({
  label,
  value,
  topColor,
  icon,
  suffix,
  isPercent,
}: {
  label: string;
  value: number;
  topColor: string;
  icon: React.ReactNode;
  suffix?: string;
  isPercent?: boolean;
}) {
  const animatedValue = useAnimatedCounter(isPercent ? Math.round(value * 10) : value);
  const displayValue = isPercent
    ? `${(animatedValue / 10).toFixed(1)}${suffix ?? ''}`
    : `${animatedValue}${suffix ?? ''}`;

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* 상단 3px 컬러 라인 */}
      <div
        className="absolute left-0 right-0 top-0 h-[3px]"
        style={{ backgroundColor: topColor }}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>{label}</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
            {displayValue}
          </p>
        </div>
        {icon}
      </div>
    </div>
  );
}

// ── 필드 매핑 탭 ────────────────────────────────────

function MappingsTab({
  mappings,
  connectorId,
  showForm,
  setShowForm,
  onSave,
  onDelete,
}: {
  mappings: FieldMapping[];
  connectorId: string;
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onSave: (data: {
    entityType: string;
    sourceField: string;
    targetField: string;
    transformType?: string;
    transformParam?: string;
    isRequired?: boolean;
  }) => void;
  onDelete: (mappingId: string) => void;
}) {
  const [editData, setEditData] = useState({
    entityType: 'VOUCHER',
    sourceField: '',
    targetField: '',
    transformType: 'DIRECT',
    transformParam: '',
    isRequired: false,
  });

  // 엔티티 타입별 그룹핑
  const grouped = mappings.reduce(
    (acc, m) => {
      if (!acc[m.entityType]) acc[m.entityType] = [];
      acc[m.entityType].push(m);
      return acc;
    },
    {} as Record<string, FieldMapping[]>,
  );

  const transformLabels: Record<string, string> = {
    DIRECT: '직접 매핑',
    CONSTANT: '고정값',
    FORMAT: '포맷 변환',
    LOOKUP: '코드 변환',
  };

  const transformColors: Record<string, string> = {
    DIRECT: COLORS.accent,
    CONSTANT: '#BC8CFF',
    FORMAT: COLORS.error,
    LOOKUP: COLORS.connected,
  };

  const inputStyle = {
    backgroundColor: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.textPrimary,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: COLORS.textPrimary }}>
          필드 매핑 규칙
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            backgroundColor: showForm ? COLORS.card : COLORS.accent,
            color: showForm ? COLORS.textSecondary : '#ffffff',
            border: showForm ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          {showForm ? (
            <>
              <XCircle size={14} />
              취소
            </>
          ) : (
            <>
              <Plus size={14} />
              매핑 추가
            </>
          )}
        </button>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.accent}40`,
          }}
        >
          <div className="flex items-center gap-2">
            <ArrowRight size={16} style={{ color: COLORS.accent }} />
            <h3 className="font-semibold" style={{ color: COLORS.accent }}>매핑 규칙 추가</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
                엔티티 타입
              </label>
              <select
                value={editData.entityType}
                onChange={(e) => setEditData({ ...editData, entityType: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="VOUCHER">전표</option>
                <option value="PARTNER">거래처</option>
                <option value="INVENTORY">재고</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
                원본 필드 (HanVoxel)
              </label>
              <input
                value={editData.sourceField}
                onChange={(e) => setEditData({ ...editData, sourceField: e.target.value })}
                placeholder="예: voucherDate"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-gray-600"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
                대상 필드 (ERP)
              </label>
              <input
                value={editData.targetField}
                onChange={(e) => setEditData({ ...editData, targetField: e.target.value })}
                placeholder="예: SLIP_DT"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-gray-600"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
                변환 타입
              </label>
              <select
                value={editData.transformType}
                onChange={(e) => setEditData({ ...editData, transformType: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="DIRECT">직접 매핑</option>
                <option value="CONSTANT">고정값</option>
                <option value="FORMAT">포맷 변환</option>
                <option value="LOOKUP">코드 변환</option>
              </select>
            </div>
            {editData.transformType !== 'DIRECT' && (
              <div>
                <label className="mb-1 block text-xs" style={{ color: COLORS.textMuted }}>
                  변환 파라미터
                </label>
                <input
                  value={editData.transformParam}
                  onChange={(e) => setEditData({ ...editData, transformParam: e.target.value })}
                  placeholder={
                    editData.transformType === 'CONSTANT'
                      ? '고정값 입력'
                      : editData.transformType === 'FORMAT'
                        ? '예: YYYYMMDD'
                        : '{"A":"001","B":"002"}'
                  }
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-gray-600"
                  style={inputStyle}
                />
              </div>
            )}
            <div className="flex items-end">
              <label
                className="flex items-center gap-2 text-sm"
                style={{ color: COLORS.textSecondary }}
              >
                <input
                  type="checkbox"
                  checked={editData.isRequired}
                  onChange={(e) => setEditData({ ...editData, isRequired: e.target.checked })}
                  className="rounded"
                  style={{ accentColor: COLORS.accent }}
                />
                필수 필드
              </label>
            </div>
          </div>
          <button
            onClick={() =>
              onSave({
                entityType: editData.entityType,
                sourceField: editData.sourceField,
                targetField: editData.targetField,
                transformType: editData.transformType,
                transformParam: editData.transformParam || undefined,
                isRequired: editData.isRequired,
              })
            }
            className="flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: COLORS.accent }}
          >
            <CheckCircle size={14} />
            저장
          </button>
        </div>
      )}

      {/* 매핑 목록 (엔티티 타입별 그룹 + 화살표 연결 UI) */}
      {Object.entries(grouped).map(([entityType, items]) => (
        <div key={entityType} className="space-y-3">
          <div className="flex items-center gap-2">
            <Hash size={14} style={{ color: COLORS.textMuted }} />
            <h3 className="text-sm font-medium" style={{ color: COLORS.textSecondary }}>
              {entityType}
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={{
                backgroundColor: `${COLORS.accent}15`,
                color: COLORS.accent,
              }}
            >
              {items.length}
            </span>
          </div>

          <div className="space-y-2">
            {items.map((m) => {
              const tColor = transformColors[m.transformType] ?? COLORS.textMuted;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl p-4 transition-colors"
                  style={{
                    backgroundColor: COLORS.card,
                    border: `1px solid ${COLORS.border}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${COLORS.border}80`;
                    e.currentTarget.style.backgroundColor = COLORS.hoverRow;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.border;
                    e.currentTarget.style.backgroundColor = COLORS.card;
                  }}
                >
                  {/* 원본 필드 박스 */}
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs"
                    style={{
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.accent}40`,
                      color: COLORS.accent,
                      minWidth: '140px',
                    }}
                  >
                    <Database size={12} />
                    {m.sourceField}
                  </div>

                  {/* 화살표 + 변환 타입 */}
                  <div className="flex items-center gap-2">
                    <span style={{ color: COLORS.textMuted, fontSize: '18px' }}>
                      →
                    </span>
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${tColor}15`,
                        color: tColor,
                      }}
                    >
                      {transformLabels[m.transformType] ?? m.transformType}
                    </span>
                    {m.transformParam && (
                      <span className="text-xs" style={{ color: COLORS.textMuted }}>
                        ({m.transformParam})
                      </span>
                    )}
                    <span style={{ color: COLORS.textMuted, fontSize: '18px' }}>
                      →
                    </span>
                  </div>

                  {/* 대상 필드 박스 */}
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs"
                    style={{
                      backgroundColor: COLORS.bg,
                      border: `1px solid ${COLORS.connected}40`,
                      color: COLORS.connected,
                      minWidth: '140px',
                    }}
                  >
                    <Plug size={12} />
                    {m.targetField}
                  </div>

                  {/* 필수 여부 */}
                  <div className="ml-auto flex items-center gap-3">
                    {m.isRequired ? (
                      <span
                        className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: `${COLORS.error}15`,
                          color: COLORS.error,
                        }}
                      >
                        <AlertCircle size={10} />
                        필수
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: COLORS.textMuted }}>
                        선택
                      </span>
                    )}

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => onDelete(m.id)}
                      className="rounded-lg p-1.5 transition-colors hover:bg-white/5"
                      style={{ color: COLORS.disconnected }}
                      title="매핑 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {mappings.length === 0 && !showForm && (
        <div
          className="flex flex-col items-center gap-3 rounded-xl py-16 text-center"
          style={{
            border: `2px dashed ${COLORS.border}`,
            color: COLORS.textMuted,
          }}
        >
          <ArrowRight size={40} strokeWidth={1} />
          <p className="text-sm">등록된 필드 매핑이 없습니다.</p>
          <p className="text-xs">기본 매핑은 커넥터 내장 규칙을 사용합니다.</p>
        </div>
      )}
    </div>
  );
}

// ── Mock 데이터 (API 실패 시 폴백) ──────────────────

const MOCK_CONNECTORS: ConnectorConfig[] = [
  {
    id: 'conn-1',
    companyId: DEMO_COMPANY_ID,
    erpType: 'DOUZON',
    displayName: '더존 iCUBE (테스트)',
    baseUrl: 'https://icube-demo.douzone.com',
    authType: 'OAUTH2',
    isActive: true,
    lastPingAt: new Date(Date.now() - 3600000).toISOString(),
    lastPingStatus: 'OK',
    createdAt: '2026-01-15T00:00:00Z',
    fieldMappings: [],
  },
  {
    id: 'conn-2',
    companyId: DEMO_COMPANY_ID,
    erpType: 'YOUNGLIMWON',
    displayName: '영림원 K-System (테스트)',
    baseUrl: 'https://ksystem-demo.younglimwon.com',
    authType: 'API_KEY',
    isActive: false,
    lastPingAt: null,
    lastPingStatus: null,
    createdAt: '2026-02-01T00:00:00Z',
    fieldMappings: [],
  },
];

const MOCK_LOGS: SyncLog[] = [
  {
    id: 'log-1',
    connectorId: 'conn-1',
    direction: 'PUSH',
    entityType: 'VOUCHER',
    entityId: 'voucher-001',
    erpRefNo: 'SLIP-20260315-001',
    status: 'SUCCESS',
    errorMessage: null,
    retryCount: 0,
    syncedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'log-2',
    connectorId: 'conn-1',
    direction: 'PUSH',
    entityType: 'PARTNER',
    entityId: 'partner-005',
    erpRefNo: null,
    status: 'SUCCESS',
    errorMessage: null,
    retryCount: 0,
    syncedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'log-3',
    connectorId: 'conn-1',
    direction: 'PUSH',
    entityType: 'VOUCHER',
    entityId: 'voucher-003',
    erpRefNo: null,
    status: 'FAILED',
    errorMessage: '더존 API 응답 타임아웃 (30s)',
    retryCount: 3,
    syncedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'log-4',
    connectorId: 'conn-1',
    direction: 'PULL',
    entityType: 'INVENTORY',
    entityId: null,
    erpRefNo: null,
    status: 'SUCCESS',
    errorMessage: null,
    retryCount: 0,
    syncedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const MOCK_STATS: SyncStats = {
  total: 156,
  success: 142,
  failed: 14,
  successRate: 91.03,
};

const MOCK_MAPPINGS: FieldMapping[] = [
  {
    id: 'map-1',
    connectorId: 'conn-1',
    entityType: 'VOUCHER',
    sourceField: 'voucherDate',
    targetField: 'SLIP_DT',
    transformType: 'FORMAT',
    transformParam: 'YYYYMMDD',
    isRequired: true,
  },
  {
    id: 'map-2',
    connectorId: 'conn-1',
    entityType: 'VOUCHER',
    sourceField: 'totalAmount',
    targetField: 'SUPPLY_AMT',
    transformType: 'DIRECT',
    transformParam: null,
    isRequired: true,
  },
  {
    id: 'map-3',
    connectorId: 'conn-1',
    entityType: 'PARTNER',
    sourceField: 'bizRegNo',
    targetField: 'BIZ_NO',
    transformType: 'FORMAT',
    transformParam: 'XXX-XX-XXXXX',
    isRequired: true,
  },
  {
    id: 'map-4',
    connectorId: 'conn-1',
    entityType: 'VOUCHER',
    sourceField: 'type',
    targetField: 'SLIP_TYPE',
    transformType: 'LOOKUP',
    transformParam: '{"PURCHASE":"21","SALES":"11"}',
    isRequired: true,
  },
];
