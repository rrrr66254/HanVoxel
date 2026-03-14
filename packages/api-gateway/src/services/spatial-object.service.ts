import prisma from './prisma';
import { Prisma } from '@prisma/client';

interface CreateSpatialObjectInput {
  siteId: string;
  typeId: string;
  name: string;
  code: string;
  status?: string;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  color?: string | null;
  opacity?: number;
  visible?: boolean;
  meshType?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

// 공간 객체 생성
export async function createSpatialObject(data: CreateSpatialObjectInput) {
  return prisma.spatialObject.create({
    data: {
      siteId: data.siteId,
      typeId: data.typeId,
      name: data.name,
      code: data.code,
      status: data.status ?? 'ACTIVE',
      positionX: data.positionX ?? 0,
      positionY: data.positionY ?? 0,
      positionZ: data.positionZ ?? 0,
      rotationX: data.rotationX ?? 0,
      rotationY: data.rotationY ?? 0,
      rotationZ: data.rotationZ ?? 0,
      scaleX: data.scaleX ?? 1,
      scaleY: data.scaleY ?? 1,
      scaleZ: data.scaleZ ?? 1,
      color: data.color,
      opacity: data.opacity ?? 1.0,
      visible: data.visible ?? true,
      meshType: data.meshType,
      metadata: data.metadata ?? Prisma.DbNull,
    },
    include: { type: true },
  });
}

// 사이트별 공간 객체 목록 조회
export async function getObjectsBySite(siteId: string) {
  return prisma.spatialObject.findMany({
    where: { siteId, deletedAt: null },
    include: { type: true },
    orderBy: { createdAt: 'asc' },
  });
}

// 공간 객체 단건 조회
export async function getObjectById(id: string) {
  return prisma.spatialObject.findUnique({
    where: { id },
    include: { type: true },
  });
}

// 공간 객체 수정
export async function updateSpatialObject(id: string, data: Partial<CreateSpatialObjectInput>) {
  const updateData: Prisma.SpatialObjectUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.positionX !== undefined) updateData.positionX = data.positionX;
  if (data.positionY !== undefined) updateData.positionY = data.positionY;
  if (data.positionZ !== undefined) updateData.positionZ = data.positionZ;
  if (data.rotationX !== undefined) updateData.rotationX = data.rotationX;
  if (data.rotationY !== undefined) updateData.rotationY = data.rotationY;
  if (data.rotationZ !== undefined) updateData.rotationZ = data.rotationZ;
  if (data.scaleX !== undefined) updateData.scaleX = data.scaleX;
  if (data.scaleY !== undefined) updateData.scaleY = data.scaleY;
  if (data.scaleZ !== undefined) updateData.scaleZ = data.scaleZ;
  if (data.color !== undefined) updateData.color = data.color;
  if (data.opacity !== undefined) updateData.opacity = data.opacity;
  if (data.visible !== undefined) updateData.visible = data.visible;
  if (data.meshType !== undefined) updateData.meshType = data.meshType;
  if (data.metadata !== undefined) updateData.metadata = data.metadata ?? Prisma.DbNull;

  return prisma.spatialObject.update({
    where: { id },
    data: updateData,
    include: { type: true },
  });
}

// 공간 객체 소프트 삭제
export async function deleteSpatialObject(id: string) {
  return prisma.spatialObject.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}
