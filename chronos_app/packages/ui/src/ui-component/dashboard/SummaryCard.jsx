import PropTypes from 'prop-types'
import { Card, CardContent, Grid, Skeleton, Typography, useTheme } from '@mui/material'

/**
 * Compact summary card for dashboard-style metric tiles. Used by the global
 * Cost Dashboard and the per-agent Metrics tab — keep behavior in sync.
 */
const SummaryCard = ({ title, value, loading, color, onClick }) => {
    const theme = useTheme()
    const colorMap = {
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main
    }

    return (
        <Grid item xs={6} sm={4} md={2.4}>
            <Card
                variant='outlined'
                sx={{ height: '100%', ...(onClick && { cursor: 'pointer', '&:hover': { borderColor: theme.palette.primary.main } }) }}
                onClick={onClick}
            >
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                    <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}
                    >
                        {title}
                    </Typography>
                    {loading ? (
                        <Skeleton width='60%' height={32} />
                    ) : (
                        <Typography variant='h5' sx={{ mt: 0.5, fontWeight: 600, color: color ? colorMap[color] : 'text.primary' }}>
                            {value}
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Grid>
    )
}

SummaryCard.propTypes = {
    title: PropTypes.string,
    value: PropTypes.string,
    loading: PropTypes.bool,
    color: PropTypes.string,
    onClick: PropTypes.func
}

export default SummaryCard
