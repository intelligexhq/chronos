import { useEffect, useRef, useState } from 'react'
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { baseURL } from '@/store/constant'

/**
 * Subscribes to the live MCP topology SSE feed (`GET /api/v1/topology/stream`).
 *
 * The server emits a full `snapshot` event on every change and a `: ping`
 * comment on idle ticks (ignored here). Each snapshot fully replaces the
 * previous one — there is no patch protocol — so consumers just render the
 * latest `snapshot`. Uses `@microsoft/fetch-event-source` (not native
 * EventSource) so the session cookie rides along via fetch credentials and the
 * stream survives a hidden tab.
 *
 * `status` is one of 'connecting' | 'open' | 'closed'. The hook tears the
 * connection down on unmount.
 */
export const useTopologyStream = ({ enabled = true } = {}) => {
    const [snapshot, setSnapshot] = useState(null)
    const [status, setStatus] = useState('connecting')
    const abortRef = useRef(null)

    useEffect(() => {
        if (!enabled) return undefined

        const ctrl = new AbortController()
        abortRef.current = ctrl

        fetchEventSource(`${baseURL}/api/v1/topology/stream`, {
            method: 'GET',
            headers: { 'x-request-from': 'internal' },
            signal: ctrl.signal,
            openWhenHidden: true,
            async onopen(response) {
                if (response.ok && response.headers.get('content-type')?.startsWith(EventStreamContentType)) {
                    setStatus('open')
                    return
                }
                // 4xx/5xx (e.g. topology disabled) — stop retrying by throwing a fatal error.
                throw new Error(`topology stream failed to open: ${response.status}`)
            },
            onmessage(ev) {
                if (ev.event && ev.event !== 'snapshot') return
                if (!ev.data) return
                try {
                    setSnapshot(JSON.parse(ev.data))
                } catch {
                    // ignore a malformed frame; the next tick replaces it
                }
            },
            onclose() {
                setStatus('closed')
            },
            onerror(err) {
                setStatus('closed')
                // Returning (not throwing) lets fetch-event-source back off and
                // retry transient drops; a thrown error from onopen is fatal.
                throw err
            }
        }).catch(() => {
            // Swallow the fatal-abort rejection; status already reflects 'closed'.
        })

        return () => ctrl.abort()
    }, [enabled])

    return { snapshot, status }
}
