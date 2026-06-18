import { useMemo, type CSSProperties } from 'react'
import type { ReportPreviewPayload, ReportSheetCell, ReportSheetPreview } from '@/types/report-preview'

function formatCellValue(cell: ReportSheetCell): string {
    if (cell.value === null || cell.value === '') return ''
    if (cell.percent && typeof cell.value === 'number') {
        return `${Math.round(cell.value * 1000) / 10}%`
    }
    if (typeof cell.value === 'number') {
        const rounded = Math.round(cell.value * 10) / 10
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
    }
    return String(cell.value)
}

function cellStyle(cell: ReportSheetCell): CSSProperties {
    const style: CSSProperties = {}
    if (cell.bg) style.backgroundColor = `#${cell.bg}`
    if (cell.fg) style.color = `#${cell.fg}`
    if (cell.bold) style.fontWeight = 600
    if (cell.italic) style.fontStyle = 'italic'
    return style
}

function ReportSheetTable({ sheet }: { sheet: ReportSheetPreview }) {
    const colCount = sheet.headers.length

    const monthRow = useMemo(() => {
        if (!sheet.monthBands?.length) return null
        const cells: (string | null)[] = new Array(colCount).fill(null)
        for (const band of sheet.monthBands) {
            const start = Math.max(0, band.colStart)
            const end = Math.min(colCount - 1, band.colEnd)
            if (start <= end) cells[start] = band.label
        }
        return cells
    }, [sheet.monthBands, colCount])

    return (
        <div className="overflow-auto max-h-[min(65vh,640px)] border border-gray-200 rounded-lg">
            <table className="min-w-full border-collapse text-xs">
                {monthRow && (
                    <thead className="sticky top-0 z-20">
                        <tr>
                            {monthRow.map((label, i) => {
                                const band = sheet.monthBands?.find(
                                    (b) => i >= b.colStart && i <= b.colEnd
                                )
                                const isStart = band && i === band.colStart
                                const span = band ? band.colEnd - band.colStart + 1 : 1
                                if (band && i > band.colStart && i <= band.colEnd) return null
                                return (
                                    <th
                                        key={`month-${i}`}
                                        colSpan={isStart ? span : 1}
                                        className="border border-gray-300 px-2 py-1 text-center text-white font-semibold"
                                        style={{ backgroundColor: '#434343' }}
                                    >
                                        {isStart ? label : ''}
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                )}
                <thead className={`sticky ${monthRow ? 'top-[29px]' : 'top-0'} z-10 bg-gray-100`}>
                    <tr>
                        {sheet.headers.map((header, i) => (
                            <th
                                key={`h-${i}`}
                                className="border border-gray-300 px-2 py-2 text-left font-semibold text-gray-800 whitespace-nowrap"
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sheet.rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={colCount}
                                className="border border-gray-200 px-3 py-8 text-center text-gray-500"
                            >
                                No data for this report.
                            </td>
                        </tr>
                    ) : (
                        sheet.rows.map((row, rowIndex) => {
                            const isEmpty = row.length === 0
                            if (isEmpty) {
                                return (
                                    <tr key={`spacer-${rowIndex}`} className="h-2">
                                        <td colSpan={colCount} className="bg-gray-50" />
                                    </tr>
                                )
                            }
                            return (
                                <tr key={`row-${rowIndex}`} className="hover:bg-gray-50/60">
                                    {sheet.headers.map((_, colIndex) => {
                                        const cell = row[colIndex] ?? { value: '' }
                                        return (
                                            <td
                                                key={`c-${rowIndex}-${colIndex}`}
                                                className="border border-gray-200 px-2 py-1 whitespace-nowrap tabular-nums"
                                                style={cellStyle(cell)}
                                            >
                                                {formatCellValue(cell)}
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })
                    )}
                </tbody>
            </table>
        </div>
    )
}

interface ReportSheetViewerProps {
    report: ReportPreviewPayload | null
    activeSheetIndex?: number
    onSheetIndexChange?: (index: number) => void
}

export function ReportSheetViewer({
    report,
    activeSheetIndex = 0,
    onSheetIndexChange,
}: ReportSheetViewerProps) {
    if (!report) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center text-sm text-gray-500">
                Click <strong>Refresh</strong> to load live report sheets, or select a report card
                below.
            </div>
        )
    }

    const sheet = report.sheets[activeSheetIndex] ?? report.sheets[0]

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{report.title}</h2>
                    <p className="text-xs text-gray-500">
                        {report.weekLabels.length} week(s) · Updated{' '}
                        {new Date(report.generatedAt).toLocaleString()}
                    </p>
                </div>
                {report.sheets.length > 1 && (
                    <div className="flex flex-wrap gap-1">
                        {report.sheets.map((s, i) => (
                            <button
                                key={s.name}
                                type="button"
                                onClick={() => onSheetIndexChange?.(i)}
                                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                                    i === activeSheetIndex
                                        ? 'bg-brand-500 text-white border-brand-500'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                                }`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {sheet && <ReportSheetTable sheet={sheet} />}
        </div>
    )
}
