import type { SpatialObject } from '../types/spatial';

/**
 * AABB (Axis-Aligned Bounding Box) 충돌 감지
 * 두 직육면체가 겹치는지 확인
 */
interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/**
 * SpatialObject → AABB 변환
 * position은 객체 중심, scale은 전체 크기
 */
function objectToAABB(obj: SpatialObject): AABB {
  const halfW = obj.scaleX / 2;
  const halfH = obj.scaleY / 2;
  const halfD = obj.scaleZ / 2;
  return {
    minX: obj.positionX - halfW,
    maxX: obj.positionX + halfW,
    minY: obj.positionY - halfH,
    maxY: obj.positionY + halfH,
    minZ: obj.positionZ - halfD,
    maxZ: obj.positionZ + halfD,
  };
}

/**
 * 배치할 객체의 위치/크기로 AABB 생성
 */
function placementToAABB(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
): AABB {
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;
  return {
    minX: x - halfW,
    maxX: x + halfW,
    minY: y - halfH,
    maxY: y + halfH,
    minZ: z - halfD,
    maxZ: z + halfD,
  };
}

/**
 * 두 AABB가 겹치는지 확인
 * 약간의 여유(margin)를 두어 빈틈 없이 배치 가능하게 함
 */
function aabbOverlap(a: AABB, b: AABB, margin = 0.05): boolean {
  return (
    a.minX < b.maxX - margin &&
    a.maxX > b.minX + margin &&
    a.minY < b.maxY - margin &&
    a.maxY > b.minY + margin &&
    a.minZ < b.maxZ - margin &&
    a.maxZ > b.minZ + margin
  );
}

/**
 * 배치할 위치가 기존 객체들과 충돌하는지 확인
 * @returns true면 충돌 발생 (배치 불가)
 */
export function checkCollision(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  existingObjects: SpatialObject[],
): boolean {
  const newAABB = placementToAABB(x, y, z, width, height, depth);

  // 물리적 객체만 충돌 검사 (ZONE, SAFETY_ZONE, AISLE, BUILDING, FLOOR 제외)
  const physicalObjects = existingObjects.filter((obj) => {
    const typeName = obj.type.name;
    return !['ZONE', 'SAFETY_ZONE', 'AISLE', 'BUILDING', 'FLOOR'].includes(typeName);
  });

  for (const obj of physicalObjects) {
    const objAABB = objectToAABB(obj);
    if (aabbOverlap(newAABB, objAABB)) {
      return true; // 충돌
    }
  }
  return false; // 충돌 없음
}
