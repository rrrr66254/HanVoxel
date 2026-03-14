/**
 * 더존 iCUBE / 영림원 K-System 연동 커넥터 (준비)
 *
 * Phase 3에서는 인터페이스 정의 + 매핑 로직만 구현하고,
 * 실제 API 연동은 고객사 환경 구축 후 활성화합니다.
 */

// ── 공통 인터페이스 ────────────────────────────────────

export interface ErpVoucherData {
  /** 전표 유형 (AP: 매입, AR: 매출) */
  type: 'AP' | 'AR';
  /** 거래처 코드 */
  partnerCode: string;
  /** 전표 일자 (YYYYMMDD) */
  date: string;
  /** 전표 항목 */
  lines: {
    itemCode: string;
    itemName: string;
    qty: number;
    unitPrice: number;
    amount: number;
    taxAmount: number;
  }[];
  /** 총액 */
  totalAmount: number;
  /** 참조 번호 */
  referenceNo?: string;
}

export interface ErpSyncResult {
  success: boolean;
  erpVoucherNo?: string;
  error?: string;
}

// ── 더존 iCUBE 커넥터 ──────────────────────────────────

export class DouzonConnector {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  /** HanVoxel 전표 → 더존 iCUBE 형식으로 변환 */
  mapToDouzon(data: ErpVoucherData) {
    return {
      SLIP_TYPE: data.type === 'AP' ? '21' : '11', // 더존 전표 유형 코드
      SLIP_DATE: data.date,
      CUST_CODE: data.partnerCode,
      TOT_AMT: data.totalAmount,
      REMARK: data.referenceNo ?? '',
      ITEMS: data.lines.map((line, idx) => ({
        SEQ: idx + 1,
        ITEM_CODE: line.itemCode,
        ITEM_NAME: line.itemName,
        QTY: line.qty,
        UNIT_PRICE: line.unitPrice,
        SUPPLY_AMT: line.amount,
        VAT_AMT: line.taxAmount,
      })),
    };
  }

  /** 전표 전송 (준비 — 실제 API 호출은 비활성화) */
  async sendVoucher(data: ErpVoucherData): Promise<ErpSyncResult> {
    const mapped = this.mapToDouzon(data);

    // TODO: 실제 더존 API 연동 시 활성화
    // const response = await fetch(`${this.baseUrl}/api/slip/create`, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify(mapped),
    // });

    console.log('[DouzonConnector] 전표 매핑 완료 (전송 대기):', JSON.stringify(mapped).slice(0, 200));

    return {
      success: true,
      erpVoucherNo: `DZ-${data.date}-PENDING`,
      error: undefined,
    };
  }
}

// ── 영림원 K-System 커넥터 ─────────────────────────────

export class YoungLimWonConnector {
  private baseUrl: string;
  private companyCode: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; companyCode: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.companyCode = config.companyCode;
    this.apiKey = config.apiKey;
  }

  /** HanVoxel 전표 → 영림원 K-System 형식으로 변환 */
  mapToYoungLimWon(data: ErpVoucherData) {
    return {
      compCd: this.companyCode,
      slipDiv: data.type === 'AP' ? 'P' : 'S',
      slipDate: data.date,
      custCd: data.partnerCode,
      totAmt: data.totalAmount,
      rmk: data.referenceNo ?? '',
      dtls: data.lines.map((line, idx) => ({
        seqNo: idx + 1,
        itemCd: line.itemCode,
        itemNm: line.itemName,
        qty: line.qty,
        unitPrc: line.unitPrice,
        supAmt: line.amount,
        vatAmt: line.taxAmount,
      })),
    };
  }

  /** 전표 전송 (준비 — 실제 API 호출은 비활성화) */
  async sendVoucher(data: ErpVoucherData): Promise<ErpSyncResult> {
    const mapped = this.mapToYoungLimWon(data);

    // TODO: 실제 영림원 API 연동 시 활성화
    // const response = await fetch(`${this.baseUrl}/api/v1/slip`, {
    //   method: 'POST',
    //   headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
    //   body: JSON.stringify(mapped),
    // });

    console.log('[YoungLimWonConnector] 전표 매핑 완료 (전송 대기):', JSON.stringify(mapped).slice(0, 200));

    return {
      success: true,
      erpVoucherNo: `YLW-${data.date}-PENDING`,
      error: undefined,
    };
  }
}

// ── 커넥터 팩토리 ──────────────────────────────────────

export type ErpType = 'douzon' | 'younglimwon';

export function getConnectorStatus(): { douzon: string; younglimwon: string } {
  return {
    douzon: process.env.DOUZON_API_URL ? 'configured' : 'not_configured',
    younglimwon: process.env.YOUNGLIMWON_API_URL ? 'configured' : 'not_configured',
  };
}

/** HanVoxel 전표를 외부 ERP 형식으로 변환 (프리뷰) */
export function previewErpMapping(data: ErpVoucherData, erpType: ErpType) {
  if (erpType === 'douzon') {
    const connector = new DouzonConnector({ baseUrl: '', apiKey: '' });
    return { erpType, mapped: connector.mapToDouzon(data) };
  }
  const connector = new YoungLimWonConnector({ baseUrl: '', companyCode: '', apiKey: '' });
  return { erpType, mapped: connector.mapToYoungLimWon(data) };
}
