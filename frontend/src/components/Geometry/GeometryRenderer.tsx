import React from 'react';
import {
  DrawingData, GeometryElement, PointElement,
  SegmentElement, LineElement, RayElement, CircleElement,
  PolygonElement, AngleElement, TextElement, FreehandElement,
  SpecifiedAngleElement, LabelPointElement, LabelLengthElement,
  LabelAngleElement, LabelTextElement,
} from '../../types/geometry';

interface Props {
  data?: DrawingData | null;
  width?: number | string;
  height?: number | string;
}

const getP = (els: GeometryElement[], id: string) => {
  const p = els.find(e => e.id === id);
  if (p && p.type === 'point') return { x: (p as PointElement).x, y: (p as PointElement).y };
  return null;
};

const GeometryRenderer: React.FC<Props> = ({ data, width = '100%', height = 320 }) => {
  if (!data || !Array.isArray(data.elements) || data.elements.length === 0) return null;
  const { canvas, elements } = data;
  const W = canvas?.width || 800;
  const H = canvas?.height || 600;

  const renderEl = (el: GeometryElement) => {
    switch (el.type) {
      case 'point': {
        const p = el as PointElement;
        return <circle key={p.id} cx={p.x} cy={p.y} r={5} fill={p.color} stroke="#fff" strokeWidth={1.5} />;
      }
      case 'segment': {
        const s = el as SegmentElement;
        const a = getP(elements, s.from), b = getP(elements, s.to);
        if (!a || !b) return null;
        return <line key={s.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={s.color} strokeWidth={s.width} />;
      }
      case 'line': {
        const l = el as LineElement;
        const a = getP(elements, l.from), b = getP(elements, l.to);
        if (!a || !b) return null;
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ext = 2000;
        return <line key={l.id} x1={a.x - dx / len * ext} y1={a.y - dy / len * ext} x2={b.x + dx / len * ext} y2={b.y + dy / len * ext} stroke={l.color} strokeWidth={l.width} />;
      }
      case 'ray': {
        const r = el as RayElement;
        const a = getP(elements, r.from), b = getP(elements, r.to);
        if (!a || !b) return null;
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ext = 2000;
        return <line key={r.id} x1={a.x} y1={a.y} x2={a.x + dx / len * ext} y2={a.y + dy / len * ext} stroke={r.color} strokeWidth={r.width} />;
      }
      case 'circle': {
        const c = el as CircleElement;
        const center = getP(elements, c.center);
        if (!center) return null;
        return <circle key={c.id} cx={center.x} cy={center.y} r={c.radius} fill="none" stroke={c.color} strokeWidth={c.width} />;
      }
      case 'polygon': {
        const pg = el as PolygonElement;
        const pts = pg.points.map(pid => getP(elements, pid)).filter(Boolean) as { x: number; y: number }[];
        if (pts.length < 3) return null;
        return <polygon key={pg.id} points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={pg.color} strokeWidth={pg.width} />;
      }
      case 'angle': {
        const a = el as AngleElement;
        const v = getP(elements, a.vertex), p1 = getP(elements, a.from), p2 = getP(elements, a.to);
        if (!v || !p1 || !p2) return null;
        const a1 = Math.atan2(p1.y - v.y, p1.x - v.x);
        const a2 = Math.atan2(p2.y - v.y, p2.x - v.x);
        const r = 40;
        const x1 = v.x + r * Math.cos(a1), y1 = v.y + r * Math.sin(a1);
        const x2 = v.x + r * Math.cos(a2), y2 = v.y + r * Math.sin(a2);
        let diff = a2 - a1;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        const sw = diff > 0 ? 1 : 0;
        const mid = a1 + diff / 2;
        const lx = v.x + (r + 15) * Math.cos(mid), ly = v.y + (r + 15) * Math.sin(mid);
        return (
          <g key={a.id}>
            <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 ${sw} ${x2} ${y2}`} fill="none" stroke={a.color} strokeWidth={2} />
            {a.label && <text x={lx} y={ly} fill={a.color} fontSize={16} textAnchor="middle" dominantBaseline="middle">{a.label}</text>}
          </g>
        );
      }
      case 'text':
        return <text key={el.id} x={el.x} y={el.y} fill={el.color} fontSize={18} style={{ userSelect: 'none' }}>{el.content}</text>;
      case 'freehand': {
        const f = el as FreehandElement;
        if (f.points.length < 2) return null;
        const d = f.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return <path key={f.id} d={d} fill="none" stroke={f.color} strokeWidth={f.width} strokeLinecap="round" strokeLinejoin="round" />;
      }

      // ⭐ 指定角度
      case 'specified-angle': {
        const sa = el as SpecifiedAngleElement;
        const v = getP(elements, sa.vertex);
        const p1 = getP(elements, sa.from);
        const p2 = getP(elements, sa.to);
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
              <text x={lx} y={ly} fill={sa.color} fontSize={14} textAnchor="middle" dominantBaseline="middle">{sa.value}°</text>
            )}
          </g>
        );
      }

      // ⭐ 点标注
      case 'label-point': {
        const lp = el as LabelPointElement;
        const p = getP(elements, lp.point);
        if (!p) return null;
        return (
          <text key={lp.id} x={p.x + lp.offset[0]} y={p.y + lp.offset[1]} fill={lp.color} fontSize={14} style={{ userSelect: 'none' }}>
            {lp.text}
          </text>
        );
      }

      // ⭐ 长度标注
      case 'label-length': {
        const ll = el as LabelLengthElement;
        const seg = elements.find(e => e.id === ll.segment);
        if (!seg || seg.type !== 'segment') return null;
        const a = getP(elements, seg.from);
        const b = getP(elements, seg.to);
        if (!a || !b) return null;
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const lenV = Math.hypot(dx, dy) || 1;
        const nx = -dy / lenV, ny = dx / lenV;
        const x = midX + nx * ll.offset, y = midY + ny * ll.offset;
        return (
          <text key={ll.id} x={x} y={y} fill={ll.color} fontSize={14} textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none' }}>
            {len.toFixed(2)}{ll.unit || ''}
          </text>
        );
      }

      // ⭐ 角度标注
      case 'label-angle': {
        const la = el as LabelAngleElement;
        const target = elements.find(e => e.id === la.angle);
        if (!target || (target.type !== 'angle' && target.type !== 'specified-angle')) return null;
        const v = getP(elements, target.vertex);
        const p1 = getP(elements, target.from);
        const p2 = getP(elements, target.to);
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
          <text key={la.id} x={x} y={y} fill={la.color} fontSize={14} textAnchor="middle" dominantBaseline="middle" style={{ userSelect: 'none' }}>
            {la.showDegree ? `${deg.toFixed(1)}°` : deg.toFixed(1)}
          </text>
        );
      }

      // ⭐ 独立文字标注
      case 'label-text': {
        const lt = el as LabelTextElement;
        return (
          <text key={lt.id} x={lt.x} y={lt.y} fill={lt.color} fontSize={14} style={{ userSelect: 'none' }}>
            {lt.text}
          </text>
        );
      }

      default: return null;
    }
  };

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 4, overflow: 'hidden', background: '#fff', maxWidth: '100%' }}>
      <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', maxWidth: '100%' }}>
        <rect width={W} height={H} fill="#fff" />
        {elements.map(renderEl)}
      </svg>
    </div>
  );
};

export default GeometryRenderer;