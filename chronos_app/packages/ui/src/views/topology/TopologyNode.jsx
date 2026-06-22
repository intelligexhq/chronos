import PropTypes from 'prop-types'
import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { useTheme } from '@mui/material/styles'
import { Box, Typography } from '@mui/material'
import { IconRobot, IconPlug, IconTool } from '@tabler/icons-react'

import { NODE_WIDTH, NODE_HEIGHT } from './dagreLayout'

// Per-kind presentation. Colours are picked from the palette at render so they
// track light/dark mode; this map only chooses which palette slot + icon.
const KIND = {
    agent: { icon: IconRobot, paletteKey: 'primary' },
    mcpServer: { icon: IconPlug, paletteKey: 'secondary' },
    tool: { icon: IconTool, paletteKey: 'success' }
}

const hiddenHandle = { opacity: 0, width: 1, height: 1, border: 'none', background: 'transparent' }

/**
 * One node in the topology map. A single component serves all three kinds
 * (agent / MCP server / tool) — the kind is carried on `data.kind` and only
 * changes the icon and accent colour. Read-only: handles exist purely so edges
 * have anchor points, and are visually hidden.
 */
const TopologyNode = ({ data }) => {
    const theme = useTheme()
    const kind = KIND[data.kind] || KIND.tool
    const Icon = kind.icon
    const accent = theme.palette[kind.paletteKey]?.main || theme.palette.primary.main

    return (
        <Box
            sx={{
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[900] + 25}`,
                borderLeft: `4px solid ${accent}`,
                backgroundColor: theme.palette.background.paper,
                boxShadow: data.selected ? `0 0 0 2px ${accent}` : 'none'
            }}
        >
            <Handle type='target' position={Position.Left} style={hiddenHandle} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
                <Icon size={20} stroke={1.8} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography
                    sx={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={data.label}
                >
                    {data.label}
                </Typography>
                <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary, textTransform: 'capitalize' }}>
                    {data.kind === 'mcpServer' ? 'MCP server' : data.kind}
                </Typography>
            </Box>
            <Handle type='source' position={Position.Right} style={hiddenHandle} />
        </Box>
    )
}

TopologyNode.propTypes = {
    data: PropTypes.object
}

export default memo(TopologyNode)
