'use client'

import { useEffect, useRef } from 'react'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  type ChartConfiguration,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
)

export interface TrafficTrendPoint {
  date: string
  impressions: number
  clicks: number
}

export interface RankingPoint {
  label: string
  value: number
  impressions?: number
  clickRate?: number
}

interface TrafficTrendChartProps {
  ariaLabel: string
  points: TrafficTrendPoint[]
}

interface RankingBarChartProps {
  ariaLabel: string
  emptyLabel?: string
  points: RankingPoint[]
  valueLabel: string
}

const impressionColor = 'rgb(2, 132, 199)'
const impressionFill = 'rgba(2, 132, 199, 0.12)'
const clickColor = 'rgb(255, 88, 64)'
const clickFill = 'rgba(255, 88, 64, 0.08)'
const barColor = 'rgba(15, 23, 42, 0.82)'
const gridColor = 'rgba(148, 163, 184, 0.18)'

export function TrafficTrendChart({
  ariaLabel,
  points,
}: TrafficTrendChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const chart = new Chart(canvas, getTrafficTrendConfig(points))

    return () => {
      chart.destroy()
    }
  }, [points])

  return <canvas ref={canvasRef} aria-label={ariaLabel} role="img" />
}

export function RankingBarChart({
  ariaLabel,
  emptyLabel = 'Ingen data å vise.',
  points,
  valueLabel,
}: RankingBarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || points.length === 0) {
      return
    }

    const chart = new Chart(canvas, getRankingBarConfig(points, valueLabel))

    return () => {
      chart.destroy()
    }
  }, [points, valueLabel])

  if (points.length === 0) {
    return (
      <div className="flex h-full min-h-72 items-center justify-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    )
  }

  return <canvas ref={canvasRef} aria-label={ariaLabel} role="img" />
}

function getTrafficTrendConfig(
  points: TrafficTrendPoint[]
): ChartConfiguration<'line', number[], string> {
  return {
    type: 'line',
    data: {
      labels: points.map((point) => formatDateLabel(point.date)),
      datasets: [
        {
          label: 'Visninger',
          data: points.map((point) => point.impressions),
          backgroundColor: impressionFill,
          borderColor: impressionColor,
          borderWidth: 2,
          pointBackgroundColor: 'white',
          pointBorderColor: impressionColor,
          pointBorderWidth: 1.5,
          pointHitRadius: 8,
          pointRadius: 2.5,
          tension: 0.25,
        },
        {
          label: 'Klikk',
          data: points.map((point) => point.clicks),
          backgroundColor: clickFill,
          borderColor: clickColor,
          borderWidth: 2,
          pointBackgroundColor: 'white',
          pointBorderColor: clickColor,
          pointBorderWidth: 1.5,
          pointHitRadius: 8,
          pointRadius: 2.5,
          tension: 0.25,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      responsive: true,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          align: 'end',
          labels: {
            boxHeight: 8,
            boxWidth: 8,
            color: 'rgb(55, 65, 81)',
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatNumber(context.parsed.y ?? 0)}`
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            display: false,
            maxRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            display: false,
            precision: 0,
          },
        },
      },
    },
  }
}

function getRankingBarConfig(
  points: RankingPoint[],
  valueLabel: string
): ChartConfiguration<'bar', number[], string> {
  return {
    type: 'bar',
    data: {
      labels: points.map((point) => truncateLabel(point.label)),
      datasets: [
        {
          label: valueLabel,
          data: points.map((point) => point.value),
          backgroundColor: barColor,
          borderRadius: 4,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title(items) {
              const index = items[0]?.dataIndex ?? 0
              return points[index]?.label ?? ''
            },
            label(context) {
              return `${valueLabel}: ${formatNumber(context.parsed.x ?? 0)}`
            },
            afterLabel(context) {
              const point = points[context.dataIndex]
              if (!point) {
                return ''
              }

              const details: string[] = []
              if (typeof point.impressions === 'number') {
                details.push(`Visninger: ${formatNumber(point.impressions)}`)
              }
              if (typeof point.clickRate === 'number') {
                details.push(`Klikkrate: ${formatPercent(point.clickRate)}`)
              }

              return details
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            color: 'rgb(107, 114, 128)',
            precision: 0,
          },
        },
        y: {
          grid: {
            display: false,
          },
          ticks: {
            color: 'rgb(55, 65, 81)',
          },
        },
      },
    },
  }
}

function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat('nb-NO', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${value}T00:00:00`))
}

function formatNumber(value: number): string {
  return value.toLocaleString('nb-NO')
}

function formatPercent(value: number): string {
  return value.toLocaleString('nb-NO', {
    maximumFractionDigits: 1,
    style: 'percent',
  })
}

function truncateLabel(label: string): string {
  return label.length > 28 ? `${label.slice(0, 25)}...` : label
}
