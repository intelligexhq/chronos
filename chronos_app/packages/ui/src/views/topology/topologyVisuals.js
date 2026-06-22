// Shared visual encoding for topology edges, so the graph and the details
// drawer agree on what a colour/width means.

export const successRatio = (stats) => (stats && stats.count ? stats.successCount / stats.count : 1)

/** Green when all calls succeeded, amber under light error rates, red otherwise. */
export const ratioColor = (ratio, theme) => {
    if (ratio >= 0.999) return theme.palette.success.main
    if (ratio >= 0.9) return theme.palette.warning.main
    return theme.palette.error.main
}

/** Idle edges (no calls in the window) are grey; active edges encode success rate. */
export const edgeColorForStats = (stats, theme) => {
    if (!stats || !stats.count) return theme.palette.grey[500]
    return ratioColor(successRatio(stats), theme)
}

/** Stroke width grows with volume (log-scaled) and is capped so heavy edges stay sane. */
export const edgeStrokeWidth = (count) => {
    if (!count) return 1
    return Math.min(1.5 + Math.log2(count + 1) * 1.2, 9)
}
