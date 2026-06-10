import { validateOpenAICompatibleEndpointURL } from './utils'

describe('validateOpenAICompatibleEndpointURL', () => {
    describe('accepts valid endpoint URLs', () => {
        it.each([
            'https://openrouter.ai/api/v1',
            'http://localhost:11434/v1',
            'http://localhost:8080/v1',
            'https://api.together.xyz/v1',
            'https://api.groq.com/openai/v1',
            'https://api.deepseek.com',
            'https://api.openai.com/v1',
            'https://chronos.example.com/api/v1' // self-hosted proxy
        ])('accepts %s', (url) => {
            expect(validateOpenAICompatibleEndpointURL(url, '/chat/completions')).toBe(url)
        })
    })

    describe('normalises common formatting', () => {
        it('trims surrounding whitespace', () => {
            expect(validateOpenAICompatibleEndpointURL('  https://openrouter.ai/api/v1  ', '/chat/completions')).toBe(
                'https://openrouter.ai/api/v1'
            )
        })
        it('strips a trailing slash', () => {
            expect(validateOpenAICompatibleEndpointURL('https://openrouter.ai/api/v1/', '/chat/completions')).toBe(
                'https://openrouter.ai/api/v1'
            )
        })
        it('strips multiple trailing slashes', () => {
            expect(validateOpenAICompatibleEndpointURL('https://openrouter.ai/api/v1///', '/chat/completions')).toBe(
                'https://openrouter.ai/api/v1'
            )
        })
    })

    describe('treats empty input as "use cloud default"', () => {
        it.each([undefined, null, '', '   '])('returns empty string for %p', (raw) => {
            expect(validateOpenAICompatibleEndpointURL(raw as any, '/chat/completions')).toBe('')
        })
    })

    describe('rejects malformed URLs', () => {
        it('rejects garbage strings', () => {
            expect(() => validateOpenAICompatibleEndpointURL('not a url', '/chat/completions')).toThrow(/not a valid URL/i)
        })
        it('rejects bare protocol', () => {
            expect(() => validateOpenAICompatibleEndpointURL('https:/', '/chat/completions')).toThrow(/not a valid URL/i)
        })
        it('rejects non-http schemes', () => {
            expect(() => validateOpenAICompatibleEndpointURL('ftp://example.com/v1', '/chat/completions')).toThrow(/http or https/i)
        })
    })

    describe('OpenRouter-specific shape (their marketing site serves 404 HTML for wrong paths)', () => {
        it.each([
            'https://openrouter.ai',
            'https://openrouter.ai/',
            'https://openrouter.ai/api',
            'https://openrouter.ai/api/',
            'https://openrouter.ai/v1',
            'https://openrouter.ai/api/v1/dd',
            'https://openrouter.ai/api/v2'
        ])('rejects %s — must be exactly /api/v1', (url) => {
            expect(() => validateOpenAICompatibleEndpointURL(url, '/chat/completions')).toThrow(/openrouter/i)
        })
        it('accepts https://openrouter.ai/api/v1', () => {
            expect(validateOpenAICompatibleEndpointURL('https://openrouter.ai/api/v1', '/chat/completions')).toBe(
                'https://openrouter.ai/api/v1'
            )
        })
    })

    describe('accepts bare-hostname URLs for providers that use them (DeepSeek)', () => {
        it('accepts https://api.deepseek.com without a path', () => {
            expect(validateOpenAICompatibleEndpointURL('https://api.deepseek.com', '/chat/completions')).toBe('https://api.deepseek.com')
        })
    })

    describe('rejects accidental SDK-suffix duplication', () => {
        it('rejects /chat/completions appended to a chat endpoint URL', () => {
            expect(() => validateOpenAICompatibleEndpointURL('https://api.openai.com/v1/chat/completions', '/chat/completions')).toThrow(
                /do NOT include "\/chat\/completions"/i
            )
        })
        it('rejects /chat/completions/ (trailing slash variant)', () => {
            expect(() => validateOpenAICompatibleEndpointURL('https://api.openai.com/v1/chat/completions/', '/chat/completions')).toThrow(
                /do NOT include "\/chat\/completions"/i
            )
        })
        it('rejects /embeddings appended to an embeddings endpoint URL', () => {
            expect(() => validateOpenAICompatibleEndpointURL('https://api.openai.com/v1/embeddings', '/embeddings')).toThrow(
                /do NOT include "\/embeddings"/i
            )
        })
    })

    describe('error messages name the user-supplied input', () => {
        it('echoes the bad URL back so the user can spot the typo (OpenRouter)', () => {
            expect(() => validateOpenAICompatibleEndpointURL('https://openrouter.ai/api', '/chat/completions')).toThrow(
                /"https:\/\/openrouter\.ai\/api"/
            )
        })
        it('suggests the corrected URL when the suffix was accidentally included', () => {
            expect(() => validateOpenAICompatibleEndpointURL('https://api.openai.com/v1/chat/completions', '/chat/completions')).toThrow(
                /Expected: "https:\/\/api\.openai\.com\/v1"/
            )
        })

        it('uses friendly "I received:" phrasing in the OpenRouter-specific error', () => {
            expect(() => validateOpenAICompatibleEndpointURL('https://openrouter.ai/api', '/chat/completions')).toThrow(
                /note: \/api\/v1\)\. I received: "https:\/\/openrouter\.ai\/api"/
            )
        })
    })
})
