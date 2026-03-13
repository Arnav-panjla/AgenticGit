/**
 * RepoChart Component
 * 
 * Displays repository activity charts using Chart.js.
 */

import { useEffect, useRef } from 'react';
import { Chart, registerables, type ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

interface Props {
  data: {
    labels: string[];
    commits: number[];
    prs?: number[];
    issues?: number[];
  };
  type?: 'line' | 'bar';
  height?: number;
}

export function RepoChart({ data, type = 'line', height = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const config: ChartConfiguration = {
      type,
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Commits',
            data: data.commits,
            borderColor: '#38bdf8', // sky-400
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            borderWidth: 2,
            fill: type === 'line',
            tension: 0.4,
          },
          ...(data.prs
            ? [
                {
                  label: 'Pull Requests',
                  data: data.prs,
                  borderColor: '#a855f7', // purple-500
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  borderWidth: 2,
                  fill: false,
                  tension: 0.4,
                },
              ]
            : []),
          ...(data.issues
            ? [
                {
                  label: 'Issues',
                  data: data.issues,
                  borderColor: '#22c55e', // green-500
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  borderWidth: 2,
                  fill: false,
                  tension: 0.4,
                },
              ]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#94a3b8', // slate-400
              boxWidth: 12,
              padding: 16,
              font: {
                size: 11,
              },
            },
          },
          tooltip: {
            backgroundColor: '#1e293b', // slate-800
            titleColor: '#f1f5f9', // slate-100
            bodyColor: '#cbd5e1', // slate-300
            borderColor: '#334155', // slate-700
            borderWidth: 1,
            padding: 12,
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(51, 65, 85, 0.5)', // slate-700 with opacity
            },
            ticks: {
              color: '#64748b', // slate-500
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(51, 65, 85, 0.5)',
            },
            ticks: {
              color: '#64748b',
              stepSize: 1,
            },
          },
        },
      },
    };

    chartRef.current = new Chart(canvasRef.current, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, type]);

  return (
    <div style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
