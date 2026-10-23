import { lazy, Suspense, useMemo } from 'react'
import type { ApexOptions } from 'apexcharts'
import { LoadingState } from '@/components/ui/States'

// ApexCharts pesa ~150 kB gzip: se carga recién cuando una pantalla muestra un gráfico.
// react-apexcharts es CommonJS: en desarrollo el componente llega envuelto en otro `default`.
const ApexChart = lazy(async () => {
  const module = await import('react-apexcharts')
  const component = module.default as typeof module.default | { default: typeof module.default }
  return { default: 'default' in component ? component.default : component }
})

const TABLER_COLORS = ['primary', 'green', 'orange', 'purple', 'cyan', 'red', 'yellow', 'pink']

/** Colores de Tabler leídos de sus variables CSS (los atributos SVG no aceptan `var(--…)`). */
function tablerTheme() {
  const style = getComputedStyle(document.body)
  const color = (name: string) => style.getPropertyValue(`--tblr-${name}`).trim()
  return { colors: TABLER_COLORS.map(color).filter(Boolean), border: color('border-color') || '#e6e7e9' }
}

interface ChartProps {
  type: 'bar' | 'line' | 'area' | 'donut'
  series: ApexOptions['series']
  options?: ApexOptions
  height?: number
}

/** Gráfico de ApexCharts con el estilo de Tabler (fuente, colores, grilla, sin barra de herramientas). */
export function Chart({ type, series, options, height = 280 }: ChartProps) {
  const merged = useMemo<ApexOptions>(() => {
    const theme = tablerTheme()
    return {
      colors: theme.colors,
      dataLabels: { enabled: false },
      grid: { strokeDashArray: 4, borderColor: theme.border },
      legend: { position: 'bottom' },
      tooltip: { theme: 'light' },
      ...options,
      chart: {
        fontFamily: 'inherit',
        toolbar: { show: false },
        animations: { enabled: false },
        parentHeightOffset: 0,
        ...options?.chart,
      },
    }
  }, [options])

  return (
    <Suspense fallback={<LoadingState label="Cargando gráfico…" />}>
      <ApexChart type={type} series={series} options={merged} height={height} />
    </Suspense>
  )
}
