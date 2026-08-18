import React from 'react';
import { QuestionVisual, TableData, NumberLineData, CoordinatePlotData, MultiTableData, DotPlotData, BarChartData } from '../../types/quiz';

interface Props {
  visual: QuestionVisual;
}

function DataTable({ data, caption }: { data: TableData; caption?: string }) {
  return (
    <div className="my-4">
      <div className="overflow-x-auto">
        <table className="border-collapse border-2 border-gray-800 text-center min-w-[200px]">
          <thead>
            <tr className="bg-gray-100">
              {data.headers.map((header, i) => (
                <th
                  key={i}
                  className="border-2 border-gray-800 px-6 py-3 text-base font-bold text-gray-900"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="border-2 border-gray-800 px-6 py-3 text-base font-mono text-gray-900"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <p className="mt-2 text-sm text-gray-600 italic">{caption}</p>
      )}
    </div>
  );
}

function HorizontalNumberLine({ data, caption }: { data: NumberLineData; caption?: string }) {
  const width = 400;
  const height = 80;
  const padding = 40;
  const lineY = 45;
  const range = data.max - data.min;
  const tickCount = Math.min(range + 1, 11);
  const tickStep = range / (tickCount - 1);

  const xPos = (value: number) => padding + ((value - data.min) / range) * (width - 2 * padding);

  return (
    <div className="my-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[500px] h-auto">
        <line
          x1={padding - 10}
          y1={lineY}
          x2={width - padding + 10}
          y2={lineY}
          stroke="#1f2937"
          strokeWidth="2"
        />
        <polygon
          points={`${padding - 15},${lineY} ${padding - 5},${lineY - 5} ${padding - 5},${lineY + 5}`}
          fill="#1f2937"
        />
        <polygon
          points={`${width - padding + 15},${lineY} ${width - padding + 5},${lineY - 5} ${width - padding + 5},${lineY + 5}`}
          fill="#1f2937"
        />

        {Array.from({ length: tickCount }, (_, i) => {
          const value = data.min + i * tickStep;
          const x = xPos(value);
          return (
            <g key={`tick-${i}`}>
              <line x1={x} y1={lineY - 6} x2={x} y2={lineY + 6} stroke="#374151" strokeWidth="1.5" />
              <text x={x} y={lineY + 20} textAnchor="middle" className="text-xs" fill="#4b5563" fontSize="11">
                {Number.isInteger(value) ? value : value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {data.points.map((point, i) => {
          const x = xPos(point.value);
          return (
            <g key={`point-${i}`}>
              <circle cx={x} cy={lineY} r="6" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />
              {point.label && (
                <text x={x} y={lineY - 14} textAnchor="middle" fill="#1e40af" fontSize="11" fontWeight="bold">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {caption && (
        <p className="mt-2 text-sm text-gray-600 italic">{caption}</p>
      )}
    </div>
  );
}

function VerticalNumberLine({ data, caption }: { data: NumberLineData; caption?: string }) {
  const width = 120;
  const height = 300;
  const padding = 30;
  const lineX = 50;
  const range = data.max - data.min;
  const tickCount = Math.min(range + 1, 13);
  const tickStep = range / (tickCount - 1);

  const yPos = (value: number) => padding + ((data.max - value) / range) * (height - 2 * padding);

  return (
    <div className="my-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[140px] h-auto">
        <line x1={lineX} y1={padding - 10} x2={lineX} y2={height - padding + 10} stroke="#1f2937" strokeWidth="2" />
        <polygon points={`${lineX},${padding - 15} ${lineX - 5},${padding - 5} ${lineX + 5},${padding - 5}`} fill="#1f2937" />
        <polygon points={`${lineX},${height - padding + 15} ${lineX - 5},${height - padding + 5} ${lineX + 5},${height - padding + 5}`} fill="#1f2937" />

        {Array.from({ length: tickCount }, (_, i) => {
          const value = data.min + i * tickStep;
          const y = yPos(value);
          return (
            <g key={`tick-${i}`}>
              <line x1={lineX - 6} y1={y} x2={lineX + 6} y2={y} stroke="#374151" strokeWidth="1.5" />
              <text x={lineX - 12} y={y + 4} textAnchor="end" fill="#4b5563" fontSize="11">
                {Number.isInteger(value) ? value : value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {data.points.map((point, i) => {
          const y = yPos(point.value);
          return (
            <g key={`point-${i}`}>
              <circle cx={lineX} cy={y} r="6" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />
              {point.label && (
                <text x={lineX + 14} y={y + 4} textAnchor="start" fill="#1e40af" fontSize="11" fontWeight="bold">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {caption && (
        <p className="mt-2 text-sm text-gray-600 italic">{caption}</p>
      )}
    </div>
  );
}

function NumberLine({ data, caption }: { data: NumberLineData; caption?: string }) {
  const isVertical = caption?.toLowerCase().includes('vertical');
  if (isVertical) {
    return <VerticalNumberLine data={data} caption={caption} />;
  }
  return <HorizontalNumberLine data={data} caption={caption} />;
}

function CoordinatePlot({ data, caption }: { data: CoordinatePlotData; caption?: string }) {
  const width = 320;
  const height = 320;
  const padding = 50;
  const plotWidth = width - 2 * padding;
  const plotHeight = height - 2 * padding;

  const xValues = data.points.map(p => p.x);
  const yValues = data.points.map(p => p.y);
  const xMin = Math.min(0, ...xValues);
  const xMax = Math.max(...xValues, 1);
  const yMin = Math.min(0, ...yValues);
  const yMax = Math.max(...yValues, 1);

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const xPad = xRange * 0.15;
  const yPad = yRange * 0.15;
  const adjXMin = xMin - xPad;
  const adjXMax = xMax + xPad;
  const adjYMin = yMin - yPad;
  const adjYMax = yMax + yPad;
  const adjXRange = adjXMax - adjXMin;
  const adjYRange = adjYMax - adjYMin;

  const toSvgX = (x: number) => padding + ((x - adjXMin) / adjXRange) * plotWidth;
  const toSvgY = (y: number) => padding + plotHeight - ((y - adjYMin) / adjYRange) * plotHeight;

  const xTickStep = Math.ceil(xRange / 6) || 1;
  const yTickStep = Math.ceil(yRange / 6) || 1;
  const xTicks: number[] = [];
  const yTicks: number[] = [];

  for (let v = Math.ceil(xMin / xTickStep) * xTickStep; v <= xMax; v += xTickStep) {
    xTicks.push(v);
  }
  for (let v = Math.ceil(yMin / yTickStep) * yTickStep; v <= yMax; v += yTickStep) {
    yTicks.push(v);
  }

  return (
    <div className="my-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[360px] h-auto border border-gray-200 rounded bg-white">
        {/* Grid lines */}
        {xTicks.map(v => (
          <line key={`gx-${v}`} x1={toSvgX(v)} y1={padding} x2={toSvgX(v)} y2={padding + plotHeight} stroke="#e5e7eb" strokeWidth="1" />
        ))}
        {yTicks.map(v => (
          <line key={`gy-${v}`} x1={padding} y1={toSvgY(v)} x2={padding + plotWidth} y2={toSvgY(v)} stroke="#e5e7eb" strokeWidth="1" />
        ))}

        {/* Axes */}
        {adjYMin <= 0 && adjYMax >= 0 && (
          <line x1={padding} y1={toSvgY(0)} x2={padding + plotWidth} y2={toSvgY(0)} stroke="#374151" strokeWidth="1.5" />
        )}
        {adjXMin <= 0 && adjXMax >= 0 && (
          <line x1={toSvgX(0)} y1={padding} x2={toSvgX(0)} y2={padding + plotHeight} stroke="#374151" strokeWidth="1.5" />
        )}

        {/* Tick labels */}
        {xTicks.map(v => (
          <text key={`lx-${v}`} x={toSvgX(v)} y={padding + plotHeight + 18} textAnchor="middle" fontSize="11" fill="#4b5563">
            {v}
          </text>
        ))}
        {yTicks.map(v => (
          <text key={`ly-${v}`} x={padding - 10} y={toSvgY(v) + 4} textAnchor="end" fontSize="11" fill="#4b5563">
            {v}
          </text>
        ))}

        {/* Axis labels */}
        <text x={padding + plotWidth / 2} y={height - 8} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="bold">
          {data.xLabel || 'x'}
        </text>
        <text x={12} y={padding + plotHeight / 2} textAnchor="middle" fontSize="12" fill="#1f2937" fontWeight="bold" transform={`rotate(-90, 12, ${padding + plotHeight / 2})`}>
          {data.yLabel || 'y'}
        </text>

        {/* Points */}
        {data.points.map((point, i) => (
          <g key={`p-${i}`}>
            <circle cx={toSvgX(point.x)} cy={toSvgY(point.y)} r="5" fill="#2563eb" stroke="#1e40af" strokeWidth="1.5" />
            {point.label && (
              <text x={toSvgX(point.x) + 8} y={toSvgY(point.y) - 8} fontSize="10" fill="#1e40af" fontWeight="bold">
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
      {caption && (
        <p className="mt-2 text-sm text-gray-600 italic">{caption}</p>
      )}
    </div>
  );
}

function MultiTable({ data, caption }: { data: MultiTableData; caption?: string }) {
  return (
    <div className="my-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.tables.map((table, idx) => (
          <div key={idx}>
            <p className="text-sm font-bold text-gray-800 mb-1">{table.label}</p>
            <div className="overflow-x-auto">
              <table className="border-collapse border-2 border-gray-800 text-center min-w-[120px]">
                <thead>
                  <tr className="bg-gray-100">
                    {table.headers.map((header, i) => (
                      <th
                        key={i}
                        className="border-2 border-gray-800 px-4 py-2 text-sm font-bold text-gray-900"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="border-2 border-gray-800 px-4 py-2 text-sm font-mono text-gray-900"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      {caption && (
        <p className="mt-2 text-sm text-gray-600 italic">{caption}</p>
      )}
    </div>
  );
}

function DotPlot({ data, caption }: { data: DotPlotData; caption?: string }) {
  const width = 400;
  const height = 120;
  const padding = 40;
  const lineY = 80;

  const values = data.values;
  const min = data.min ?? Math.min(...values);
  const max = data.max ?? Math.max(...values);
  const range = max - min || 1;

  const xPos = (value: number) => padding + ((value - min) / range) * (width - 2 * padding);

  // Count frequency of each value
  const freq: Record<number, number> = {};
  for (const v of values) {
    freq[v] = (freq[v] || 0) + 1;
  }

  const tickCount = Math.min(range + 1, 15);
  const tickStep = range / (tickCount - 1);

  return (
    <div className="my-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[500px] h-auto">
        {/* Main line */}
        <line x1={padding} y1={lineY} x2={width - padding} y2={lineY} stroke="#1f2937" strokeWidth="2" />

        {/* Tick marks */}
        {Array.from({ length: tickCount }, (_, i) => {
          const value = min + i * tickStep;
          const x = xPos(value);
          return (
            <g key={`tick-${i}`}>
              <line x1={x} y1={lineY - 4} x2={x} y2={lineY + 4} stroke="#374151" strokeWidth="1.5" />
              <text x={x} y={lineY + 18} textAnchor="middle" fontSize="10" fill="#4b5563">
                {Number.isInteger(value) ? value : value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Dots stacked */}
        {Object.entries(freq).map(([val, count]) => {
          const x = xPos(Number(val));
          return Array.from({ length: count }, (_, i) => (
            <circle
              key={`dot-${val}-${i}`}
              cx={x}
              cy={lineY - 10 - i * 12}
              r="5"
              fill="#2563eb"
              stroke="#1e40af"
              strokeWidth="1"
            />
          ));
        })}
      </svg>
      {data.label && (
        <p className="text-center text-sm font-medium text-gray-700 mt-1">{data.label}</p>
      )}
      {caption && (
        <p className="mt-1 text-sm text-gray-600 italic">{caption}</p>
      )}
    </div>
  );
}

function BarChart({ data, caption }: { data: BarChartData; caption?: string }) {
  const width = 360;
  const barAreaHeight = 180;
  const padding = { top: 20, right: 20, bottom: 50, left: 50 };
  const totalHeight = barAreaHeight + padding.top + padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = barAreaHeight;

  const maxVal = Math.max(...data.values, 1);
  const barWidth = Math.min(40, plotWidth / data.categories.length - 8);
  const gap = (plotWidth - barWidth * data.categories.length) / (data.categories.length + 1);

  const yScale = (v: number) => padding.top + plotHeight - (v / maxVal) * plotHeight;
  const yTicks = 5;
  const yStep = Math.ceil(maxVal / yTicks);

  return (
    <div className="my-4">
      <svg viewBox={`0 0 ${width} ${totalHeight}`} className="w-full max-w-[400px] h-auto border border-gray-200 rounded bg-white">
        {/* Y axis */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + plotHeight} stroke="#374151" strokeWidth="1.5" />
        {/* X axis */}
        <line x1={padding.left} y1={padding.top + plotHeight} x2={width - padding.right} y2={padding.top + plotHeight} stroke="#374151" strokeWidth="1.5" />

        {/* Y grid + labels */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const val = i * yStep;
          if (val > maxVal * 1.1) return null;
          const y = yScale(val);
          return (
            <g key={`ygrid-${i}`}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#4b5563">{val}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.categories.map((cat, i) => {
          const x = padding.left + gap + i * (barWidth + gap);
          const barHeight = (data.values[i] / maxVal) * plotHeight;
          const y = padding.top + plotHeight - barHeight;
          return (
            <g key={`bar-${i}`}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill="#3b82f6" rx="2" />
              <text x={x + barWidth / 2} y={padding.top + plotHeight + 14} textAnchor="middle" fontSize="10" fill="#1f2937">
                {cat}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        {data.xLabel && (
          <text x={padding.left + plotWidth / 2} y={totalHeight - 5} textAnchor="middle" fontSize="11" fill="#1f2937" fontWeight="bold">
            {data.xLabel}
          </text>
        )}
        {data.yLabel && (
          <text x={14} y={padding.top + plotHeight / 2} textAnchor="middle" fontSize="11" fill="#1f2937" fontWeight="bold" transform={`rotate(-90, 14, ${padding.top + plotHeight / 2})`}>
            {data.yLabel}
          </text>
        )}
      </svg>
      {caption && (
        <p className="mt-2 text-sm text-gray-600 italic">{caption}</p>
      )}
    </div>
  );
}

export function MathVisual({ visual }: Props) {
  if (!visual || !visual.data) return null;

  switch (visual.type) {
    case 'table':
      return <DataTable data={visual.data as TableData} caption={visual.caption} />;
    case 'multi_table':
      return <MultiTable data={visual.data as MultiTableData} caption={visual.caption} />;
    case 'number_line':
      return <NumberLine data={visual.data as NumberLineData} caption={visual.caption} />;
    case 'coordinate_plot':
      return <CoordinatePlot data={visual.data as CoordinatePlotData} caption={visual.caption} />;
    case 'dot_plot':
      return <DotPlot data={visual.data as DotPlotData} caption={visual.caption} />;
    case 'bar_chart':
      return <BarChart data={visual.data as BarChartData} caption={visual.caption} />;
    case 'unavailable':
      return <VisualUnavailable />;
    default:
      return null;
  }
}

function VisualUnavailable() {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm text-gray-500">Data visualization not available for this question</p>
    </div>
  );
}
