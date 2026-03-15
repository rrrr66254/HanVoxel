/**
 * ERP 커넥터 관리 대시보드
 * - 커넥터 설정/상태 모니터링 (ping, 활성/비활성 토글)
 * - 동기화 로그 + 오류 재시도
 * - 필드 매핑 커스터마이징 UI
 */
import { useState, useEffect, useCallback } from 'react';
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

interface Props {
  onBack: () => void;
}

type Tab = 'connectors' | 'logs' | 'mappings';

// 데모용 회사 ID
const DEMO_COMPANY_ID = 'demo-company-001';

export function ConnectorDashboard({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('connectors');
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorConfig | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
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
    } catch (e) {
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

  // 핑 실행
  const handlePing = async (id: string) => {
    try {
      const result = await pingConnector(id);
      setPingResults((prev) => ({ ...prev, [id]: result }));
    } catch {
      setPingResults((prev) => ({
        ...prev,
        [id]: { ok: false, latencyMs: 0, status: 'ERROR' },
      }));
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

  const tabs: { key: Tab; label: string; color: string }[] = [
    { key: 'connectors', label: '커넥터 설정', color: 'rose' },
    { key: 'logs', label: '동기화 로그', color: 'rose' },
    { key: 'mappings', label: '필드 매핑', color: 'rose' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            뒤로
          </button>
          <h1 className="text-xl font-bold">ERP 커넥터 관리</h1>
          {selectedConnector && (
            <span className="rounded-full bg-rose-900/30 px-3 py-1 text-xs text-rose-300">
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
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300"
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
      <div className="flex gap-1 border-b border-gray-800 px-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.key
                ? `border-b-2 border-${t.color}-500 text-${t.color}-400`
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mx-6 mt-4 rounded-lg border border-red-800 bg-red-900/20 px-4 py-2 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">
            닫기
          </button>
        </div>
      )}

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          </div>
        ) : (
          <>
            {tab === 'connectors' && (
              <ConnectorsTab
                connectors={connectors}
                selectedConnector={selectedConnector}
                pingResults={pingResults}
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

// ── 커넥터 설정 탭 ──────────────────────────────────

function ConnectorsTab({
  connectors,
  selectedConnector,
  pingResults,
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
        <h2 className="text-lg font-semibold">등록된 커넥터</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium hover:bg-rose-700"
        >
          {showAddForm ? '취소' : '+ 새 커넥터'}
        </button>
      </div>

      {/* 추가 폼 */}
      {showAddForm && <AddConnectorForm onSubmit={onAdd} />}

      {/* 커넥터 카드 목록 */}
      <div className="grid gap-4 md:grid-cols-2">
        {connectors.map((c) => {
          const ping = pingResults[c.id];
          const isSelected = selectedConnector?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              className={`cursor-pointer rounded-xl border p-5 transition-colors ${
                isSelected
                  ? 'border-rose-600 bg-rose-900/10'
                  : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
              }`}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold ${
                      c.erpType === 'DOUZON'
                        ? 'bg-blue-900/50 text-blue-300'
                        : 'bg-green-900/50 text-green-300'
                    }`}
                  >
                    {c.erpType === 'DOUZON' ? 'DZ' : 'YL'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{c.displayName}</h3>
                    <p className="text-xs text-gray-500">{c.erpType === 'DOUZON' ? '더존 iCUBE' : '영림원 K-System'}</p>
                  </div>
                </div>
                {/* 활성 토글 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(c.id, c.isActive);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    c.isActive
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  {c.isActive ? '활성' : '비활성'}
                </button>
              </div>

              {/* 상세 정보 */}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Base URL</span>
                  <span className="text-gray-300">{c.baseUrl || '(미설정)'}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>인증 방식</span>
                  <span className="text-gray-300">{c.authType}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>마지막 핑</span>
                  <span className={c.lastPingStatus === 'OK' ? 'text-emerald-400' : 'text-gray-500'}>
                    {c.lastPingAt
                      ? `${c.lastPingStatus} (${new Date(c.lastPingAt).toLocaleString('ko-KR')})`
                      : '없음'}
                  </span>
                </div>
              </div>

              {/* 핑 결과 */}
              {ping && (
                <div
                  className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                    ping.ok
                      ? 'bg-emerald-900/20 text-emerald-300'
                      : 'bg-red-900/20 text-red-300'
                  }`}
                >
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
                  className="flex-1 rounded-lg border border-gray-700 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  연결 테스트
                </button>
              </div>
            </div>
          );
        })}

        {connectors.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-gray-700 py-12 text-center text-gray-500">
            등록된 커넥터가 없습니다. "새 커넥터" 버튼으로 추가하세요.
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

  return (
    <div className="rounded-xl border border-rose-800/50 bg-rose-900/10 p-5 space-y-4">
      <h3 className="font-semibold text-rose-300">새 커넥터 등록</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-400">ERP 타입</label>
          <select
            value={erpType}
            onChange={(e) => {
              setErpType(e.target.value);
              setAuthType(e.target.value === 'DOUZON' ? 'OAUTH2' : 'API_KEY');
            }}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="DOUZON">더존 iCUBE</option>
            <option value="YOUNGLIMWON">영림원 K-System</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">표시 이름</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={erpType === 'DOUZON' ? '더존 iCUBE' : '영림원 K-System'}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Base URL</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={erpType === 'DOUZON' ? 'https://icube.example.com' : 'https://ksystem.example.com'}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">인증 방식</label>
          <select
            value={authType}
            onChange={(e) => setAuthType(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="OAUTH2">OAuth2</option>
            <option value="API_KEY">API Key</option>
            <option value="BASIC">Basic Auth</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">
            {authType === 'OAUTH2' ? 'Client ID' : 'API Key'}
          </label>
          <input
            type="password"
            value={credKey}
            onChange={(e) => setCredKey(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
        </div>
        {authType === 'OAUTH2' && (
          <div>
            <label className="mb-1 block text-xs text-gray-400">Client Secret</label>
            <input
              type="password"
              value={credSecret}
              onChange={(e) => setCredSecret(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
      <button
        onClick={handleSubmit}
        className="rounded-lg bg-rose-600 px-6 py-2 text-sm font-medium hover:bg-rose-700"
      >
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
  const statusColors: Record<string, string> = {
    SUCCESS: 'bg-emerald-900/30 text-emerald-400',
    FAILED: 'bg-red-900/30 text-red-400',
    RETRYING: 'bg-yellow-900/30 text-yellow-400',
    SKIPPED: 'bg-gray-800 text-gray-400',
  };

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="전체 동기화" value={stats.total} color="gray" />
          <StatCard label="성공" value={stats.success} color="emerald" />
          <StatCard label="실패" value={stats.failed} color="red" />
          <StatCard
            label="성공률"
            value={`${stats.successRate.toFixed(1)}%`}
            color={stats.successRate >= 90 ? 'emerald' : stats.successRate >= 70 ? 'yellow' : 'red'}
          />
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-3">
        <select
          value={logFilter.status ?? ''}
          onChange={(e) => setLogFilter({ ...logFilter, status: e.target.value || undefined })}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300"
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
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-300"
        >
          <option value="">전체 타입</option>
          <option value="VOUCHER">전표</option>
          <option value="PARTNER">거래처</option>
          <option value="INVENTORY">재고</option>
          <option value="RECEIPT">입금</option>
        </select>
      </div>

      {/* 로그 목록 */}
      <div className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {/* 방향 아이콘 */}
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${
                  log.direction === 'PUSH' ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'
                }`}
              >
                {log.direction === 'PUSH' ? 'PUSH' : 'PULL'}
              </span>
              {/* 상태 */}
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[log.status]}`}>
                {log.status}
              </span>
              {/* 정보 */}
              <div>
                <span className="text-sm text-gray-200">{log.entityType}</span>
                {log.entityId && <span className="ml-2 text-xs text-gray-500">{log.entityId}</span>}
                {log.erpRefNo && (
                  <span className="ml-2 text-xs text-gray-500">ERP#{log.erpRefNo}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* 에러 메시지 */}
              {log.errorMessage && (
                <span className="max-w-xs truncate text-xs text-red-400">{log.errorMessage}</span>
              )}
              {/* 재시도 횟수 */}
              {log.retryCount > 0 && (
                <span className="text-xs text-yellow-500">재시도 {log.retryCount}회</span>
              )}
              {/* 시간 */}
              <span className="text-xs text-gray-500">
                {new Date(log.syncedAt).toLocaleString('ko-KR')}
              </span>
              {/* 재시도 버튼 */}
              {log.status === 'FAILED' && (
                <button
                  onClick={() => onRetry(log)}
                  className="rounded-lg border border-red-800 px-2 py-1 text-xs text-red-400 hover:bg-red-900/20"
                >
                  재시도
                </button>
              )}
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-700 py-12 text-center text-gray-500">
            동기화 로그가 없습니다.
          </div>
        )}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">필드 매핑 규칙</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium hover:bg-rose-700"
        >
          {showForm ? '취소' : '+ 매핑 추가'}
        </button>
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <div className="rounded-xl border border-rose-800/50 bg-rose-900/10 p-5 space-y-4">
          <h3 className="font-semibold text-rose-300">매핑 규칙 추가</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">엔티티 타입</label>
              <select
                value={editData.entityType}
                onChange={(e) => setEditData({ ...editData, entityType: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="VOUCHER">전표</option>
                <option value="PARTNER">거래처</option>
                <option value="INVENTORY">재고</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">원본 필드 (HanVoxel)</label>
              <input
                value={editData.sourceField}
                onChange={(e) => setEditData({ ...editData, sourceField: e.target.value })}
                placeholder="예: voucherDate"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">대상 필드 (ERP)</label>
              <input
                value={editData.targetField}
                onChange={(e) => setEditData({ ...editData, targetField: e.target.value })}
                placeholder="예: SLIP_DT"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">변환 타입</label>
              <select
                value={editData.transformType}
                onChange={(e) => setEditData({ ...editData, transformType: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              >
                <option value="DIRECT">직접 매핑</option>
                <option value="CONSTANT">고정값</option>
                <option value="FORMAT">포맷 변환</option>
                <option value="LOOKUP">코드 변환</option>
              </select>
            </div>
            {editData.transformType !== 'DIRECT' && (
              <div>
                <label className="mb-1 block text-xs text-gray-400">변환 파라미터</label>
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
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={editData.isRequired}
                  onChange={(e) => setEditData({ ...editData, isRequired: e.target.checked })}
                  className="rounded border-gray-600"
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
            className="rounded-lg bg-rose-600 px-6 py-2 text-sm font-medium hover:bg-rose-700"
          >
            저장
          </button>
        </div>
      )}

      {/* 매핑 목록 (엔티티 타입별 그룹) */}
      {Object.entries(grouped).map(([entityType, items]) => (
        <div key={entityType} className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400">{entityType}</h3>
          <div className="overflow-hidden rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/50 text-gray-500">
                  <th className="px-4 py-2 text-left">원본 필드</th>
                  <th className="px-4 py-2 text-left">대상 필드</th>
                  <th className="px-4 py-2 text-left">변환</th>
                  <th className="px-4 py-2 text-left">파라미터</th>
                  <th className="px-4 py-2 text-center">필수</th>
                  <th className="px-4 py-2 text-right">삭제</th>
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id} className="border-b border-gray-800/50 hover:bg-gray-900/30">
                    <td className="px-4 py-2 font-mono text-xs text-gray-300">{m.sourceField}</td>
                    <td className="px-4 py-2 font-mono text-xs text-rose-300">{m.targetField}</td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                        {transformLabels[m.transformType] ?? m.transformType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{m.transformParam ?? '-'}</td>
                    <td className="px-4 py-2 text-center">
                      {m.isRequired ? (
                        <span className="text-emerald-400">Y</span>
                      ) : (
                        <span className="text-gray-600">N</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => onDelete(m.id)}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {mappings.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-gray-700 py-12 text-center text-gray-500">
          등록된 필드 매핑이 없습니다. 기본 매핑은 커넥터 내장 규칙을 사용합니다.
        </div>
      )}
    </div>
  );
}

// ── 통계 카드 컴포넌트 ──────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    gray: 'border-gray-800 bg-gray-900/50',
    emerald: 'border-emerald-800/50 bg-emerald-900/10',
    red: 'border-red-800/50 bg-red-900/10',
    yellow: 'border-yellow-800/50 bg-yellow-900/10',
  };
  const textMap: Record<string, string> = {
    gray: 'text-gray-200',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.gray}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${textMap[color] ?? textMap.gray}`}>{value}</p>
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
