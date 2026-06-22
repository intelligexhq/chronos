import PropTypes from 'prop-types'
import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow'

/**
 * Custom topology edge: the line encodes volume (width) and outcome (colour);
 * the request count rides in a circular badge instead of a bare number, so it
 * stays legible over the animated (dashed) line. Mirrors the agentflow canvas
 * pattern of positioning edge content via `EdgeLabelRenderer`.
 *
 * Badge placement depends on the edge kind. Server→tool edges fan out from one
 * server to many tools, so their midpoints bunch together ambiguously — those
 * badges park near the *target* end to tie each count to its tool. Agent→server
 * edges are one aggregate link per pair, so their badge sits at the midpoint,
 * centred on the link.
 */
// Distance left of the target handle to park a target-anchored badge — clear of
// the arrowhead, still on the horizontal run into the node.
const BADGE_TARGET_OFFSET = 34

const TopologyEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data }) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition
    })

    const { color, width, count, active, onSelect, kind } = data || {}

    const atTarget = kind === 'server-tool'
    const badgeX = atTarget ? targetX - BADGE_TARGET_OFFSET : labelX
    const badgeY = atTarget ? targetY : labelY

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    stroke: color,
                    strokeWidth: width,
                    opacity: active ? 0.9 : 0.4,
                    strokeDasharray: active ? undefined : '4 4'
                }}
            />
            {count > 0 && (
                <EdgeLabelRenderer>
                    <button
                        type='button'
                        className='nodrag nopan'
                        onClick={(e) => {
                            e.stopPropagation()
                            onSelect?.()
                        }}
                        title={`${count} request${count === 1 ? '' : 's'} in window`}
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${badgeX}px, ${badgeY}px)`,
                            minWidth: 22,
                            height: 22,
                            padding: '0 6px',
                            border: 'none',
                            borderRadius: 11,
                            background: color,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 700,
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            // White ring lifts the badge off the moving line.
                            boxShadow: '0 0 0 2px #fff',
                            pointerEvents: 'all',
                            cursor: 'pointer'
                        }}
                    >
                        {count}
                    </button>
                </EdgeLabelRenderer>
            )}
        </>
    )
}

TopologyEdge.propTypes = {
    id: PropTypes.string,
    sourceX: PropTypes.number,
    sourceY: PropTypes.number,
    targetX: PropTypes.number,
    targetY: PropTypes.number,
    sourcePosition: PropTypes.any,
    targetPosition: PropTypes.any,
    markerEnd: PropTypes.string,
    data: PropTypes.object
}

export default memo(TopologyEdge)
