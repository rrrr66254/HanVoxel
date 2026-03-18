/**
 * 생산 관리 API 클라이언트
 */

const API_BASE = '/api/v1';

// --- 타입 ---

export interface WorkCenter {
  id: string;
  siteId: string;
  code: string;
  name: string;
  type: 'MACHINE' | 'MANUAL' | 'ASSEMBLY' | 'QC';
  capacityPerDay: number;
  status: 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'BREAKDOWN';
  spatialObjectId: string | null;
  responsibleUser: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionOrder {
  id: string;
  siteId: string;
  orderNo: string;
  salesOrderId: string | null;
  productSku: string;
  productName: string | null;
  plannedQty: number;
  actualQty: number;
  defectQty: number;
  status: 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  workCenterId: string | null;
  workCenter?: WorkCenter;
  assignedWorkers: string[];
  notes: string | null;
  processes?: ProductionProcess[];
  materials?: ProductionMaterial[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductionProcess {
  id: string;
  productionOrderId: string;
  stepNo: number;
  processName: string;
  workCenterId: string | null;
  plannedDuration: number | null;
  actualDuration: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';
  workerId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
}

export interface ProductionLog {
  id: string;
  productionOrderId: string;
  processId: string | null;
  logType: 'START' | 'PROGRESS' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'DEFECT' | 'NOTE';
  qtyProduced: number | null;
  qtyDefect: number | null;
  defectReason: string | null;
  workerId: string | null;
  loggedAt: string;
  notes: string | null;
}

export interface ProductionMaterial {
  id: string;
  productionOrderId: string;
  materialSku: string;
  materialName: string | null;
  plannedQty: number;
  issuedQty: number;
  returnedQty: number;
  issuedAt: string | null;
  issuedBy: string | null;
}

export interface MaintenanceRecord {
  id: string;
  workCenterId: string;
  type: 'SCHEDULED' | 'BREAKDOWN' | 'PREVENTIVE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  scheduledAt: string | null;
  completedAt: string | null;
  downtimeMinutes: number;
  technician: string | null;
  cost: number | null;
  notes: string | null;
}

export interface ProductionKpi {
  date: string;
  workCenterId: string;
  plannedQty: number;
  actualQty: number;
  defectQty: number;
  achievementRate: number;
  defectRate: number;
  oeeScore: number;
  downtimeMinutes: number;
}

export interface GanttItem {
  id: string;
  orderNo: string;
  productName: string;
  workCenterId: string;
  workCenterName: string;
  status: string;
  priority: string;
  plannedStartAt: string;
  plannedEndAt: string;
  actualStartAt: string | null;
  actualEndAt: string | null;
  progress: number;
}

// --- API 함수 ---

// 작업장 (Work Center) API

export async function getWorkCenters(siteId: string): Promise<WorkCenter[]> {
  const params = new URLSearchParams({ siteId });
  const resp = await fetch(`${API_BASE}/production/work-centers?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function createWorkCenter(data: {
  siteId: string;
  code: string;
  name: string;
  type: 'MACHINE' | 'MANUAL' | 'ASSEMBLY' | 'QC';
  capacityPerDay: number;
  spatialObjectId?: string;
  responsibleUser?: string;
}): Promise<WorkCenter> {
  const resp = await fetch(`${API_BASE}/production/work-centers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function updateWorkCenterStatus(
  id: string,
  status: 'RUNNING' | 'IDLE' | 'MAINTENANCE' | 'BREAKDOWN',
): Promise<WorkCenter> {
  const resp = await fetch(`${API_BASE}/production/work-centers/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const json = await resp.json();
  return json.data;
}

// 생산 오더 (Production Order) API

export async function getProductionOrders(
  siteId: string,
  status?: string,
  page?: number,
  limit?: number,
): Promise<{ orders: ProductionOrder[]; total: number }> {
  const params = new URLSearchParams({ siteId });
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const resp = await fetch(`${API_BASE}/production/orders?${params}`);
  const json = await resp.json();
  return { orders: json.data ?? [], total: json.meta?.total ?? 0 };
}

export async function getProductionOrder(id: string): Promise<ProductionOrder> {
  const resp = await fetch(`${API_BASE}/production/orders/${id}`);
  const json = await resp.json();
  return json.data;
}

export async function createProductionOrder(data: {
  siteId: string;
  productSku: string;
  productName?: string;
  plannedQty: number;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  plannedStartAt?: string;
  plannedEndAt?: string;
  workCenterId?: string;
  assignedWorkers?: string[];
  notes?: string;
  processes?: Array<{
    stepNo: number;
    processName: string;
    workCenterId?: string;
    plannedDuration?: number;
  }>;
  materials?: Array<{
    materialSku: string;
    materialName?: string;
    plannedQty: number;
  }>;
}): Promise<ProductionOrder> {
  const resp = await fetch(`${API_BASE}/production/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function updateProductionOrderStatus(
  id: string,
  status: 'PLANNED' | 'RELEASED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED',
): Promise<ProductionOrder> {
  const resp = await fetch(`${API_BASE}/production/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const json = await resp.json();
  return json.data;
}

export async function autoCreateFromSalesOrder(salesOrderId: string): Promise<ProductionOrder> {
  const resp = await fetch(`${API_BASE}/production/orders/from-sales-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ salesOrderId }),
  });
  const json = await resp.json();
  return json.data;
}

// 생산 로그 (Production Log) API

export async function addProductionLog(
  orderId: string,
  data: {
    processId?: string;
    logType: 'START' | 'PROGRESS' | 'PAUSE' | 'RESUME' | 'COMPLETE' | 'DEFECT' | 'NOTE';
    qtyProduced?: number;
    qtyDefect?: number;
    defectReason?: string;
    workerId?: string;
    notes?: string;
  },
): Promise<ProductionLog> {
  const resp = await fetch(`${API_BASE}/production/orders/${orderId}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await resp.json();
  return json.data;
}

export async function getProductionLogs(orderId: string): Promise<ProductionLog[]> {
  const resp = await fetch(`${API_BASE}/production/orders/${orderId}/logs`);
  const json = await resp.json();
  return json.data ?? [];
}

// 자재 (Material) API

export async function getOrderMaterials(orderId: string): Promise<ProductionMaterial[]> {
  const resp = await fetch(`${API_BASE}/production/orders/${orderId}/materials`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function issueMaterials(orderId: string): Promise<void> {
  await fetch(`${API_BASE}/production/orders/${orderId}/materials/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function returnMaterials(
  orderId: string,
  items: Array<{ materialId: string; returnQty: number }>,
): Promise<void> {
  await fetch(`${API_BASE}/production/orders/${orderId}/materials/return`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
}

// 간트 차트 (Gantt) API

export async function getGanttData(
  siteId: string,
  startDate: string,
  endDate: string,
): Promise<GanttItem[]> {
  const params = new URLSearchParams({ siteId, startDate, endDate });
  const resp = await fetch(`${API_BASE}/production/gantt?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function rescheduleOrder(
  orderId: string,
  newStart: string,
  newEnd: string,
): Promise<void> {
  await fetch(`${API_BASE}/production/orders/${orderId}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plannedStartAt: newStart, plannedEndAt: newEnd }),
  });
}

// 설비 보전 (Maintenance) API

export async function getMaintenanceList(workCenterId?: string): Promise<MaintenanceRecord[]> {
  const params = new URLSearchParams();
  if (workCenterId) params.set('workCenterId', workCenterId);
  const resp = await fetch(`${API_BASE}/production/maintenance?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function reportBreakdown(
  workCenterId: string,
  notes: string,
): Promise<MaintenanceRecord> {
  const resp = await fetch(`${API_BASE}/production/maintenance/breakdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workCenterId, notes }),
  });
  const json = await resp.json();
  return json.data;
}

export async function completeMaintenance(
  id: string,
  downtimeMinutes: number,
): Promise<MaintenanceRecord> {
  const resp = await fetch(`${API_BASE}/production/maintenance/${id}/complete`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ downtimeMinutes }),
  });
  const json = await resp.json();
  return json.data;
}

// KPI / 분석 API

export async function getProductionKpis(
  siteId: string,
  startDate: string,
  endDate: string,
): Promise<ProductionKpi[]> {
  const params = new URLSearchParams({ siteId, startDate, endDate });
  const resp = await fetch(`${API_BASE}/production/kpis?${params}`);
  const json = await resp.json();
  return json.data ?? [];
}

export async function getOeeData(siteId: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ siteId });
  const resp = await fetch(`${API_BASE}/production/kpis/oee?${params}`);
  const json = await resp.json();
  return json.data;
}

export async function getDefectAnalysis(siteId: string): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ siteId });
  const resp = await fetch(`${API_BASE}/production/kpis/defect-analysis?${params}`);
  const json = await resp.json();
  return json.data;
}
