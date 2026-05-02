import { lazy } from 'react'

// project imports
import Loadable from '@/ui-component/loading/Loadable'
import MinimalLayout from '@/layout/MinimalLayout'
import { RequireAuth } from '@/routes/RequireAuth'

// canvas routing
const AgentflowCanvas = Loadable(lazy(() => import('@/views/agentflowcanvas/Canvas')))
const AgentflowTemplateCanvas = Loadable(lazy(() => import('@/views/agentflowcanvas/TemplateCanvas')))

// ==============================|| CANVAS ROUTING ||============================== //

const CanvasRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/canvas',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <AgentflowCanvas />
                </RequireAuth>
            )
        },
        {
            path: '/canvas/:id',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <AgentflowCanvas />
                </RequireAuth>
            )
        },
        {
            path: '/template/:id',
            element: (
                <RequireAuth permission={'templates:marketplace,templates:custom'}>
                    <AgentflowTemplateCanvas />
                </RequireAuth>
            )
        }
    ]
}

export default CanvasRoutes
