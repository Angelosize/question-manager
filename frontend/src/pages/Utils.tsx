import React, { useState, useEffect, useRef } from 'react';
import { Card, Tabs, Input, Button, Statistic, Row, Col, Alert, InputNumber, Switch, Space, Tooltip } from 'antd';
import { CalculatorOutlined, LineChartOutlined, BarChartOutlined, InfoCircleOutlined } from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import * as math from 'mathjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
  zoomPlugin
);

const { TabPane } = Tabs;

const Utils: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-4">
      <Card>
        <h1 className="text-2xl font-bold mb-4">🛠️ 小工具集</h1>
        <Tabs defaultActiveKey="calculator">
          <TabPane tab={<span><CalculatorOutlined /> 计算器</span>} key="calculator">
            <Calculator />
          </TabPane>
          <TabPane tab={<span><LineChartOutlined /> 函数绘图</span>} key="function">
            <FunctionPlotter />
          </TabPane>
          <TabPane tab={<span><BarChartOutlined /> 统计工具</span>} key="stats">
            <StatisticsTool />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

// ===================== 增强版计算器 =====================
const Calculator: React.FC = () => {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScientific, setIsScientific] = useState(false);
  const [isRadian, setIsRadian] = useState(true);
  const inputRef = useRef<any>(null);

  const calculate = () => {
    setError(null);
    setResult(null);
    if (!expression.trim()) {
      setError('请输入表达式');
      return;
    }
    try {
      let expr = expression.replace(/(\d)([a-zA-Z])/g, '$1*$2');
      if (!isRadian) {
        expr = expr.replace(/sin\(([^)]+)\)/g, 'sin(($1)*pi/180)');
        expr = expr.replace(/cos\(([^)]+)\)/g, 'cos(($1)*pi/180)');
        expr = expr.replace(/tan\(([^)]+)\)/g, 'tan(($1)*pi/180)');
      }
      const ans = math.evaluate(expr);
      setResult(String(ans));
    } catch (err: any) {
      setError(err.message || '计算错误');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') calculate();
  };

  const appendValue = (val: string) => {
    if (val === 'C') {
      setExpression('');
      setResult(null);
      setError(null);
      inputRef.current?.focus();
      return;
    }
    if (val === '=') {
      calculate();
      inputRef.current?.focus();
      return;
    }
    setExpression(prev => prev + val);
    inputRef.current?.focus();
  };

  const insertFunction = (func: string) => {
    setExpression(prev => prev + func + '(');
    inputRef.current?.focus();
  };

  const insertConstant = (constName: string) => {
    setExpression(prev => prev + constName);
    inputRef.current?.focus();
  };

  const insertSqrt = () => {
    setExpression(prev => prev + 'sqrt(');
    inputRef.current?.focus();
  };

  const insertPower = (exp: string) => {
    setExpression(prev => prev + '^' + exp);
    inputRef.current?.focus();
  };

  const insertFactorial = () => {
    setExpression(prev => prev + '!');
    inputRef.current?.focus();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const standardButtons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
    ['(', ')', 'C', '^'],
  ];

  const scientificButtons = [
    ['sin', 'cos', 'tan', 'log', 'ln'],
    ['sqrt', 'x²', 'x³', 'x!', '1/x'],
    ['10^x', 'e^x', 'π', 'e', 'abs'],
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <Space>
          <Button type={!isScientific ? 'primary' : 'default'} onClick={() => setIsScientific(false)}>
            标准
          </Button>
          <Button type={isScientific ? 'primary' : 'default'} onClick={() => setIsScientific(true)}>
            科学
          </Button>
        </Space>
        <Space>
          <span style={{ fontSize: 14 }}>角度模式</span>
          <Switch
            checked={!isRadian}
            onChange={(checked) => setIsRadian(!checked)}
            checkedChildren="度"
            unCheckedChildren="弧度"
          />
        </Space>
      </div>

      <div className="mb-4">
        <Input
          ref={inputRef}
          size="large"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入表达式，如 2+3*4"
          className="text-right font-mono text-lg"
          autoFocus
        />
        {result !== null && (
          <div className="mt-2 text-right text-xl font-bold text-blue-600">= {result}</div>
        )}
        {error && <Alert message={error} type="error" className="mt-2" />}
      </div>

      {isScientific && (
        <div className="mb-4">
          <div className="grid grid-cols-5 gap-2">
            {scientificButtons.flat().map((btn) => {
              let onClick;
              let label = btn;
              if (btn === 'π') {
                onClick = () => insertConstant('pi');
                label = 'π';
              } else if (btn === 'e') {
                onClick = () => insertConstant('e');
              } else if (btn === 'x²') {
                onClick = () => insertPower('2');
                label = 'x²';
              } else if (btn === 'x³') {
                onClick = () => insertPower('3');
                label = 'x³';
              } else if (btn === 'x!') {
                onClick = () => insertFactorial();
                label = 'x!';
              } else if (btn === '1/x') {
                onClick = () => setExpression(prev => prev + '1/(');
                label = '1/x';
              } else if (btn === '10^x') {
                onClick = () => insertFunction('10^');
                label = '10^x';
              } else if (btn === 'e^x') {
                onClick = () => insertFunction('exp');
                label = 'e^x';
              } else if (btn === 'sqrt') {
                onClick = insertSqrt;
              } else {
                onClick = () => insertFunction(btn);
              }
              return (
                <Button key={btn} size="small" onClick={onClick} className="h-10 text-xs">
                  {label}
                </Button>
              );
            })}
          </div>
          <div className="mt-2 text-gray-400 text-xs">
            点击函数自动加 '(' 如 sin( ，输入值后补全 ) 。常量 π、e 直接插入。
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {standardButtons.flat().map((btn) => (
          <Button
            key={btn}
            size="large"
            onClick={() => appendValue(btn)}
            className="h-14 text-base"
            type={btn === '=' ? 'primary' : 'default'}
            danger={btn === 'C'}
          >
            {btn}
          </Button>
        ))}
      </div>

      <div className="mt-4 text-gray-500 text-sm">
        支持: + - * / ^ ( ) 及常用函数 (科学模式) 和常量 pi, e<br />
        提示: 角度模式下自动将 sin/cos/tan 的参数转为弧度，如 sin(30) = 0.5
      </div>
    </div>
  );
};

// ===================== 函数绘图（等比例 XY 坐标轴） =====================
const FunctionPlotter: React.FC = () => {
  const [funcExpr, setFuncExpr] = useState('x^2');
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [chartData, setChartData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [yMin, setYMin] = useState<number>(-5);
  const [yMax, setYMax] = useState<number>(5);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(800);

  // ⭐ 默认关闭：原点居中（x 轴永远可见）
  const [autoCenter, setAutoCenter] = useState(false);

  const CONTAINER_H = 384;

  // 监听容器宽度
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const w = el.clientWidth || 800;
      setContainerW(w);
    };
    updateWidth();

    const ro = new ResizeObserver(() => updateWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotFunction = () => {
    setError(null);
    try {
      const expr = funcExpr.trim();

      const xSpan = xMax - xMin;
      if (xSpan <= 0) {
        setError('x max 必须大于 x min');
        setChartData(null);
        return;
      }

      // 等比例：x 每单位像素
      const xUnitPx = containerW / xSpan;
      // y 视野跨度 = 容器高度 / 单位像素
      const ySpan = CONTAINER_H / xUnitPx;
      const halfSpan = ySpan / 2;

      // 采样数据
      const samples = 800;
      const step = xSpan / samples;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i <= samples; i++) {
        const x = xMin + i * step;
        try {
          const y = math.evaluate(expr, { x });
          if (isFinite(y)) points.push({ x, y });
        } catch (e) {
          // skip
        }
      }

      if (points.length === 0) {
        setError('没有有效数据点，请检查函数表达式。示例：x^2, sin(x), x^2 + sin(x)');
        setChartData(null);
        return;
      }

      // ⭐ 计算 y 中心
      let yCenter = 0;   // 默认：原点居中
      if (autoCenter) {
        const ys = points.map((p) => p.y);
        const dataMin = Math.min(...ys);
        const dataMax = Math.max(...ys);
        yCenter = (dataMin + dataMax) / 2;

        // ⭐ 关键：如果 0 不在视野内，则把 yCenter 拉向 0，保证 x 轴可见
        if (yCenter - halfSpan > 0) {
          // 数据全在 0 上方 → 让 yMin = 0
          yCenter = halfSpan;
        } else if (yCenter + halfSpan < 0) {
          // 数据全在 0 下方 → 让 yMax = 0
          yCenter = -halfSpan;
        }
      }

      const newYMin = yCenter - halfSpan;
      const newYMax = yCenter + halfSpan;

      setYMin(newYMin);
      setYMax(newYMax);

      const labels = points.map((p) => p.x);
      const values = points.map((p) => p.y);
      setChartData({
        labels: labels,
        datasets: [
          {
            label: `y = ${funcExpr}`,
            data: values,
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.1)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1,
            fill: false,
          },
        ],
      });
    } catch (err: any) {
      setError(err.message || '函数表达式错误');
      setChartData(null);
    }
  };

  useEffect(() => {
    plotFunction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [funcExpr, xMin, xMax, containerW, autoCenter]);

  // 自定义插件：绘制 XY 坐标轴
  const axisArrowPlugin = {
    id: 'axisArrow',
    afterDraw: (chart: any) => {
      const { ctx, scales, chartArea } = chart;
      if (!scales?.x || !scales?.y) return;

      const xScale = scales.x;
      const yScale = scales.y;

      const x0Pixel = xScale.getPixelForValue(0);
      const y0Pixel = yScale.getPixelForValue(0);

      const x0InRange = x0Pixel >= chartArea.left && x0Pixel <= chartArea.right;
      const y0InRange = y0Pixel >= chartArea.top && y0Pixel <= chartArea.bottom;

      const arrowSize = 8;

      ctx.save();
      ctx.strokeStyle = '#333';
      ctx.fillStyle = '#333';
      ctx.lineWidth = 2;

      // X 轴（沿 y=0）
      if (y0InRange) {
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y0Pixel);
        ctx.lineTo(chartArea.right, y0Pixel);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(chartArea.right, y0Pixel);
        ctx.lineTo(chartArea.right - arrowSize, y0Pixel - arrowSize / 2);
        ctx.lineTo(chartArea.right - arrowSize, y0Pixel + arrowSize / 2);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('x', chartArea.right - 4, y0Pixel + 6);
      }

      // Y 轴（沿 x=0）
      if (x0InRange) {
        ctx.beginPath();
        ctx.moveTo(x0Pixel, chartArea.bottom);
        ctx.lineTo(x0Pixel, chartArea.top);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x0Pixel, chartArea.top);
        ctx.lineTo(x0Pixel - arrowSize / 2, chartArea.top + arrowSize);
        ctx.lineTo(x0Pixel + arrowSize / 2, chartArea.top + arrowSize);
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('y', x0Pixel + 6, chartArea.top + 4);
      }

      // 原点
      if (x0InRange && y0InRange) {
        ctx.beginPath();
        ctx.arc(x0Pixel, y0Pixel, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#333';
        ctx.fill();

        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('O', x0Pixel - 5, y0Pixel + 5);
      }

      ctx.restore();
    },
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false as const,
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        min: xMin,
        max: xMax,
        grid: {
          color: (ctx: any) => {
            if (ctx.tick && ctx.tick.value === 0) return 'transparent';
            return 'rgba(0,0,0,0.06)';
          },
        },
        ticks: {
          color: (ctx: any) => (ctx.tick && ctx.tick.value === 0 ? '#333' : '#666'),
        },
      },
      y: {
        min: yMin,
        max: yMax,
        grid: {
          color: (ctx: any) => {
            if (ctx.tick && ctx.tick.value === 0) return 'transparent';
            return 'rgba(0,0,0,0.06)';
          },
        },
        ticks: {
          color: (ctx: any) => (ctx.tick && ctx.tick.value === 0 ? '#333' : '#666'),
        },
      },
    },
    plugins: {
      legend: { display: true, position: 'top' as const },
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy' as const,
          modifierKey: 'shift' as const,
        },
        zoom: {
          wheel: { enabled: true, speed: 0.05 },
          pinch: { enabled: true },
          mode: 'xy' as const,
        },
        limits: { x: { minRange: 0.1 }, y: { minRange: 0.1 } },
      },
    },
  };

  const xUnitPx = containerW / (xMax - xMin || 1);
  const yUnitPx = CONTAINER_H / (yMax - yMin || 1);

  return (
    <div>
      <Row gutter={16} className="mb-4">
        <Col span={10}>
          <Input
            addonBefore="f(x) ="
            value={funcExpr}
            onChange={(e) => setFuncExpr(e.target.value)}
            placeholder="例如 x^2, sin(x), x^2 + sin(x)"
          />
        </Col>
        <Col span={4}>
          <InputNumber
            value={xMin}
            onChange={(val) => setXMin(val ?? -10)}
            addonBefore="x min"
            step={0.5}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={4}>
          <InputNumber
            value={xMax}
            onChange={(val) => setXMax(val ?? 10)}
            addonBefore="x max"
            step={0.5}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={6}>
          <Space>
            <Tooltip title="关闭时原点居中；开启时让曲线数据居中（仍保证 x 轴可见）">
              <span style={{ fontSize: 13 }}>
                视野 <InfoCircleOutlined style={{ color: '#888' }} />
              </span>
            </Tooltip>
            <Switch
              checked={autoCenter}
              onChange={setAutoCenter}
              checkedChildren="数据"
              unCheckedChildren="原点"
              size="small"
            />
            <Button type="primary" onClick={plotFunction}>
              绘图
            </Button>
          </Space>
        </Col>
      </Row>

      {error && <Alert message={error} type="error" className="mb-4" />}

      <div
        ref={chartContainerRef}
        style={{
          height: CONTAINER_H,
          width: '100%',
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          padding: 8,
          background: '#fff',
        }}
      >
        {chartData ? (
          <Line data={chartData} options={options} plugins={[axisArrowPlugin]} />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#aaa',
            }}
          >
            输入函数表达式后自动绘图
          </div>
        )}
      </div>

      <div className="mt-3 text-gray-500 text-sm">
        🖱️ 滚轮缩放 · Shift+拖动平移 · 坐标轴 1:1 等比例
        <br />
        <span style={{ fontSize: 12, color: '#888' }}>
          当前：x 单位 = {xUnitPx.toFixed(1)}px · y 单位 = {yUnitPx.toFixed(1)}px
          {Math.abs(xUnitPx - yUnitPx) < 0.5 && ' ✅ 等比例'}
        </span>
        <br />
        支持函数: sin, cos, tan, log, ln, sqrt, abs, exp, pi, e, 运算符: + - * / ^
      </div>
    </div>
  );
};

// ===================== 统计工具 =====================
const StatisticsTool: React.FC = () => {
  const [inputData, setInputData] = useState('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
  const [parsedData, setParsedData] = useState<number[]>([]);
  const [stats, setStats] = useState<{
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    count: number;
    sum: number;
  } | null>(null);

  const computeStats = () => {
    try {
      const raw = inputData.split(/[,\s，、]+/).filter(s => s.trim() !== '');
      const nums = raw.map(Number).filter(n => !isNaN(n));
      if (nums.length === 0) {
        alert('请输入有效的数字');
        return;
      }
      setParsedData(nums);
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
      const std = Math.sqrt(variance);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      setStats({ mean, median, std, min, max, count: nums.length, sum });
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    computeStats();
  }, []);

  const chartData = {
    labels: parsedData.map((_, i) => `数据 ${i + 1}`),
    datasets: [
      {
        label: '数据值',
        data: parsedData,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <Row gutter={16} className="mb-4">
        <Col span={18}>
          <Input.TextArea
            rows={3}
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder="输入数据，用逗号、空格或中文逗号分隔，例如: 1, 2, 3, 4, 5"
          />
        </Col>
        <Col span={6}>
          <Button type="primary" onClick={computeStats} block>
            计算统计
          </Button>
        </Col>
      </Row>

      {stats && (
        <Row gutter={16} className="mb-4">
          <Col span={4}><Statistic title="数据量" value={stats.count} /></Col>
          <Col span={4}><Statistic title="总和" value={stats.sum} precision={2} /></Col>
          <Col span={4}><Statistic title="均值" value={stats.mean} precision={2} /></Col>
          <Col span={4}><Statistic title="中位数" value={stats.median} precision={2} /></Col>
          <Col span={4}><Statistic title="标准差" value={stats.std} precision={2} /></Col>
          <Col span={4}><Statistic title="极值" value={`${stats.min} ~ ${stats.max}`} /></Col>
        </Row>
      )}

      {parsedData.length > 0 && (
        <div className="h-80">
          <Bar data={chartData} options={{ maintainAspectRatio: false }} />
        </div>
      )}
    </div>
  );
};

export default Utils; 