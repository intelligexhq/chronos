/**
 * Mock for pyodide
 * This package is a heavy WASM dependency for Python in browser
 */

const mockPyodide = {
    runPython: jest.fn((code) => null),
    runPythonAsync: jest.fn(async (code) => null),
    loadPackage: jest.fn(async () => {}),
    loadPackagesFromImports: jest.fn(async () => {}),
    globals: {
        get: jest.fn(),
        set: jest.fn()
    },
    FS: {
        writeFile: jest.fn(),
        readFile: jest.fn()
    }
}

module.exports = {
    loadPyodide: jest.fn(async () => mockPyodide),
    default: {
        loadPyodide: jest.fn(async () => mockPyodide)
    }
}
