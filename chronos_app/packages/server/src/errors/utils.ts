type ErrorWithMessage = {
    message: string
}

const isErrorWithMessage = (error: unknown): error is ErrorWithMessage => {
    return (
        typeof error === 'object' && error !== null && 'message' in error && typeof (error as Record<string, unknown>).message === 'string'
    )
}

const toErrorWithMessage = (maybeError: unknown): ErrorWithMessage => {
    if (isErrorWithMessage(maybeError)) return maybeError

    try {
        return new Error(JSON.stringify(maybeError))
    } catch {
        // fallback in case there's an error stringifying the maybeError
        // like with circular references for example.
        return new Error(String(maybeError))
    }
}

/**
 * Replace an HTML payload-in-an-error-message with a clean explanation.
 *
 * When a downstream HTTP provider returns a non-JSON error body (e.g. the
 * OpenRouter marketing site returning Next.js 404 HTML because the user
 * typed the wrong endpoint URL), some SDK error-stringifiers embed the
 * raw HTML in `error.message`. That HTML then ends up rendered verbatim
 * in the chat widget — useless to the user and visually broken.
 *
 * This sanitizer detects the HTML and replaces it with a short actionable
 * line. A leading HTTP status code (e.g. "404 ") is preserved if present.
 */
const cleanHtmlPayload = (message: string): string => {
    const match = message.match(/^(?<prefix>\d{3}\s+)?(?:<!doctype\s+html|<html\b|<!DOCTYPE\s+html)/i)
    if (!match) return message
    const status = match.groups?.prefix?.trim() ?? ''
    const statusHint = status ? `HTTP ${status} — ` : ''
    return `${statusHint}provider returned an HTML response instead of JSON. The endpoint URL is most likely wrong; check the Endpoint URL on the model node.`
}

export const getErrorMessage = (error: unknown): string => {
    const rawMessage = toErrorWithMessage(error).message
    const message = cleanHtmlPayload(rawMessage)
    if (typeof error === 'object' && error !== null && 'cause' in error && error.cause) {
        const causeMsg = getErrorMessage(error.cause)
        // Suppress duplication when the wrapper already embeds the cause's message.
        // The common pattern is `throw new Error(\`prefix: \${cause.message}\`, { cause })`
        // — the wrapper is a strict superset, not equal, so a simple `!==` check let
        // both copies through (chat widget showed "Error: X [Cause: X]").
        if (causeMsg && !message.includes(causeMsg)) {
            return `${message} [Cause: ${causeMsg}]`
        }
    }
    return message
}
