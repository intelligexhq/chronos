import PropTypes from 'prop-types'
import { Card, CardContent, Skeleton, Typography } from '@mui/material'

/**
 * Outlined card wrapper for a single chart. Renders a skeleton in place of
 * children when `loading`. Shared between the global Cost Dashboard and the
 * per-agent Metrics tab.
 */
const ChartCard = ({ title, loading, children }) => {
    return (
        <Card variant='outlined' sx={{ mb: '4px' }}>
            <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant='subtitle2' sx={{ mb: 1, fontWeight: 600 }}>
                    {title}
                </Typography>
                {loading ? <Skeleton variant='rectangular' height={140} sx={{ borderRadius: 1 }} /> : children}
            </CardContent>
        </Card>
    )
}

ChartCard.propTypes = {
    title: PropTypes.string,
    loading: PropTypes.bool,
    children: PropTypes.node
}

export default ChartCard
