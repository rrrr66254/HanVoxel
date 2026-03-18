import prisma from './prisma';
import { Prisma } from '@prisma/client';

// ── 문서 번호 생성 ────────────────────────────────────────

/**
 * 문서 번호 자동 생성 (형식: DOC-YYYYMMDD-XXXX)
 * 당일 생성된 마지막 문서 번호의 시퀀스를 +1
 */
export async function generateDocNo(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `DOC-${dateStr}-`;

  // 오늘 날짜로 시작하는 마지막 문서 번호 조회
  const lastDoc = await prisma.document.findFirst({
    where: { docNo: { startsWith: prefix } },
    orderBy: { docNo: 'desc' },
    select: { docNo: true },
  });

  let seq = 1;
  if (lastDoc) {
    const lastSeq = parseInt(lastDoc.docNo.slice(-4), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── 문서 생성 ─────────────────────────────────────────────

interface CreateDocumentInput {
  siteId: string;
  companyId: string;
  docNo?: string;
  docType: string; // INVOICE | PACKING_LIST | COA | MSDS | DRAWING | MANUAL | CONTRACT | OTHER
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  relatedType?: string; // LOT | ORDER | PRODUCT | SUPPLIER | CUSTOMER
  relatedId?: string;
  tags?: string[];
  expiryDate?: string;
  status?: string; // ACTIVE | ARCHIVED
  uploadedBy?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createDocument(data: CreateDocumentInput) {
  const docNo = data.docNo ?? await generateDocNo();

  // 문서 생성과 초기 버전을 트랜잭션으로 처리
  return prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        siteId: data.siteId,
        companyId: data.companyId,
        docNo,
        docType: data.docType,
        title: data.title,
        description: data.description,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        relatedType: data.relatedType,
        relatedId: data.relatedId,
        tags: data.tags ?? [],
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
        status: data.status ?? 'ACTIVE',
        currentVersion: 1,
        uploadedBy: data.uploadedBy,
        metadata: data.metadata ?? Prisma.DbNull,
      },
    });

    // 초기 버전 (v1) 생성
    await tx.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: data.uploadedBy,
        changeNote: '초기 업로드',
      },
    });

    return document;
  });
}

// ── 문서 조회 ─────────────────────────────────────────────

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      versions: { orderBy: { version: 'desc' }, take: 5 },
      shares: { where: { isActive: true } },
    },
  });
}

// ── 문서 목록 조회 ────────────────────────────────────────

interface ListDocumentsFilter {
  siteId: string;
  docType?: string;
  relatedType?: string;
  relatedId?: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export async function listDocuments(siteId: string, filters: ListDocumentsFilter) {
  const where: Prisma.DocumentWhereInput = { siteId, status: filters.status ?? 'ACTIVE' };

  if (filters.docType) where.docType = filters.docType;
  if (filters.relatedType) where.relatedType = filters.relatedType;
  if (filters.relatedId) where.relatedId = filters.relatedId;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { docNo: { contains: filters.search, mode: 'insensitive' } },
      { fileName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    }),
    prisma.document.count({ where }),
  ]);

  return { documents, total };
}

// ── 문서 수정 (버전 관리) ─────────────────────────────────

interface UpdateDocumentInput {
  title?: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  tags?: string[];
  expiryDate?: string;
  changeNote?: string;
  uploadedBy?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function updateDocument(id: string, data: UpdateDocumentInput) {
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return null;

  // 파일 URL이 변경된 경우 새 버전 생성
  const isFileChanged = data.fileUrl && data.fileUrl !== existing.fileUrl;

  return prisma.$transaction(async (tx) => {
    const updateData: Prisma.DocumentUpdateInput = {};
    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.tags) updateData.tags = data.tags;
    if (data.expiryDate) updateData.expiryDate = new Date(data.expiryDate);
    if (data.metadata) updateData.metadata = data.metadata;

    if (isFileChanged) {
      // 파일 변경 시 버전 번호 증가
      const newVersion = existing.currentVersion + 1;
      updateData.fileUrl = data.fileUrl;
      updateData.fileName = data.fileName ?? existing.fileName;
      updateData.fileSize = data.fileSize;
      updateData.mimeType = data.mimeType;
      updateData.currentVersion = newVersion;

      // 새 버전 레코드 생성
      await tx.documentVersion.create({
        data: {
          documentId: id,
          version: newVersion,
          fileUrl: data.fileUrl!,
          fileName: data.fileName ?? existing.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          uploadedBy: data.uploadedBy,
          changeNote: data.changeNote ?? `버전 ${newVersion} 업로드`,
        },
      });
    }

    return tx.document.update({
      where: { id },
      data: updateData,
    });
  });
}

// ── 문서 보관 처리 (소프트 삭제) ──────────────────────────

export async function archiveDocument(id: string) {
  return prisma.document.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });
}

// ── 문서 버전 이력 조회 ───────────────────────────────────

export async function getDocumentVersions(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    orderBy: { version: 'desc' },
  });
}

// ── 문서 공유 생성 ────────────────────────────────────────

interface CreateShareInput {
  sharedWith: string; // 공유 대상 (userId 또는 이메일)
  sharedBy: string;
  permission: string; // VIEW | DOWNLOAD | EDIT
  expiresAt?: string;
  note?: string;
}

export async function createShare(documentId: string, data: CreateShareInput) {
  return prisma.documentShare.create({
    data: {
      documentId,
      sharedWith: data.sharedWith,
      sharedBy: data.sharedBy,
      permission: data.permission,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      note: data.note,
      isActive: true,
    },
  });
}

// ── 만료 예정 문서 조회 ───────────────────────────────────

export async function getExpiringDocuments(siteId: string, days = 30) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);

  return prisma.document.findMany({
    where: {
      siteId,
      status: 'ACTIVE',
      expiryDate: {
        not: null,
        lte: deadline,
        gte: new Date(), // 아직 만료되지 않은 문서만
      },
    },
    orderBy: { expiryDate: 'asc' },
  });
}

// ── 관련 엔티티별 문서 조회 ───────────────────────────────

export async function getRelatedDocuments(relatedType: string, relatedId: string) {
  return prisma.document.findMany({
    where: {
      relatedType,
      relatedId,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
  });
}
