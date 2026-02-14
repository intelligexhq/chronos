/**
 * Jest setup file for components package
 * Provides Web API polyfills and global mocks for ESM compatibility
 */

// Web API polyfills for packages that expect browser/modern Node APIs
const { ReadableStream, WritableStream, TransformStream } = require('stream/web')
const { Blob, File } = require('buffer')
const { TextEncoder, TextDecoder } = require('util')

// Set globals
global.ReadableStream = ReadableStream
global.WritableStream = WritableStream
global.TransformStream = TransformStream
global.Blob = Blob
global.File = File
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock fetch if not available
if (typeof global.fetch === 'undefined') {
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve('')
        })
    )
}

// Mock Request/Response for packages that use them
if (typeof global.Request === 'undefined') {
    global.Request = class Request {
        constructor(url, options = {}) {
            this.url = url
            this.method = options.method || 'GET'
            this.headers = options.headers || {}
            this.body = options.body
        }
    }
}

if (typeof global.Response === 'undefined') {
    global.Response = class Response {
        constructor(body, options = {}) {
            this.body = body
            this.status = options.status || 200
            this.ok = this.status >= 200 && this.status < 300
            this.headers = new Map(Object.entries(options.headers || {}))
        }
        json() {
            return Promise.resolve(JSON.parse(this.body))
        }
        text() {
            return Promise.resolve(this.body)
        }
    }
}

// Mock Headers
if (typeof global.Headers === 'undefined') {
    global.Headers = class Headers {
        constructor(init = {}) {
            this._headers = new Map()
            if (init) {
                Object.entries(init).forEach(([key, value]) => {
                    this._headers.set(key.toLowerCase(), value)
                })
            }
        }
        get(name) {
            return this._headers.get(name.toLowerCase())
        }
        set(name, value) {
            this._headers.set(name.toLowerCase(), value)
        }
        has(name) {
            return this._headers.has(name.toLowerCase())
        }
    }
}
