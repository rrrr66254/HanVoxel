import { useState, useEffect, useCallback } from 'react';
import type { AlertData } from '../../api/alert-api';
import { getAlerts, getUnreadAlertCount, markAlertRead, markAllAlertsRead } from '../../api/alert-api';
import { MOCK_SITE_ID } from '../../constants/mock-ids';

// 오프라인 목 데이터
const MOCK_ALERTS: AlertData[] = [
  {
    id: 'mock-1',
    siteId: MOCK_SITE_ID,
    metricType: 'inventory_level',
    severity: 'critical',
    title: '재고 수량 이상 탐지',
    message: '[긴급] 재고 수량 지표에서 48개 데이터 중 8건의 이상이 탐지되었습니다. (탐지 방법: ensemble)',
    anomalyCount: 8,
    isRead: false,
    resolvedAt: null,
    metadata: { mean: 342.5, std: 45.2 },
    detectedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'mock-2',
    siteId: MOCK_SITE_ID,
    metricType: 'picking_error_rate',
    severity: 'warning',
    title: '피킹 오류율 이상 탐지',
    message: '[경고] 피킹 오류율 지표에서 36개 데이터 중 3건의 이상이 탐지되었습니다. (탐지 방법: z_score)',
    anomalyCount: 3,
    isRead: false,
    resolvedAt: null,
    metadata: { mean: 2.1, std: 0.8 },
    detectedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'mock-3',
    siteId: MOCK_SITE_ID,
    metricType: 'order_volume',
    severity: 'info',
    title: '주문량 변동 감지',
    message: '[정보] 주문량 지표에서 24개 데이터 중 1건의 이상이 탐지되었습니다. (탐지 방법: iqr)',
    anomalyCount: 1,
    isRead: true,
    resolvedAt: null,
    metadata: { mean: 150, std: 22 },
    detectedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-50', border: 'border-red-400', icon: '🔴', badge: 'bg-red-500 text-white' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-400', icon: '🟡', badge: 'bg-yellow-500 text-white' },
  info: { bg: 'bg-blue-50', border: 'border-blue-300', icon: '🔵', badge: 'bg-blue-500 text-white' },
};

const METRIC_LABELS: Record<string, string> = {
  inventory_level: '재고 수량',
  picking_error_rate: '피킹 오류율',
  stock_movement: '입출고',
  order_volume: '주문량',
  cycle_time: '사이클 타임',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

interface AlertPanelProps {
  siteId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AlertPanel({ siteId = MOCK_SITE_ID, isOpen, onClose }: AlertPanelProps) {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { alerts: fetched } = await getAlerts(siteId, {
      severity: filter === 'all' ? undefined : filter,
      limit: 50,
    });
    // API에서 데이터가 없으면 목 데이터 사용
    if (fetched.length > 0) {
      setAlerts(fetched);
    } else {
      const filtered = filter === 'all' ? MOCK_ALERTS : MOCK_ALERTS.filter((a) => a.severity === filter);
      setAlerts(filtered);
    }
    setLoading(false);
  }, [siteId, filter]);

  const fetchUnreadCount = useCallback(async () => {
    const count = await getUnreadAlertCount(siteId);
    setUnreadCount(count || MOCK_ALERTS.filter((a) => !a.isRead).length);
  }, [siteId]);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
      fetchUnreadCount();
    }
  }, [isOpen, fetchAlerts, fetchUnreadCount]);

  const handleMarkRead = async (id: string) => {
    await markAlertRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAlertsRead(siteId);
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    setUnreadCount(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-800">이상 탐지 알림</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              모두 읽음
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-1 px-4 py-2 border-b bg-gray-50">
        {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === f ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {f === 'all' ? '전체' : f === 'critical' ? '긴급' : f === 'warning' ? '경고' : '정보'}
          </button>
        ))}
      </div>

      {/* 알림 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">로딩 중...</div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <span className="text-2xl mb-2">✓</span>
            <span>알림이 없습니다</span>
          </div>
        ) : (
          alerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity];
            return (
              <div
                key={alert.id}
                className={`px-4 py-3 border-b border-l-4 ${style.border} ${
                  alert.isRead ? 'bg-white opacity-70' : style.bg
                } cursor-pointer hover:opacity-90 transition-opacity`}
                onClick={() => !alert.isRead && handleMarkRead(alert.id)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">{style.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${style.badge}`}>
                        {alert.severity === 'critical' ? '긴급' : alert.severity === 'warning' ? '경고' : '정보'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {METRIC_LABELS[alert.metricType] ?? alert.metricType}
                      </span>
                      {!alert.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 ml-auto flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 mb-1">{alert.title}</p>
                    <p className="text-xs text-gray-600 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400">{timeAgo(alert.detectedAt)}</span>
                      <span className="text-xs text-gray-400">이상 {alert.anomalyCount}건</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
