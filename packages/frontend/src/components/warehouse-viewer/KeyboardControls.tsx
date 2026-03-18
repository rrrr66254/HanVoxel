import { useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface KeyboardControlsProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  enabled?: boolean;
}

/**
 * 3D 뷰어 키보드 조작
 * - WASD: 카메라 앞뒤좌우 이동
 * - Q/E: 카메라 상하 이동
 * - Shift: 이동 속도 3배
 * - R: 카메라 리셋 (초기 위치)
 * - 화살표 키: 카메라 회전
 */
export function KeyboardControlsHandler({ controlsRef, enabled = true }: KeyboardControlsProps) {
  const { camera } = useThree();
  const moveSpeed = useRef(0.3);
  // 키 상태 추적 (useRef로 컴포넌트 라이프사이클에 바인딩)
  const keysPressedRef = useRef(new Set<string>());

  useEffect(() => {
    const keys = keysPressedRef.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드 내에서는 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keys.add(e.key.toLowerCase());
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };

    // 브라우저 탭 전환/포커스 아웃 시 모든 키 해제
    const handleBlur = () => {
      keys.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      keys.clear();
    };
  }, []);

  useFrame(() => {
    if (!enabled || !controlsRef.current) return;

    const controls = controlsRef.current;
    const keysPressed = keysPressedRef.current;
    const speed = keysPressed.has('shift') ? moveSpeed.current * 3 : moveSpeed.current;

    // 카메라 방향 벡터
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moved = false;

    // WASD 이동
    if (keysPressed.has('w')) {
      camera.position.addScaledVector(forward, speed);
      controls.target.addScaledVector(forward, speed);
      moved = true;
    }
    if (keysPressed.has('s')) {
      camera.position.addScaledVector(forward, -speed);
      controls.target.addScaledVector(forward, -speed);
      moved = true;
    }
    if (keysPressed.has('a')) {
      camera.position.addScaledVector(right, -speed);
      controls.target.addScaledVector(right, -speed);
      moved = true;
    }
    if (keysPressed.has('d')) {
      camera.position.addScaledVector(right, speed);
      controls.target.addScaledVector(right, speed);
      moved = true;
    }

    // Q/E 상하 이동
    if (keysPressed.has('q')) {
      camera.position.y -= speed;
      controls.target.y -= speed;
      moved = true;
    }
    if (keysPressed.has('e')) {
      camera.position.y += speed;
      controls.target.y += speed;
      moved = true;
    }

    // R: 카메라 리셋
    if (keysPressed.has('r')) {
      camera.position.set(30, 20, 35);
      controls.target.set(15, 0, 20);
      keysPressed.delete('r');
      moved = true;
    }

    // 화살표 키: 카메라 회전
    const rotSpeed = keysPressed.has('shift') ? 0.03 : 0.01;
    if (keysPressed.has('arrowleft')) {
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotSpeed);
      camera.position.copy(controls.target).add(offset);
      moved = true;
    }
    if (keysPressed.has('arrowright')) {
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotSpeed);
      camera.position.copy(controls.target).add(offset);
      moved = true;
    }
    if (keysPressed.has('arrowup')) {
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
      const axis = new THREE.Vector3().crossVectors(offset, new THREE.Vector3(0, 1, 0)).normalize();
      offset.applyAxisAngle(axis, rotSpeed);
      camera.position.copy(controls.target).add(offset);
      moved = true;
    }
    if (keysPressed.has('arrowdown')) {
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
      const axis = new THREE.Vector3().crossVectors(offset, new THREE.Vector3(0, 1, 0)).normalize();
      offset.applyAxisAngle(axis, -rotSpeed);
      camera.position.copy(controls.target).add(offset);
      moved = true;
    }

    if (moved) {
      controls.update();
    }
  });

  return null;
}

interface KeyboardHintProps {
  visible: boolean;
  onToggle: () => void;
}

/**
 * 키보드 단축키 힌트 오버레이
 */
export function KeyboardHint({ visible, onToggle }: KeyboardHintProps) {
  const handleKeyToggle = useCallback((e: KeyboardEvent) => {
    if (e.key === '?' || e.key === '/') {
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        onToggle();
      }
    }
  }, [onToggle]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyToggle);
    return () => window.removeEventListener('keydown', handleKeyToggle);
  }, [handleKeyToggle]);

  return (
    <>
      {/* 토글 버튼 */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          bottom: 56,
          left: 16,
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid var(--border-default)',
          background: visible ? 'var(--bg-hover)' : 'var(--bg-secondary)',
          color: visible ? 'var(--accent-blue)' : 'var(--text-icon)',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.15s ease',
        }}
      >
        <span style={{ fontSize: 13 }}>⌨</span>
        단축키
      </button>

      {/* 힌트 패널 */}
      {visible && (
        <div
          style={{
            position: 'absolute',
            bottom: 92,
            left: 16,
            background: 'rgba(13,17,23,0.92)',
            border: '1px solid var(--border-default)',
            borderRadius: 12,
            padding: '16px 20px',
            zIndex: 25,
            minWidth: 220,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            키보드 단축키
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['W A S D', '카메라 이동'],
              ['Q / E', '카메라 상하'],
              ['Shift', '이동 속도 3배'],
              ['← → ↑ ↓', '카메라 회전'],
              ['R', '카메라 리셋'],
              ['?', '단축키 표시/숨김'],
            ].map(([keys, desc]) => (
              <div key={keys} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    display: 'inline-block',
                    minWidth: 72,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-default)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                  }}
                >
                  {keys}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
