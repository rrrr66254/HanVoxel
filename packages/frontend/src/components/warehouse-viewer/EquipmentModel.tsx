import { useMemo } from 'react';
import * as THREE from 'three';

// ===== 공통 타입 =====
interface EquipmentProps {
  width: number;
  depth: number;
  height: number;
  isSelected?: boolean;
  isHovered?: boolean;
}

// 선택/호버 색상 오버라이드
function resolveColor(base: string, isSelected?: boolean, isHovered?: boolean): string {
  if (isSelected) return '#2D7DD2';
  if (isHovered) return '#6A7280';
  return base;
}

// ===== 1. 검수 작업대 (QC Inspection Table) =====
export function QCTableModel({ width, depth, height, isSelected, isHovered }: EquipmentProps) {
  const legH = height * 0.55;
  const topH = 0.04;
  const shelfH = 0.02;
  const legR = 0.025;

  const topMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#B0B8C0', isSelected, isHovered), metalness: 0.3, roughness: 0.6,
  }), [isSelected, isHovered]);

  const legMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#606870', isSelected, isHovered), metalness: 0.5, roughness: 0.4,
  }), [isSelected, isHovered]);

  const shelfMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#7A8290', isSelected, isHovered), metalness: 0.3, roughness: 0.5,
  }), [isSelected, isHovered]);

  // 조명 막대
  const lightMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#E8F0FF', emissive: '#88AAFF', emissiveIntensity: 0.3,
  }), []);

  const legGeo = useMemo(() => new THREE.CylinderGeometry(legR, legR, legH, 8), [legH, legR]);
  const inset = 0.05;

  return (
    <group>
      {/* 상판 — 스테인리스 작업 표면 */}
      <mesh position={[0, legH + topH / 2, 0]} material={topMat} castShadow>
        <boxGeometry args={[width, topH, depth]} />
      </mesh>

      {/* 4개 다리 */}
      {[
        [-width / 2 + inset, 0, -depth / 2 + inset],
        [width / 2 - inset, 0, -depth / 2 + inset],
        [-width / 2 + inset, 0, depth / 2 - inset],
        [width / 2 - inset, 0, depth / 2 - inset],
      ].map(([x, , z], i) => (
        <mesh key={i} position={[x, legH / 2, z]} geometry={legGeo} material={legMat} castShadow />
      ))}

      {/* 하단 선반 */}
      <mesh position={[0, legH * 0.15, 0]} material={shelfMat}>
        <boxGeometry args={[width - 0.1, shelfH, depth - 0.1]} />
      </mesh>

      {/* 검수 조명 막대 (상단) */}
      <mesh position={[0, legH + topH + 0.4, 0]} material={lightMat}>
        <boxGeometry args={[width * 0.7, 0.03, 0.05]} />
      </mesh>
      {/* 조명 지지대 */}
      <mesh position={[0, legH + topH + 0.2, -depth / 2 + 0.03]} material={legMat}>
        <boxGeometry args={[0.02, 0.4, 0.02]} />
      </mesh>
    </group>
  );
}

// ===== 2. 소화전 캐비닛 (Fire Hydrant Cabinet) =====
export function FireHydrantModel({ width, depth, height, isSelected, isHovered }: EquipmentProps) {
  const cabinetMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#CC2222', isSelected, isHovered), metalness: 0.3, roughness: 0.5,
  }), [isSelected, isHovered]);

  const doorMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#DD3333', isSelected, isHovered), metalness: 0.4, roughness: 0.4,
  }), [isSelected, isHovered]);

  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#88CCFF', transparent: true, opacity: 0.3, metalness: 0.1, roughness: 0.1,
  }), []);

  const handleMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#C0C0C0', metalness: 0.7, roughness: 0.3,
  }), []);

  return (
    <group>
      {/* 본체 캐비닛 */}
      <mesh position={[0, height / 2, 0]} material={cabinetMat} castShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>

      {/* 문 (전면) */}
      <mesh position={[0, height / 2, -depth / 2 - 0.005]} material={doorMat}>
        <boxGeometry args={[width * 0.88, height * 0.88, 0.01]} />
      </mesh>

      {/* 유리창 */}
      <mesh position={[0, height * 0.55, -depth / 2 - 0.01]} material={glassMat}>
        <boxGeometry args={[width * 0.5, height * 0.35, 0.005]} />
      </mesh>

      {/* 손잡이 */}
      <mesh position={[width * 0.35, height / 2, -depth / 2 - 0.015]} material={handleMat}>
        <boxGeometry args={[0.02, 0.08, 0.02]} />
      </mesh>

      {/* 호스 릴 (내부 — 측면에서 보이도록) */}
      <mesh position={[0, height * 0.45, 0]} rotation={[0, 0, Math.PI / 2]} material={handleMat}>
        <torusGeometry args={[width * 0.2, 0.015, 8, 16]} />
      </mesh>
    </group>
  );
}

// ===== 3. 소화기 (Fire Extinguisher) =====
export function FireExtinguisherModel({ width, depth, height, isSelected, isHovered }: EquipmentProps) {
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#CC2222', isSelected, isHovered), metalness: 0.4, roughness: 0.4,
  }), [isSelected, isHovered]);

  const headMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#333333', isSelected, isHovered), metalness: 0.5, roughness: 0.3,
  }), [isSelected, isHovered]);

  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#404040', metalness: 0.4, roughness: 0.5,
  }), []);

  const bodyR = Math.min(width, depth) * 0.35;
  const bodyH = height * 0.65;

  return (
    <group>
      {/* 거치대 스탠드 */}
      <mesh position={[0, 0.02, 0]} material={baseMat}>
        <cylinderGeometry args={[bodyR * 1.5, bodyR * 1.8, 0.04, 16]} />
      </mesh>

      {/* 본체 (원통) */}
      <mesh position={[0, 0.04 + bodyH / 2, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[bodyR, bodyR, bodyH, 16]} />
      </mesh>

      {/* 어깨 (둥근 캡) */}
      <mesh position={[0, 0.04 + bodyH, 0]} material={bodyMat}>
        <sphereGeometry args={[bodyR, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>

      {/* 헤드 밸브 */}
      <mesh position={[0, 0.04 + bodyH + bodyR * 0.3, 0]} material={headMat}>
        <cylinderGeometry args={[bodyR * 0.35, bodyR * 0.5, height * 0.15, 8]} />
      </mesh>

      {/* 레버 핸들 */}
      <mesh position={[bodyR * 0.3, 0.04 + bodyH + bodyR * 0.4, 0]} material={headMat}>
        <boxGeometry args={[bodyR * 0.8, 0.015, 0.02]} />
      </mesh>

      {/* 노즐 호스 */}
      <mesh position={[-bodyR * 0.3, 0.04 + bodyH * 0.7, 0]} material={headMat}>
        <cylinderGeometry args={[0.008, 0.008, bodyH * 0.5, 6]} />
      </mesh>
    </group>
  );
}

// ===== 4. 포장 작업대 (Packing Station) =====
export function PackingStationModel({ width, depth, height, isSelected, isHovered }: EquipmentProps) {
  const topMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#A08050', isSelected, isHovered), metalness: 0.2, roughness: 0.7,
  }), [isSelected, isHovered]);

  const legMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#505860', isSelected, isHovered), metalness: 0.5, roughness: 0.4,
  }), [isSelected, isHovered]);

  const shelfMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#606870', isSelected, isHovered), metalness: 0.3, roughness: 0.5,
  }), [isSelected, isHovered]);

  const rollMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#B89060', metalness: 0.2, roughness: 0.8,
  }), []);

  const legH = height * 0.55;
  const topH = 0.04;

  return (
    <group>
      {/* 작업 상판 */}
      <mesh position={[0, legH + topH / 2, 0]} material={topMat} castShadow>
        <boxGeometry args={[width, topH, depth]} />
      </mesh>

      {/* 4개 다리 (각파이프) */}
      {[
        [-width / 2 + 0.04, 0, -depth / 2 + 0.04],
        [width / 2 - 0.04, 0, -depth / 2 + 0.04],
        [-width / 2 + 0.04, 0, depth / 2 - 0.04],
        [width / 2 - 0.04, 0, depth / 2 - 0.04],
      ].map(([x, , z], i) => (
        <mesh key={i} position={[x, legH / 2, z]} material={legMat} castShadow>
          <boxGeometry args={[0.04, legH, 0.04]} />
        </mesh>
      ))}

      {/* 하단 선반 */}
      <mesh position={[0, legH * 0.12, 0]} material={shelfMat}>
        <boxGeometry args={[width - 0.08, 0.02, depth - 0.08]} />
      </mesh>

      {/* 테이프 롤 홀더 (상단) */}
      <mesh position={[width / 2 - 0.08, legH + topH + 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={legMat}>
        <cylinderGeometry args={[0.01, 0.01, 0.2, 8]} />
      </mesh>
      {/* 테이프 롤 */}
      <mesh position={[width / 2 - 0.08, legH + topH + 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={rollMat}>
        <torusGeometry args={[0.06, 0.025, 8, 16]} />
      </mesh>
    </group>
  );
}

// ===== 5. 충전 스테이션 (Forklift Charging Station) =====
export function ChargingStationModel({ width, depth, height, isSelected, isHovered }: EquipmentProps) {
  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#505860', isSelected, isHovered), metalness: 0.5, roughness: 0.4,
  }), [isSelected, isHovered]);

  const panelMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#3A4048', isSelected, isHovered), metalness: 0.4, roughness: 0.3,
  }), [isSelected, isHovered]);

  const ledMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#44CC44', emissive: '#22AA22', emissiveIntensity: 0.5,
  }), []);

  const warningMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFD700', metalness: 0.3, roughness: 0.5,
  }), []);

  return (
    <group>
      {/* 바닥 플랫폼 */}
      <mesh position={[0, 0.03, 0]} material={baseMat}>
        <boxGeometry args={[width, 0.06, depth]} />
      </mesh>

      {/* 충전기 본체 (뒷쪽 패널) */}
      <mesh position={[0, height * 0.4, depth / 2 - 0.08]} material={panelMat} castShadow>
        <boxGeometry args={[width * 0.6, height * 0.5, 0.15]} />
      </mesh>

      {/* LED 상태 표시등 3개 */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.08 + i * 0.08, height * 0.6, depth / 2 - 0.16]} material={ledMat}>
          <sphereGeometry args={[0.015, 8, 8]} />
        </mesh>
      ))}

      {/* 케이블 (바닥) */}
      <mesh position={[0, 0.08, 0]} material={baseMat}>
        <cylinderGeometry args={[0.02, 0.02, depth * 0.6, 8]} />
      </mesh>

      {/* 경고 볼라드 (좌우) */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * width / 2 * 0.9, height * 0.25, -depth / 2 + 0.1]} material={warningMat} castShadow>
            <cylinderGeometry args={[0.04, 0.05, height * 0.5, 8]} />
          </mesh>
          {/* 경고 줄무늬 */}
          <mesh position={[side * width / 2 * 0.9, height * 0.35, -depth / 2 + 0.1]} material={baseMat}>
            <cylinderGeometry args={[0.042, 0.042, 0.06, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ===== 6. 안전 가드레일 (Safety Guard Rail) =====
export function GuardRailModel({ width, depth, height, isSelected, isHovered }: EquipmentProps) {
  const railMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#DDC020', isSelected, isHovered), metalness: 0.4, roughness: 0.4,
  }), [isSelected, isHovered]);

  const postMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#CCAA10', isSelected, isHovered), metalness: 0.5, roughness: 0.3,
  }), [isSelected, isHovered]);

  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#606060', metalness: 0.5, roughness: 0.4,
  }), []);

  const railLen = Math.max(width, depth);
  const postCount = Math.max(2, Math.ceil(railLen / 1.5) + 1);

  return (
    <group>
      {/* 기둥들 */}
      {Array.from({ length: postCount }, (_, i) => {
        const t = i / (postCount - 1);
        const z = -railLen / 2 + t * railLen;
        return (
          <group key={i}>
            {/* 기둥 */}
            <mesh position={[0, height / 2, z]} material={postMat} castShadow>
              <boxGeometry args={[0.08, height, 0.08]} />
            </mesh>
            {/* 바닥 플레이트 */}
            <mesh position={[0, 0.01, z]} material={baseMat}>
              <boxGeometry args={[0.2, 0.02, 0.2]} />
            </mesh>
          </group>
        );
      })}

      {/* 상단 레일 */}
      <mesh position={[0, height * 0.85, 0]} material={railMat} castShadow>
        <boxGeometry args={[0.06, 0.06, railLen]} />
      </mesh>

      {/* 중간 레일 */}
      <mesh position={[0, height * 0.45, 0]} material={railMat} castShadow>
        <boxGeometry args={[0.06, 0.06, railLen]} />
      </mesh>
    </group>
  );
}

// ===== 7. 건물 기둥 (Building Column) =====
export function ColumnModel({ width, depth, height, isSelected, isHovered }: EquipmentProps) {
  const concreteMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#A0A0A0', isSelected, isHovered), metalness: 0.1, roughness: 0.8,
  }), [isSelected, isHovered]);

  const baseMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#888888', isSelected, isHovered), metalness: 0.2, roughness: 0.7,
  }), [isSelected, isHovered]);

  return (
    <group>
      {/* 기초 (하단 넓은 부분) */}
      <mesh position={[0, 0.05, 0]} material={baseMat} castShadow>
        <boxGeometry args={[width * 1.3, 0.1, depth * 1.3]} />
      </mesh>

      {/* 기둥 본체 */}
      <mesh position={[0, height / 2, 0]} material={concreteMat} castShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>

      {/* 상단 캡 */}
      <mesh position={[0, height - 0.03, 0]} material={baseMat}>
        <boxGeometry args={[width * 1.15, 0.06, depth * 1.15]} />
      </mesh>
    </group>
  );
}

// ===== 8. 분리수거함 세트 (Trash Bin Set) =====
export function TrashBinModel({ width, depth, height, isSelected, isHovered }: EquipmentProps) {
  // 3칸 분리수거함 — 파랑(일반), 초록(재활용), 빨강(위험)
  const binCount = 3;
  const gap = 0.02;
  const binW = (width - gap * (binCount + 1)) / binCount;
  const bodyH = height * 0.8;
  const lidH = height * 0.12;
  const baseH = 0.02;

  const colors: [string, string, string] = ['#2563EB', '#16A34A', '#DC2626'];
  const labels = ['일반', '재활용', '위험'];

  const frameMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#404040', isSelected, isHovered), metalness: 0.4, roughness: 0.5,
  }), [isSelected, isHovered]);

  return (
    <group>
      {/* 하단 프레임 */}
      <mesh position={[0, baseH / 2, 0]} material={frameMat}>
        <boxGeometry args={[width, baseH, depth]} />
      </mesh>

      {/* 3개 분리수거함 */}
      {colors.map((color, i) => {
        const x = -width / 2 + gap + binW / 2 + i * (binW + gap);
        const resolvedColor = resolveColor(color, isSelected, isHovered);
        return (
          <group key={i}>
            {/* 통 본체 */}
            <mesh position={[x, baseH + bodyH / 2, 0]} castShadow>
              <boxGeometry args={[binW, bodyH, depth - 0.02]} />
              <meshStandardMaterial color={resolvedColor} metalness={0.1} roughness={0.6} />
            </mesh>

            {/* 뚜껑 (살짝 넓게) */}
            <mesh position={[x, baseH + bodyH + lidH / 2, 0]}>
              <boxGeometry args={[binW + 0.01, lidH, depth - 0.01]} />
              <meshStandardMaterial
                color={resolvedColor}
                metalness={0.2}
                roughness={0.4}
              />
            </mesh>

            {/* 뚜껑 손잡이 */}
            <mesh position={[x, baseH + bodyH + lidH + 0.01, 0]} material={frameMat}>
              <boxGeometry args={[binW * 0.3, 0.02, 0.03]} />
            </mesh>

            {/* 전면 라벨 패널 */}
            <mesh position={[x, baseH + bodyH * 0.6, -depth / 2 + 0.005]}>
              <boxGeometry args={[binW * 0.7, bodyH * 0.25, 0.005]} />
              <meshStandardMaterial color="#FFFFFF" metalness={0.05} roughness={0.3} />
            </mesh>

            {/* 투입구 (어두운 슬롯) */}
            <mesh position={[x, baseH + bodyH + lidH * 0.3, -depth / 2 + 0.005]}>
              <boxGeometry args={[binW * 0.5, lidH * 0.4, 0.01]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ===== 9. 비상구 표시 (Emergency Exit Sign) =====
export function ExitSignModel({ width, depth, height, isSelected, isHovered }: EquipmentProps) {
  const signMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: resolveColor('#22AA44', isSelected, isHovered),
    emissive: '#117733', emissiveIntensity: 0.4,
    metalness: 0.1, roughness: 0.3,
  }), [isSelected, isHovered]);

  const bracketMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#606060', metalness: 0.5, roughness: 0.4,
  }), []);

  return (
    <group>
      {/* 벽 브라켓 */}
      <mesh position={[0, height * 0.5, depth / 2 - 0.01]} material={bracketMat}>
        <boxGeometry args={[0.03, height * 0.3, 0.02]} />
      </mesh>

      {/* 사인 본체 */}
      <mesh position={[0, height * 0.5, 0]} material={signMat} castShadow>
        <boxGeometry args={[width, height * 0.6, depth]} />
      </mesh>

      {/* 흰색 화살표 패널 */}
      <mesh position={[0, height * 0.5, -depth / 2 - 0.003]}>
        <boxGeometry args={[width * 0.8, height * 0.4, 0.003]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#CCFFCC" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}
