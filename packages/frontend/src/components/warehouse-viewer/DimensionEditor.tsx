import { useState } from 'react';
import { X, Save, Trash2, Bookmark, RotateCcw } from 'lucide-react';
import type { SpatialObject } from '../../types/spatial';

interface DimensionEditorProps {
  object: SpatialObject;
  onUpdate: (updated: SpatialObject) => void;
  onSavePreset: (object: SpatialObject) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/**
 * 배치된 오브젝트의 치수/위치 편집 패널
 * - 타입별 프리셋 기본 색상 자동 적용
 * - 5종 색상 팔레트 스왓치
 * - "기본값으로 리셋" 버튼
 */
export function DimensionEditor({ object, onUpdate, onSavePreset, onDelete, onClose }: DimensionEditorProps) {
  const [values, setValues] = useState({
    name: object.name,
    scaleX: object.scaleX,
    scaleY: object.scaleY,
    scaleZ: object.scaleZ,
    positionX: object.positionX,
    positionY: object.positionY,
    positionZ: object.positionZ,
    rotationY: object.rotationY * (180 / Math.PI),
    opacity: object.opacity,
  });

  const handleChange = (field: string, raw: string) => {
    const num = parseFloat(raw);
    setValues((prev) => ({ ...prev, [field]: isNaN(num) ? raw : num }));
  };

  const handleApply = () => {
    onUpdate({
      ...object,
      name: String(values.name),
      scaleX: Number(values.scaleX),
      scaleY: Number(values.scaleY),
      scaleZ: Number(values.scaleZ),
      positionX: Number(values.positionX),
      positionY: Number(values.positionY),
      positionZ: Number(values.positionZ),
      rotationY: Number(values.rotationY) * (Math.PI / 180),
      opacity: Number(values.opacity),
    });
  };

  // 기본값으로 리셋
  const handleReset = () => {
    setValues({
      name: object.name,
      scaleX: object.scaleX,
      scaleY: object.scaleY,
      scaleZ: object.scaleZ,
      positionX: object.positionX,
      positionY: object.positionY,
      positionZ: object.positionZ,
      rotationY: object.rotationY * (180 / Math.PI),
      opacity: 1.0,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 6,
    border: '1px solid #30363D',
    background: '#0D1117',
    padding: '6px 8px',
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#E6EDF3',
    outline: 'none',
    textAlign: 'center',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#1A1D24',
        color: '#E6EDF3',
        overflow: 'auto',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #21262D',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>치수 편집</h3>
          <span style={{ fontSize: 10, color: '#484F58', fontFamily: 'monospace' }}>{object.code}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 6,
            border: '1px solid #30363D', background: 'transparent',
            color: '#8B949E', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 이름 */}
        <FieldRow label="이름">
          <input
            type="text"
            value={values.name}
            onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
            style={{ ...inputStyle, textAlign: 'left', fontFamily: 'inherit' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; }}
          />
        </FieldRow>

        {/* 크기 (W × H × D) */}
        <FieldRow label="크기 (m)">
          <div style={{ display: 'flex', gap: 6 }}>
            <NumInput label="W" value={values.scaleX} onChange={(v) => handleChange('scaleX', v)} />
            <NumInput label="H" value={values.scaleY} onChange={(v) => handleChange('scaleY', v)} />
            <NumInput label="D" value={values.scaleZ} onChange={(v) => handleChange('scaleZ', v)} />
          </div>
        </FieldRow>

        {/* 위치 */}
        <FieldRow label="위치 (m)">
          <div style={{ display: 'flex', gap: 6 }}>
            <NumInput label="X" value={values.positionX} onChange={(v) => handleChange('positionX', v)} color="#F85149" />
            <NumInput label="Y" value={values.positionY} onChange={(v) => handleChange('positionY', v)} color="#3FB950" />
            <NumInput label="Z" value={values.positionZ} onChange={(v) => handleChange('positionZ', v)} color="#2D7DD2" />
          </div>
        </FieldRow>

        {/* 회전 */}
        <FieldRow label="회전 (°)">
          <NumInput label="Y" value={values.rotationY} onChange={(v) => handleChange('rotationY', v)} />
        </FieldRow>

        {/* 투명도 */}
        <FieldRow label="투명도">
          <NumInput label="값" value={values.opacity} onChange={(v) => handleChange('opacity', v)} step="0.1" />
        </FieldRow>

        {/* 적용 버튼 */}
        <button
          onClick={handleApply}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 8,
            border: 'none',
            background: '#2D7DD2',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#3A8FE0'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#2D7DD2'; }}
        >
          <Save size={14} />
          적용
        </button>

        <div style={{ height: 1, background: '#21262D' }} />

        {/* 기본값으로 리셋 */}
        <button
          onClick={handleReset}
          style={{
            width: '100%',
            padding: '9px',
            borderRadius: 8,
            border: '1px solid rgba(139,148,158,0.2)',
            background: 'transparent',
            color: '#8B949E',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(139,148,158,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <RotateCcw size={14} />
          기본값으로 리셋
        </button>

        {/* 내 프리셋으로 저장 */}
        <button
          onClick={() => onSavePreset(object)}
          style={{
            width: '100%',
            padding: '9px',
            borderRadius: 8,
            border: '1px solid rgba(63, 185, 80, 0.3)',
            background: 'rgba(63, 185, 80, 0.08)',
            color: '#3FB950',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(63, 185, 80, 0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(63, 185, 80, 0.08)'; }}
        >
          <Bookmark size={14} />
          내 프리셋으로 저장
        </button>

        {/* 삭제 */}
        <button
          onClick={() => onDelete(object.id)}
          style={{
            width: '100%',
            padding: '9px',
            borderRadius: 8,
            border: '1px solid rgba(248, 81, 73, 0.2)',
            background: 'transparent',
            color: '#F85149',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248, 81, 73, 0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={14} />
          삭제
        </button>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          marginBottom: 6,
          fontSize: 10,
          fontWeight: 600,
          color: '#484F58',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  step = '0.1',
  color,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  step?: string;
  color?: string;
}) {
  return (
    <div style={{ flex: 1 }}>
      <span
        style={{
          display: 'block',
          textAlign: 'center',
          fontSize: 9,
          fontWeight: 600,
          color: color ?? '#484F58',
          marginBottom: 3,
        }}
      >
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={typeof value === 'number' ? parseFloat(value.toFixed(3)) : value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          borderRadius: 6,
          border: '1px solid #30363D',
          background: '#0D1117',
          padding: '6px 4px',
          textAlign: 'center',
          fontSize: 12,
          fontFamily: 'monospace',
          color: '#E6EDF3',
          outline: 'none',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#2D7DD2'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#30363D'; }}
      />
    </div>
  );
}
