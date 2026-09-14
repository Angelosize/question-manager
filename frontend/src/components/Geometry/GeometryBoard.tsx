import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button, Space, Select, InputNumber, Switch, Tooltip, Input, Radio, message } from 'antd';
import {
  SelectOutlined, MinusOutlined, LineOutlined, ArrowRightOutlined,
  BorderOutlined, RadiusUpleftOutlined, FontSizeOutlined,
  EditOutlined, UndoOutlined, RedoOutlined, DeleteOutlined,
  AppstoreOutlined, RadiusSettingOutlined,
  AimOutlined, TagsOutlined, ColumnWidthOutlined, FontColorsOutlined,
} from '@ant-design/icons';
import { useGeometryStore } from '../../store/geometryStore';
import {
  GeometryElement, ToolType, PointElement, SegmentElement,
  LineElement, RayElement, CircleElement, PolygonElement,
  AngleElement, TextElement, FreehandElement, DrawingData,
  SpecifiedAngleElement, LabelPointElement, LabelLengthElement,
  LabelAngleElement, LabelTextElement,
} from '../../types/geometry';

const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;

const getPointCoords = (elements: GeometryElement[], id: string) => {
  const p = elements.find(el => el.id === id);
  if (p && p.type === 'point') return { x: (p as PointElement).x, y: (p as PointElement).y };
  return null;
};

const COLORS = [
  { label: '黑', value: '#000000' },
  { label: '红', value: '#ff4d4f' },
  { label: '蓝', value: '#1890ff' },
  { label: '绿', value: '#52c41a' },
];

const CANVAS_W = 800;
const CANVAS_H = 600;

interface Props {
  open: boolean;
  value?: DrawingData | null;
  onOk: (data: DrawingData | null) => void;
  onCancel: () => void;
}

const GeometryBoard: React.FC<Props> = ({ open, value, onOk, onCancel }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const {
    elements, tool, color, width: strokeWidth,
    showGrid, snapToGrid, gridSize, snapToPoint,
    selectedId, pendingPoints,
    setTool, setColor, setWidth, toggleGrid, toggleSnapToGrid,
    setGridSize, toggleSnapToPoint, setSelected,
    addElement, addElements,
    updateElement, removeElement, clear,
    undo, redo, canUndo, canRedo,
    setPendingPoints, clearPending,
    setLabelOffset,
    loadFromJSON, toJSON,
  } = useGeometryStore();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [textModal, setTextModal] = useState<{ open: boolean; x: number; y: number; editId?: string }>({ open: false, x: 0, y: 0 });
  const [textValue, setTextValue] = useState('');
  const [angleModal, setAngleModal] = useState<{ open: boolean; vertex: string; from: string; to: string }>({ open: false, vertex: '', from: '', to: '' });
  const [angleLabel, setAngleLabel] = useState('α');
  const [freehandPoints, setFreehandPoints] = useState<{ x: number; y: number }[]>([]);

  // 指定角度弹窗
  const [specAngleModal, setSpecAngleModal] = useState<{ open: boolean; vertex: string; from: string }>({
    open: false, vertex: '', from: '',
  });
  const [specAngleValue, setSpecAngleValue] = useState<number>(60);
  const [specAngleDirection, setSpecAngleDirection] = useState<'ccw' | 'cw'>('ccw');

  // 标注输入
  const [labelInputModal, setLabelInputModal] = useState<{
    open: boolean; mode: 'label-point' | 'label-text';
    targetId: string; x: number; y: number;
  }>({ open: false, mode: 'label-point', targetId: '', x: 0, y: 0 });
  const [labelInputValue, setLabelInputValue] = useState('');

  // 标注拖动
  const [draggingLabelId, setDraggingLabelId] = useState<string | null>(null);

  useEffect(() => {
    if (open) loadFromJSON(value || null);
  }, [open, value, loadFromJSON]);

  // 坐标映射（考虑 preserveAspectRatio="xMidYMid meet"）
  const getSvgCoords = (e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();

    const svgAspect = CANVAS_W / CANVAS_H;
    const rectAspect = rect.width / rect.height;

    let scale: number;
    let offsetX = 0;
    let offsetY = 0;

    if (rectAspect > svgAspect) {
      scale = rect.height / CANVAS_H;
      const contentWidth = CANVAS_W * scale;
      offsetX = (rect.width - contentWidth) / 2;
    } else {
      scale = rect.width / CANVAS_W;
      const contentHeight = CANVAS_H * scale;
      offsetY = (rect.height - contentHeight) / 2;
    }

    return {
      x: (e.clientX - rect.left - offsetX) / scale,
      y: (e.clientY - rect.top - offsetY) / scale,
    };
  };

  const snapGrid = (x: number, y: number) => {
    if (!snapToGrid) return { x, y };
    return { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize };
  };

  const findNearestPoint = (x: number, y: number, maxDist = 12): PointElement | null => {
    let nearest: PointElement | null = null;
    let minDist = maxDist;
    elements.forEach(el => {
      if (el.type === 'point') {
        const p = el as PointElement;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < minDist) { minDist = d; nearest = p; }
      }
    });
    return nearest;
  };

  // 点到线段距离
  const distToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };

  const findNearestSegment = (x: number, y: number, maxDist = 12): SegmentElement | null => {
    let nearest: SegmentElement | null = null;
    let minDist = maxDist;
    elements.forEach(el => {
      if (el.type === 'segment') {
        const s = el as SegmentElement;
        const a = getPointCoords(elements, s.from);
        const b = getPointCoords(elements, s.to);
        if (!a || !b) return;
        const d = distToSegment({ x, y }, a, b);
        if (d < minDist) { minDist = d; nearest = s; }
      }
    });
    return nearest;
  };

  const findNearestAngle = (x: number, y: number, maxDist = 30): GeometryElement | null => {
    let nearest: GeometryElement | null = null;
    let minDist = maxDist;
    elements.forEach(el => {
      if (el.type === 'angle' || el.type === 'specified-angle') {
        const a = el as AngleElement | SpecifiedAngleElement;
        const v = getPointCoords(elements, a.vertex);
        if (!v) return;
        const d = Math.hypot(x - v.x, y - v.y);
        if (Math.abs(d - 40) < maxDist && d < minDist) { minDist = d; nearest = el; }
      }
    });
    return nearest;
  };

  const segExists = (fromId: string, toId: string) =>
    elements.some(el =>
      el.type === 'segment' &&
      (((el as SegmentElement).from === fromId && (el as SegmentElement).to === toId) ||
       ((el as SegmentElement).from === toId && (el as SegmentElement).to === fromId))
    );

  const resolvePoint = (x: number, y: number): { point: PointElement; isNew: boolean } => {
    if (snapToPoint) {
      const nearest = findNearestPoint(x, y);
      if (nearest) return { point: nearest, isNew: false };
    }
    const snapped = snapGrid(x, y);
    return {
      point: { id: genId('p'), type: 'point', x: snapped.x, y: snapped.y, color },
      isNew: true,
    };
  };

  const handleSvgMouseDown = (e: React.MouseEvent) => {
    if (tool === 'select') return;
    const { x, y } = getSvgCoords(e);
    const { point, isNew } = resolvePoint(x, y);
    const pid = point.id;

    switch (tool) {
      case 'point':
        if (isNew) addElement(point);
        break;

      case 'segment':
      case 'line':
      case 'ray': {
        const newPending = pendingPoints.includes(pid) ? [...pendingPoints] : [...pendingPoints, pid];
        if (newPending.length === 2) {
          if (isNew) addElement(point);
          const typeMap: any = { segment: 'l', line: 'ln', ray: 'r' };
          addElement({
            id: genId(typeMap[tool]),
            type: tool,
            from: newPending[0],
            to: newPending[1],
            color,
            width: strokeWidth,
          } as any);
          clearPending();
        } else {
          if (isNew) addElement(point);
          setPendingPoints(newPending);
        }
        break;
      }

      case 'circle': {
        if (pendingPoints.length === 0) {
          if (isNew) addElement(point);
          setPendingPoints([pid]);
        } else {
          const center = getPointCoords(elements, pendingPoints[0]);
          if (!center) { clearPending(); break; }
          const radius = Math.hypot(x - center.x, y - center.y);
          addElement({
            id: genId('c'),
            type: 'circle',
            center: pendingPoints[0],
            radius,
            color,
            width: strokeWidth,
          });
          clearPending();
        }
        break;
      }

      case 'polygon': {
        if (!pendingPoints.includes(pid)) {
          if (isNew) addElement(point);
          setPendingPoints([...pendingPoints, pid]);
        }
        break;
      }

      case 'angle': {
        const newPending = pendingPoints.includes(pid) ? [...pendingPoints] : [...pendingPoints, pid];
        if (newPending.length === 3) {
          if (isNew) addElement(point);
          setAngleModal({ open: true, vertex: newPending[0], from: newPending[1], to: newPending[2] });
        } else {
          if (isNew) addElement(point);
          setPendingPoints(newPending);
        }
        break;
      }

      case 'text':
        setTextModal({ open: true, x, y });
        setTextValue('');
        break;

      case 'freehand':
        setFreehandPoints([{ x, y }]);
        break;

      // ⭐ 指定角度
      case 'specified-angle': {
        const newPending = pendingPoints.includes(pid) ? [...pendingPoints] : [...pendingPoints, pid];
        if (newPending.length === 2) {
          if (isNew) addElement(point);
          setSpecAngleModal({ open: true, vertex: newPending[0], from: newPending[1] });
        } else {
          if (isNew) addElement(point);
          setPendingPoints(newPending);
        }
        break;
      }

      // ⭐ 标点
      case 'label-point': {
        const nearest = findNearestPoint(x, y, 15);
        if (nearest) {
          setLabelInputModal({ open: true, mode: 'label-point', targetId: nearest.id, x: 0, y: 0 });
          setLabelInputValue('');
        } else {
          message.info('请点击一个已有点');
        }
        break;
      }

      // ⭐ 标长度
      case 'label-length': {
        const seg = findNearestSegment(x, y);
        if (seg) {
          addElement({
            id: genId('ll'),
            type: 'label-length',
            segment: seg.id,
            offset: 12,
            unit: '',
            color,
            showBackground: false,
          } as LabelLengthElement);
        } else {
          message.info('请点击一条线段');
        }
        break;
      }

      // ⭐ 标角
      case 'label-angle': {
        const ang = findNearestAngle(x, y);
        if (ang) {
          addElement({
            id: genId('la'),
            type: 'label-angle',
            angle: ang.id,
            showDegree: true,
            color,
            showBackground: false,
          } as LabelAngleElement);
        } else {
          message.info('请点击一个角度（靠近角度弧线附近）');
        }
        break;
      }

      // ⭐ 标文字
      case 'label-text': {
        setLabelInputModal({ open: true, mode: 'label-text', targetId: '', x, y });
        setLabelInputValue('');
        break;
      }
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getSvgCoords(e);
    const snapped = snapGrid(x, y);
    setMousePos(snapped);

    if (draggingId && tool === 'select') {
      updateElement(draggingId, { x: snapped.x, y: snapped.y });
    }
    if (tool === 'freehand' && freehandPoints.length > 0) {
      setFreehandPoints(prev => [...prev, { x, y }]);
    }

    // ⭐ 标注拖动
    if (draggingLabelId && tool === 'select') {
      const labelEl = elements.find(e => e.id === draggingLabelId);
      if (labelEl) {
        if (labelEl.type === 'label-text') {
          updateElement(draggingLabelId, { x, y });
        } else if (labelEl.type === 'label-point') {
          const p = getPointCoords(elements, labelEl.point);
          if (p) setLabelOffset(draggingLabelId, [x - p.x, y - p.y]);
        } else if (labelEl.type === 'label-length') {
          const seg = elements.find(e => e.id === labelEl.segment);
          if (seg && seg.type === 'segment') {
            const a = getPointCoords(elements, seg.from);
            const b = getPointCoords(elements, seg.to);
            if (a && b) {
              const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
              const dx = b.x - a.x, dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const nx = -dy / len, ny = dx / len;
              const off = (x - midX) * nx + (y - midY) * ny;
              setLabelOffset(draggingLabelId, off);
            }
          }
        }
      }
    }
  };

  const handleSvgMouseUp = () => {
    if (tool === 'freehand' && freehandPoints.length > 1) {
      addElement({
        id: genId('f'),
        type: 'freehand',
        points: freehandPoints,
        color,
        width: strokeWidth,
      });
    }
    setFreehandPoints([]);
    setDraggingId(null);
    setDraggingLabelId(null);
  };

  const finishPolygon = () => {
    if (tool === 'polygon' && pendingPoints.length >= 3) {
      addElement({
        id: genId('pg'),
        type: 'polygon',
        points: [...pendingPoints],
        color,
        width: strokeWidth,
      });
      clearPending();
    }
  };

  const handlePointMouseDown = (e: React.MouseEvent, pointId: string) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    setSelected(pointId);
    setDraggingId(pointId);
  };

  const submitText = () => {
    if (textValue.trim()) {
      if (textModal.editId) {
        updateElement(textModal.editId, { content: textValue });
      } else {
        addElement({
          id: genId('t'),
          type: 'text',
          x: textModal.x,
          y: textModal.y,
          content: textValue,
          color,
        });
      }
    }
    setTextModal({ open: false, x: 0, y: 0 });
    setTextValue('');
  };

  const submitAngle = () => {
    const { vertex, from, to } = angleModal;
    if (!vertex || !from || !to) return;

    const newElements: GeometryElement[] = [
      {
        id: genId('r'),
        type: 'ray',
        from: vertex,
        to: from,
        color,
        width: strokeWidth,
      } as RayElement,
      {
        id: genId('r'),
        type: 'ray',
        from: vertex,
        to: to,
        color,
        width: strokeWidth,
      } as RayElement,
      {
        id: genId('a'),
        type: 'angle',
        vertex,
        from,
        to,
        label: angleLabel,
        color,
      } as AngleElement,
    ];

    addElements(newElements);

    setAngleModal({ open: false, vertex: '', from: '', to: '' });
    setAngleLabel('α');
    clearPending();
  };

  // ⭐ 提交指定角度
  const submitSpecifiedAngle = () => {
    const { vertex, from } = specAngleModal;
    const A = getPointCoords(elements, vertex);
    const B = getPointCoords(elements, from);
    if (!A || !B) return;

    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const rad = (specAngleValue * Math.PI) / 180;

    let cx: number, cy: number;
    if (specAngleDirection === 'ccw') {
      cx = A.x + dx * Math.cos(rad) + dy * Math.sin(rad);
      cy = A.y - dx * Math.sin(rad) + dy * Math.cos(rad);
    } else {
      cx = A.x + dx * Math.cos(rad) - dy * Math.sin(rad);
      cy = A.y + dx * Math.sin(rad) + dy * Math.cos(rad);
    }

    const newElements: GeometryElement[] = [];
    const cPoint: PointElement = { id: genId('p'), type: 'point', x: cx, y: cy, color };
    newElements.push(cPoint);

    if (!segExists(vertex, from)) {
      newElements.push({
        id: genId('l'), type: 'segment', from: vertex, to: from,
        color, width: strokeWidth,
      } as SegmentElement);
    }
    newElements.push({
      id: genId('l'), type: 'segment', from: vertex, to: cPoint.id,
      color, width: strokeWidth,
    } as SegmentElement);

    newElements.push({
      id: genId('sa'), type: 'specified-angle',
      vertex, from, to: cPoint.id,
      value: specAngleValue,
      direction: specAngleDirection,
      color,
      showValue: true,
    } as SpecifiedAngleElement);

    addElements(newElements);
    setSpecAngleModal({ open: false, vertex: '', from: '' });
    clearPending();
    message.success(`已绘制 ${specAngleValue}° 角`);
  };

  // ⭐ 提交标注输入
  const submitLabelInput = () => {
    const text = labelInputValue.trim();
    if (text) {
      if (labelInputModal.mode === 'label-point') {
        addElement({
          id: genId('lp'), type: 'label-point',
          point: labelInputModal.targetId,
          text, offset: [10, -10], color, showBackground: false,
        } as LabelPointElement);
      } else {
        addElement({
          id: genId('lt'), type: 'label-text',
          x: labelInputModal.x, y: labelInputModal.y,
          text, color, showBackground: false,
        } as LabelTextElement);
      }
    }
    setLabelInputModal({ open: false, mode: 'label-point', targetId: '', x: 0, y: 0 });
    setLabelInputValue('');
  };

  // ===== 渲染元素 =====
  const renderElement = (el: GeometryElement) => {
    switch (el.type) {
      case 'point': {
        const p = el as PointElement;
        return (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={5} fill={p.color} stroke="#fff" strokeWidth={1.5} />
            <circle
              cx={p.x} cy={p.y} r={12} fill="transparent"
              style={{ cursor: tool === 'select' ? 'move' : 'pointer' }}
              onMouseDown={(e) => handlePointMouseDown(e, p.id)}
            />
          </g>
        );
      }
      case 'segment': {
        const s = el as SegmentElement;
        const a = getPointCoords(elements, s.from), b = getPointCoords(elements, s.to);
        if (!a || !b) return null;
        return <line key={s.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={s.color} strokeWidth={s.width} />;
      }
      case 'line': {
        const l = el as LineElement;
        const a = getPointCoords(elements, l.from), b = getPointCoords(elements, l.to);
        if (!a || !b) return null;
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ext = 2000;
        return <line key={l.id} x1={a.x - dx / len * ext} y1={a.y - dy / len * ext} x2={b.x + dx / len * ext} y2={b.y + dy / len * ext} stroke={l.color} strokeWidth={l.width} />;
      }
      case 'ray': {
        const r = el as RayElement;
        const a = getPointCoords(elements, r.from), b = getPointCoords(elements, r.to);
        if (!a || !b) return null;
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ext = 2000;
        return <line key={r.id} x1={a.x} y1={a.y} x2={a.x + dx / len * ext} y2={a.y + dy / len * ext} stroke={r.color} strokeWidth={r.width} />;
      }
      case 'circle': {
        const c = el as CircleElement;
        const center = getPointCoords(elements, c.center);
        if (!center) return null;
        return <circle key={c.id} cx={center.x} cy={center.y} r={c.radius} fill="none" stroke={c.color} strokeWidth={c.width} />;
      }
      case 'polygon': {
        const pg = el as PolygonElement;
        const pts = pg.points.map(pid => getPointCoords(elements, pid)).filter(Boolean) as { x: number; y: number }[];
        if (pts.length < 3) return null;
        return <polygon key={pg.id} points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={pg.color} strokeWidth={pg.width} />;
      }
      case 'angle': {
        const a = el as AngleElement;
        const v = getPointCoords(elements, a.vertex);
        const p1 = getPointCoords(elements, a.from);
        const p2 = getPointCoords(elements, a.to);
        if (!v || !p1 || !p2) return null;
        const ang1 = Math.atan2(p1.y - v.y, p1.x - v.x);
        const ang2 = Math.atan2(p2.y - v.y, p2.x - v.x);
        const r = 40;
        const x1 = v.x + r * Math.cos(ang1), y1 = v.y + r * Math.sin(ang1);
        const x2 = v.x + r * Math.cos(ang2), y2 = v.y + r * Math.sin(ang2);
        let diff = ang2 - ang1;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        const sweepFlag = diff > 0 ? 1 : 0;
        const midAng = ang1 + diff / 2;
        const lx = v.x + (r + 15) * Math.cos(midAng);
        const ly = v.y + (r + 15) * Math.sin(midAng);
        return (
          <g key={a.id}>
            <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 ${sweepFlag} ${x2} ${y2}`} fill="none" stroke={a.color} strokeWidth={2} />
            {a.label && <text x={lx} y={ly} fill={a.color} fontSize={16} textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none' }}>{a.label}</text>}
          </g>
        );
      }
      case 'text': {
        const t = el as TextElement;
        return (
          <text
            key={t.id} x={t.x} y={t.y} fill={t.color} fontSize={18}
            style={{ cursor: tool === 'select' ? 'pointer' : 'default', userSelect: 'none' }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setTextModal({ open: true, x: t.x, y: t.y, editId: t.id });
              setTextValue(t.content);
            }}
          >
            {t.content}
          </text>
        );
      }
      case 'freehand': {
        const f = el as FreehandElement;
        if (f.points.length < 2) return null;
        const d = f.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return <path key={f.id} d={d} fill="none" stroke={f.color} strokeWidth={f.width} strokeLinecap="round" strokeLinejoin="round" />;
      }

      // ⭐ 指定角度
      case 'specified-angle': {
        const sa = el as SpecifiedAngleElement;
        const v = getPointCoords(elements, sa.vertex);
        const p1 = getPointCoords(elements, sa.from);
        const p2 = getPointCoords(elements, sa.to);
        if (!v || !p1 || !p2) return null;
        const ang1 = Math.atan2(p1.y - v.y, p1.x - v.x);
        const ang2 = Math.atan2(p2.y - v.y, p2.x - v.x);
        const r = 40;
        const sx = v.x + r * Math.cos(ang1), sy = v.y + r * Math.sin(ang1);
        const ex = v.x + r * Math.cos(ang2), ey = v.y + r * Math.sin(ang2);
        const largeArc = sa.value > 180 ? 1 : 0;
        const sweep = sa.direction === 'cw' ? 1 : 0;

        let diff = ang2 - ang1;
        if (sa.direction === 'ccw') {
          while (diff > 0) diff -= 2 * Math.PI;
          while (diff < -2 * Math.PI) diff += 2 * Math.PI;
        } else {
          while (diff < 0) diff += 2 * Math.PI;
          while (diff > 2 * Math.PI) diff -= 2 * Math.PI;
        }
        const midAng = ang1 + diff / 2;
        const lx = v.x + (r + 15) * Math.cos(midAng);
        const ly = v.y + (r + 15) * Math.sin(midAng);

        return (
          <g key={sa.id}>
            <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} ${sweep} ${ex} ${ey}`} fill="none" stroke={sa.color} strokeWidth={2} />
            {sa.showValue && (
              <text x={lx} y={ly} fill={sa.color} fontSize={14} textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none' }}>
                {sa.value}°
              </text>
            )}
          </g>
        );
      }

      // ⭐ 点标注
      case 'label-point': {
        const lp = el as LabelPointElement;
        const p = getPointCoords(elements, lp.point);
        if (!p) return null;
        return (
          <text
            key={lp.id}
            x={p.x + lp.offset[0]} y={p.y + lp.offset[1]}
            fill={lp.color} fontSize={14}
            style={{ cursor: tool === 'select' ? 'move' : 'default', userSelect: 'none' }}
            onMouseDown={(e) => { if (tool === 'select') { e.stopPropagation(); setDraggingLabelId(lp.id); } }}
          >
            {lp.text}
          </text>
        );
      }

      // ⭐ 长度标注
      case 'label-length': {
        const ll = el as LabelLengthElement;
        const seg = elements.find(e => e.id === ll.segment);
        if (!seg || seg.type !== 'segment') return null;
        const a = getPointCoords(elements, seg.from);
        const b = getPointCoords(elements, seg.to);
        if (!a || !b) return null;
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const lenV = Math.hypot(dx, dy) || 1;
        const nx = -dy / lenV, ny = dx / lenV;
        const x = midX + nx * ll.offset, y = midY + ny * ll.offset;
        return (
          <text
            key={ll.id} x={x} y={y} fill={ll.color} fontSize={14}
            textAnchor="middle" dominantBaseline="middle"
            style={{ cursor: tool === 'select' ? 'move' : 'default', userSelect: 'none' }}
            onMouseDown={(e) => { if (tool === 'select') { e.stopPropagation(); setDraggingLabelId(ll.id); } }}
          >
            {len.toFixed(2)}{ll.unit || ''}
          </text>
        );
      }

      // ⭐ 角度标注
      case 'label-angle': {
        const la = el as LabelAngleElement;
        const target = elements.find(e => e.id === la.angle);
        if (!target) return null;
        if (target.type !== 'angle' && target.type !== 'specified-angle') return null;
        const v = getPointCoords(elements, target.vertex);
        const p1 = getPointCoords(elements, target.from);
        const p2 = getPointCoords(elements, target.to);
        if (!v || !p1 || !p2) return null;
        const AB = Math.hypot(p1.x - v.x, p1.y - v.y);
        const AC = Math.hypot(p2.x - v.x, p2.y - v.y);
        const BC = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const cosA = (AB * AB + AC * AC - BC * BC) / (2 * AB * AC || 1);
        const deg = (Math.acos(Math.max(-1, Math.min(1, cosA))) * 180) / Math.PI;
        const ang1 = Math.atan2(p1.y - v.y, p1.x - v.x);
        const ang2 = Math.atan2(p2.y - v.y, p2.x - v.x);
        let diff = ang2 - ang1;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        const midAng = ang1 + diff / 2;
        const r = 60;
        const x = v.x + r * Math.cos(midAng), y = v.y + r * Math.sin(midAng);
        return (
          <text
            key={la.id} x={x} y={y} fill={la.color} fontSize={14}
            textAnchor="middle" dominantBaseline="middle"
            style={{ userSelect: 'none' }}
          >
            {la.showDegree ? `${deg.toFixed(1)}°` : deg.toFixed(1)}
          </text>
        );
      }

      // ⭐ 独立文字标注
      case 'label-text': {
        const lt = el as LabelTextElement;
        return (
          <text
            key={lt.id} x={lt.x} y={lt.y} fill={lt.color} fontSize={14}
            style={{ cursor: tool === 'select' ? 'move' : 'default', userSelect: 'none' }}
            onMouseDown={(e) => { if (tool === 'select') { e.stopPropagation(); setDraggingLabelId(lt.id); } }}
          >
            {lt.text}
          </text>
        );
      }

      default: return null;
    }
  };

  const renderPreview = () => {
    if (!mousePos) return null;
    if ((tool === 'segment' || tool === 'line' || tool === 'ray') && pendingPoints.length === 1) {
      const a = getPointCoords(elements, pendingPoints[0]);
      if (!a) return null;
      if (tool === 'line') {
        const dx = mousePos.x - a.x, dy = mousePos.y - a.y, len = Math.hypot(dx, dy) || 1, ext = 2000;
        return <line x1={a.x - dx / len * ext} y1={a.y - dy / len * ext} x2={a.x + dx / len * ext} y2={a.y + dy / len * ext} stroke={color} strokeWidth={strokeWidth} strokeDasharray="5,5" opacity={0.6} />;
      }
      if (tool === 'ray') {
        const dx = mousePos.x - a.x, dy = mousePos.y - a.y, len = Math.hypot(dx, dy) || 1, ext = 2000;
        return <line x1={a.x} y1={a.y} x2={a.x + dx / len * ext} y2={a.y + dy / len * ext} stroke={color} strokeWidth={strokeWidth} strokeDasharray="5,5" opacity={0.6} />;
      }
      return <line x1={a.x} y1={a.y} x2={mousePos.x} y2={mousePos.y} stroke={color} strokeWidth={strokeWidth} strokeDasharray="5,5" opacity={0.6} />;
    }
    if (tool === 'circle' && pendingPoints.length === 1) {
      const c = getPointCoords(elements, pendingPoints[0]);
      if (!c) return null;
      const r = Math.hypot(mousePos.x - c.x, mousePos.y - c.y);
      return <circle cx={c.x} cy={c.y} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray="5,5" opacity={0.6} />;
    }
    if (tool === 'polygon' && pendingPoints.length >= 1) {
      const pts = pendingPoints.map(pid => getPointCoords(elements, pid)).filter(Boolean) as { x: number; y: number }[];
      if (pts.length === 0) return null;
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ` L ${mousePos.x} ${mousePos.y}`;
      return <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray="5,5" opacity={0.6} />;
    }
    if (tool === 'freehand' && freehandPoints.length > 1) {
      const d = freehandPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      return <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />;
    }
    if (tool === 'specified-angle' && pendingPoints.length === 1) {
      const a = getPointCoords(elements, pendingPoints[0]);
      if (!a) return null;
      return <line x1={a.x} y1={a.y} x2={mousePos.x} y2={mousePos.y} stroke={color} strokeWidth={strokeWidth} strokeDasharray="5,5" opacity={0.6} />;
    }
    return null;
  };

  const renderGrid = () => {
    if (!showGrid) return null;
    const lines: React.ReactNode[] = [];
    for (let x = 0; x <= CANVAS_W; x += gridSize) lines.push(<line key={`gx${x}`} x1={x} y1={0} x2={x} y2={CANVAS_H} stroke="#eaeaea" strokeWidth={0.5} />);
    for (let y = 0; y <= CANVAS_H; y += gridSize) lines.push(<line key={`gy${y}`} x1={0} y1={y} x2={CANVAS_W} y2={y} stroke="#eaeaea" strokeWidth={0.5} />);
    return <g>{lines}</g>;
  };

  const tools: { key: ToolType; icon: React.ReactNode; label: string }[] = [
    { key: 'select', icon: <SelectOutlined />, label: '选择/移动' },
    { key: 'point', icon: <span style={{ fontWeight: 700 }}>•</span>, label: '点' },
    { key: 'segment', icon: <MinusOutlined />, label: '线段' },
    { key: 'line', icon: <LineOutlined />, label: '直线' },
    { key: 'ray', icon: <ArrowRightOutlined />, label: '射线' },
    { key: 'circle', icon: <RadiusSettingOutlined />, label: '圆' },
    { key: 'polygon', icon: <BorderOutlined />, label: '多边形' },
    { key: 'angle', icon: <RadiusUpleftOutlined />, label: '角度' },
    { key: 'specified-angle', icon: <AimOutlined />, label: '指定角度' },
    { key: 'text', icon: <FontSizeOutlined />, label: '文字' },
    { key: 'freehand', icon: <EditOutlined />, label: '自由绘制' },
    { key: 'label-point', icon: <TagsOutlined />, label: '标点' },
    { key: 'label-length', icon: <ColumnWidthOutlined />, label: '标长度' },
    { key: 'label-angle', icon: <RadiusUpleftOutlined />, label: '标角' },
    { key: 'label-text', icon: <FontColorsOutlined />, label: '标文字' },
  ];

  return (
    <Modal
      open={open}
      title="✏️ 几何画板"
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button key="clear" danger onClick={() => Modal.confirm({
          title: '确认清空画板？',
          onOk: () => clear(),
        })}>清空</Button>,
        <Button key="ok" type="primary" onClick={() => onOk(toJSON(CANVAS_W, CANVAS_H))}>确认</Button>,
      ]}
      styles={{ body: { padding: 12 } }}
      destroyOnClose
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <Space wrap>
          {tools.map(t => (
            <Tooltip key={t.key} title={t.label}>
              <Button type={tool === t.key ? 'primary' : 'default'} icon={t.icon} onClick={() => setTool(t.key)} size="small" />
            </Tooltip>
          ))}
        </Space>
        <div style={{ width: 1, height: 24, background: '#ddd' }} />
        <Space>
          <Tooltip title="撤销"><Button size="small" icon={<UndoOutlined />} onClick={undo} disabled={!canUndo()} /></Tooltip>
          <Tooltip title="重做"><Button size="small" icon={<RedoOutlined />} onClick={redo} disabled={!canRedo()} /></Tooltip>
          <Tooltip title="删除选中"><Button size="small" danger icon={<DeleteOutlined />} onClick={() => selectedId && removeElement(selectedId)} disabled={!selectedId} /></Tooltip>
        </Space>
        <div style={{ width: 1, height: 24, background: '#ddd' }} />
        <Space>
          <span>颜色:</span>
          <Select value={color} onChange={setColor} size="small" style={{ width: 70 }} options={COLORS} />
          <span>线宽:</span>
          <InputNumber value={strokeWidth} onChange={(v) => setWidth(v || 1)} min={1} max={10} size="small" style={{ width: 60 }} />
        </Space>
        <div style={{ width: 1, height: 24, background: '#ddd' }} />
        <Space>
          <Tooltip title="显示网格"><Button size="small" type={showGrid ? 'primary' : 'default'} icon={<AppstoreOutlined />} onClick={toggleGrid} /></Tooltip>
          <span>吸附网格:</span>
          <Switch checked={snapToGrid} onChange={toggleSnapToGrid} size="small" />
          <InputNumber value={gridSize} onChange={(v) => setGridSize(v || 20)} min={5} max={100} size="small" style={{ width: 60 }} disabled={!snapToGrid} />
          <span>吸附端点:</span>
          <Switch checked={snapToPoint} onChange={toggleSnapToPoint} size="small" />
        </Space>
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
        <svg
          ref={svgRef}
          width="100%"
          height={CANVAS_H}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', cursor: tool === 'select' ? 'default' : 'crosshair' }}
          onMouseDown={handleSvgMouseDown}
          onMouseMove={handleSvgMouseMove}
          onMouseUp={handleSvgMouseUp}
          onMouseLeave={handleSvgMouseUp}
          onDoubleClick={finishPolygon}
          onContextMenu={(e) => { e.preventDefault(); finishPolygon(); }}
        >
          <rect width={CANVAS_W} height={CANVAS_H} fill="#fff" />
          {renderGrid()}
          {elements.map(renderElement)}
          {renderPreview()}
          {pendingPoints.map(pid => {
            const p = getPointCoords(elements, pid);
            if (!p) return null;
            return <circle key={`pd${pid}`} cx={p.x} cy={p.y} r={7} fill="none" stroke="#faad14" strokeWidth={2} />;
          })}
        </svg>
      </div>

      <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
        {tool === 'polygon' && '多边形：依次点击顶点，双击或右键完成'}
        {tool === 'angle' && '角度：依次点击 顶点 → 起始点 → 终止点（自动绘制两条射线）'}
        {tool === 'specified-angle' && '指定角度：点击顶点 → 点击边上一动点 → 输入角度值'}
        {tool === 'text' && '文字：点击画板位置，输入文字内容（双击已有文字可编辑）'}
        {tool === 'circle' && '圆：先点击圆心，再点击确定半径'}
        {(tool === 'segment' || tool === 'line' || tool === 'ray') && '直线类：依次点击两个端点'}
        {tool === 'label-point' && '标点：点击已有点，输入标签（如 A、B、C）'}
        {tool === 'label-length' && '标长度：点击线段，自动显示长度'}
        {tool === 'label-angle' && '标角：点击角度弧线附近，自动显示角度值'}
        {tool === 'label-text' && '标文字：点击任意位置，输入文字'}
        {tool === 'select' && '拖动点可移动；拖动标注可调整位置'}
      </div>

      {/* 文字元素弹窗 */}
      <Modal title={textModal.editId ? '编辑文字' : '添加文字'} open={textModal.open} onOk={submitText}
        onCancel={() => setTextModal({ open: false, x: 0, y: 0 })} okText="确认" cancelText="取消">
        <Input value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="如 A、B、α、β" autoFocus onPressEnter={submitText} />
      </Modal>

      {/* 角度弹窗 */}
      <Modal title="设置角度标注" open={angleModal.open} onOk={submitAngle}
        onCancel={() => { setAngleModal({ open: false, vertex: '', from: '', to: '' }); clearPending(); }} okText="确认" cancelText="取消">
        <Space>
          <span>标签：</span>
          <Input value={angleLabel} onChange={(e) => setAngleLabel(e.target.value)} placeholder="如 α、β" style={{ width: 200 }} autoFocus />
        </Space>
      </Modal>

      {/* 指定角度弹窗 */}
      <Modal
        title="指定角度"
        open={specAngleModal.open}
        onOk={submitSpecifiedAngle}
        onCancel={() => { setSpecAngleModal({ open: false, vertex: '', from: '' }); clearPending(); }}
        okText="确认" cancelText="取消"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>请输入 ∠BAC 的角度值（顶点 A 已确定）：</div>
          <InputNumber
            value={specAngleValue}
            onChange={(v) => setSpecAngleValue(v || 0)}
            min={0} max={360} step={1}
            addonAfter="度" style={{ width: 200 }} autoFocus
          />
          <Radio.Group value={specAngleDirection} onChange={(e) => setSpecAngleDirection(e.target.value)}>
            <Radio.Button value="ccw">逆时针</Radio.Button>
            <Radio.Button value="cw">顺时针</Radio.Button>
          </Radio.Group>
        </Space>
      </Modal>

      {/* 标注输入弹窗 */}
      <Modal
        title={labelInputModal.mode === 'label-point' ? '点标注' : '文字标注'}
        open={labelInputModal.open}
        onOk={submitLabelInput}
        onCancel={() => { setLabelInputModal({ open: false, mode: 'label-point', targetId: '', x: 0, y: 0 }); setLabelInputValue(''); }}
        okText="确认" cancelText="取消"
      >
        <Input
          value={labelInputValue}
          onChange={(e) => setLabelInputValue(e.target.value)}
          placeholder="如 A、B、α、θ、边长说明"
          autoFocus
          onPressEnter={submitLabelInput}
        />
      </Modal>
    </Modal>
  );
};

export default GeometryBoard;