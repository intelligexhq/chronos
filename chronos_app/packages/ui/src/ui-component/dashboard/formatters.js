/** Formats milliseconds to human-readable. */
export const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
}

/** Formats cost with currency code prefix. */
export const formatCost = (cost, currency = 'USD') => {
    if (cost === 0) return `${currency} 0.00`
    if (cost < 0.01) return `${currency} <0.01`
    return `${currency} ${cost.toFixed(2)}`
}

/** Formats large counts with K/M suffixes. */
export const formatNumber = (n) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return String(n)
}

/** Formats a date label for chart X-axes (handles intra-day timestamps too). */
export const formatDateLabel = (dateStr) => {
    if (!dateStr) return ''
    if (dateStr.includes('T')) {
        return dateStr.split('T')[1]
    }
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
