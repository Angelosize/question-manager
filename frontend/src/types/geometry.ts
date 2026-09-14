// 几何画板数据类型定义

export type ToolType =
  | 'select'
  | 'point'
  | 'segment'
  | 'line'
  | 'ray'
  | 'circle'
  | 'polygon'
  | 'angle'
  | 'text'
  | 'freehand'
  | 'specified-angle'   // ⭐ 指定角度工具
  | 'label-point'       // ⭐ 标注点
  | 'label-length'      // ⭐ 标注线段长度
  | 'label-angle'       // ⭐ 标注角度值
  | 'label-text';       // ⭐ 标注独立文字

export interface PointElement {
  id: string;
  type: 'point';
  x: number;
  y: number;
  color: string;
}

export interface SegmentElement {
  id: string;
  type: 'segment';
  from: string;
  to: string;
  color: string;
  width: number;
}

export interface LineElement {
  id: string;
  type: 'line';
  from: string;
  to: string;
  color: string;
  width: number;
}

export interface RayElement {
  id: string;
  type: 'ray';
  from: string;
  to: string;
  color: string;
  width: number;
}

export interface CircleElement {
  id: string;
  type: 'circle';
  center: string;
  radius: number;
  color: string;
  width: number;
}

export interface PolygonElement {
  id: string;
  type: 'polygon';
  points: string[];
  color: string;
  width: number;
}

export interface AngleElement {
  id: string;
  type: 'angle';
  vertex: string;
  from: string;
  to: string;
  label?: string;
  color: string;
}

export interface TextElement {
  id: string;
  type: 'text';
  x: number;
  y: number;
  content: string;
  color: string;
}

export interface FreehandElement {
  id: string;
  type: 'freehand';
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

// ⭐ 新增：指定角度元素
export interface SpecifiedAngleElement {
  id: string;
  type: 'specified-angle';
  vertex: string;      // 顶点 A
  from: string;        // 边上点 B
  to: string;          // 边上点 C（自动计算生成）
  value: number;       // 角度值（度）
  direction: 'ccw' | 'cw';  // 逆时针/顺时针
  label?: string;
  color: string;
  showValue: boolean;  // 是否显示角度数值
}

// ⭐ 新增：点标注
export interface LabelPointElement {
  id: string;
  type: 'label-point';
  point: string;               // 引用点 id
  text: string;
  offset: [number, number];    // 相对点的偏移 [dx, dy]
  color: string;
  showBackground?: boolean;
}

// ⭐ 新增：线段长度标注
export interface LabelLengthElement {
  id: string;
  type: 'label-length';
  segment: string;             // 引用线段 id
  offset: number;              // 相对中点的垂直偏移
  unit: string;
  color: string;
  showBackground?: boolean;
}

// ⭐ 新增：角度标注
export interface LabelAngleElement {
  id: string;
  type: 'label-angle';
  angle: string;               // 引用 angle 或 specified-angle id
  showDegree: boolean;
  color: string;
  showBackground?: boolean;
}

// ⭐ 新增：独立文字标注
export interface LabelTextElement {
  id: string;
  type: 'label-text';
  x: number;
  y: number;
  text: string;
  color: string;
  showBackground?: boolean;
}

export type GeometryElement =
  | PointElement
  | SegmentElement
  | LineElement
  | RayElement
  | CircleElement
  | PolygonElement
  | AngleElement
  | TextElement
  | FreehandElement
  | SpecifiedAngleElement
  | LabelPointElement
  | LabelLengthElement
  | LabelAngleElement
  | LabelTextElement;

export interface DrawingData {
  version: number;
  canvas: { width: number; height: number };
  elements: GeometryElement[];
}