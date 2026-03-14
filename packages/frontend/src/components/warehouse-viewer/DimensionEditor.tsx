import { useState } from 'react';
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
    color: object.color ?? '#f59e0b',
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
      color: String(values.color),
      opacity: Number(values.opacity),
    });
  };

  return (
    <div className="absolute top-4 right-4 w-72 rounded-lg border border-blue-600/50 bg-gray-900/95 text-white shadow-xl backdrop-blur">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold">치수 편집</h3>
          <span className="text-[10px] text-gray-500">{object.code}</span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="닫기">
          ✕
        </button>
      </div>

      <div className="space-y-3 p-4">
        {/* 이름 */}
        <FieldRow label="이름">
          <input
            type="text"
            value={values.name}
            onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white outline-none focus:border-blue-500"
          />
        </FieldRow>

        {/* 크기 (W × H × D) */}
        <FieldRow label="크기 (m)">
          <div className="flex gap-1">
            <NumInput label="W" value={values.scaleX} onChange={(v) => handleChange('scaleX', v)} />
            <NumInput label="H" value={values.scaleY} onChange={(v) => handleChange('scaleY', v)} />
            <NumInput label="D" value={values.scaleZ} onChange={(v) => handleChange('scaleZ', v)} />
          </div>
        </FieldRow>

        {/* 위치 */}
        <FieldRow label="위치 (m)">
          <div className="flex gap-1">
            <NumInput label="X" value={values.positionX} onChange={(v) => handleChange('positionX', v)} />
            <NumInput label="Y" value={values.positionY} onChange={(v) => handleChange('positionY', v)} />
            <NumInput label="Z" value={values.positionZ} onChange={(v) => handleChange('positionZ', v)} />
          </div>
        </FieldRow>

        {/* 회전 */}
        <FieldRow label="회전 (°)">
          <NumInput label="Y" value={values.rotationY} onChange={(v) => handleChange('rotationY', v)} />
        </FieldRow>

        {/* 색상 + 투명도 */}
        <FieldRow label="색상">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={values.color}
              onChange={(e) => setValues((prev) => ({ ...prev, color: e.target.value }))}
              className="h-6 w-8 cursor-pointer rounded border border-gray-600 bg-transparent"
            />
            <NumInput label="투명도" value={values.opacity} onChange={(v) => handleChange('opacity', v)} step="0.1" />
          </div>
        </FieldRow>

        {/* 적용 버튼 */}
        <button
          onClick={handleApply}
          className="w-full rounded bg-blue-600 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
        >
          적용
        </button>

        {/* 구분선 */}
        <div className="border-t border-gray-700" />

        {/* 내 프리셋으로 저장 */}
        <button
          onClick={() => onSavePreset(object)}
          className="flex w-full items-center justify-center gap-1.5 rounded border border-emerald-600/50 bg-emerald-900/30 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-900/50"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 1h6.5L10 2.5V10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.2" />
            <rect x="4" y="1" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
            <rect x="3.5" y="7" width="4" height="2" rx="0.5" stroke="currentColor" strokeWidth="0.8" />
          </svg>
          내 프리셋으로 저장
        </button>

        {/* 삭제 */}
        <button
          onClick={() => onDelete(object.id)}
          className="w-full rounded border border-red-600/30 py-1.5 text-xs text-red-400 transition-colors hover:border-red-600/50 hover:bg-red-900/20"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
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
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="flex-1">
      <span className="mb-0.5 block text-center text-[9px] text-gray-600">{label}</span>
      <input
        type="number"
        step={step}
        value={typeof value === 'number' ? parseFloat(value.toFixed(3)) : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-600 bg-gray-800 px-1.5 py-1 text-center text-xs font-mono text-white outline-none focus:border-blue-500"
      />
    </div>
  );
}
