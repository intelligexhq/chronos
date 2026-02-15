import { validateFileMimeTypeAndExtensionMatch } from '../../src/utils/fileValidation'

/**
 * Test suite for file validation utility
 * Tests MIME type and extension validation
 */
export function fileValidationUtilTest() {
    describe('File Validation Utilities', () => {
        describe('validateFileMimeTypeAndExtensionMatch', () => {
            it('should not throw for valid PDF file', () => {
                expect(() => validateFileMimeTypeAndExtensionMatch('document.pdf', 'application/pdf')).not.toThrow()
            })

            it('should not throw for valid PNG image', () => {
                expect(() => validateFileMimeTypeAndExtensionMatch('image.png', 'image/png')).not.toThrow()
            })

            it('should not throw for valid JPEG image', () => {
                expect(() => validateFileMimeTypeAndExtensionMatch('photo.jpg', 'image/jpeg')).not.toThrow()
            })

            it('should not throw for valid JSON file', () => {
                expect(() => validateFileMimeTypeAndExtensionMatch('data.json', 'application/json')).not.toThrow()
            })

            it('should not throw for valid text file', () => {
                expect(() => validateFileMimeTypeAndExtensionMatch('readme.txt', 'text/plain')).not.toThrow()
            })

            it('should throw for mismatched extension and MIME type', () => {
                // PDF extension with image MIME type
                expect(() => validateFileMimeTypeAndExtensionMatch('file.pdf', 'image/png')).toThrow()
            })

            it('should throw for executable disguised as image', () => {
                expect(() => validateFileMimeTypeAndExtensionMatch('malware.exe', 'image/png')).toThrow()
            })
        })
    })
}
