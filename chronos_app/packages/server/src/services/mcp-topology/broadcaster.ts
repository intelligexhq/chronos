import { Response } from 'express'
import { createModuleLogger } from '../../utils/logger'

const logger = createModuleLogger('topologyBroadcaster')

/**
 * Multi-subscriber Server-Sent-Events fan-out for the topology stream.
 *
 * Deliberately separate from `SSEStreamer` (which is keyed per `chatId` and
 * single-subscriber per chat): here many browser tabs subscribe to one shared
 * feed and every connected client receives the same broadcast. The aggregator
 * polls the audit table on an interval and hands each new snapshot to
 * `broadcast()`; idle ticks send a comment heartbeat to keep proxies from
 * closing the connection.
 */
export class TopologyBroadcaster {
    private clients = new Set<Response>()

    /**
     * Register an SSE client. Sets the streaming headers, emits an optional
     * priming snapshot immediately, and wires teardown on socket close.
     */
    public addClient(res: Response, primeSnapshot?: string): void {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders?.()

        this.clients.add(res)

        if (primeSnapshot) this.writeSnapshot(res, primeSnapshot)

        const remove = () => {
            this.clients.delete(res)
        }
        res.on('close', remove)
        res.on('error', remove)
    }

    /** Push a snapshot to every connected client. */
    public broadcast(serializedSnapshot: string): void {
        for (const res of this.clients) {
            this.writeSnapshot(res, serializedSnapshot)
        }
    }

    /** Comment line that keeps idle connections alive without delivering data. */
    public heartbeat(): void {
        for (const res of this.clients) {
            try {
                res.write(': ping\n\n')
            } catch {
                this.clients.delete(res)
            }
        }
    }

    /** End all open streams — called on shutdown. */
    public closeAll(): void {
        for (const res of this.clients) {
            try {
                res.end()
            } catch {
                // already closed
            }
        }
        this.clients.clear()
    }

    public clientCount(): number {
        return this.clients.size
    }

    private writeSnapshot(res: Response, serializedSnapshot: string): void {
        try {
            res.write(`event: snapshot\ndata: ${serializedSnapshot}\n\n`)
        } catch (error) {
            logger.warn(`failed writing to topology client, dropping: ${(error as Error)?.message}`)
            this.clients.delete(res)
        }
    }
}
