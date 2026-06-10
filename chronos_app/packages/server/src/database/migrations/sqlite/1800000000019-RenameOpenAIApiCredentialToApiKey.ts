import { MigrationInterface, QueryRunner } from 'typeorm'
import { AES, enc } from 'crypto-js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * v1.9 — rename the generic API-key credential record from
 * `openAIApi` to `apiKey` (sqlite). Mirrors the postgres migration.
 *
 * Background: until v1.9 the credential identity for the generic
 * OpenAI-spec API key was vendor-branded (`openAIApi`) — a holdover
 * from the era when each chat-model node had its own provider-specific
 * credential. With v1.9's `ChatModelEndpoint` covering any OpenAI-
 * compatible provider (OpenRouter, Ollama, Together, Groq, etc.) the
 * branded name is misleading; the record is now a generic API key.
 *
 * Schema changes:
 *  - `credential.credentialName`: `'openAIApi'` → `'apiKey'`
 *  - Inner encrypted JSON field: `openAIApiKey` → `apiKey`
 *
 * The inner field rename requires a decrypt → mutate → re-encrypt cycle
 * per affected row. The encryption key is sourced via the same
 * resolution order the runtime uses (env override → SECRETKEY_PATH
 * file → ~/.chronos/encryption.key) so the migration only succeeds in
 * environments that already have a runtime-valid key.
 *
 * AWS Secrets Manager backing is intentionally NOT supported here —
 * deployments that use it should run the migration with
 * CHRONOS_SECRETKEY_OVERWRITE set, or perform the credential rename
 * manually via the operator API. The vast majority of deployments use
 * the local-file backing this resolver supports.
 *
 * `down()` reverses both the column value and the inner JSON key so
 * downgrades don't strand records the v1.8 code can't decrypt.
 */
export class RenameOpenAIApiCredentialToApiKey1800000000019 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await renameCredential(queryRunner, 'openAIApi', 'apiKey', 'openAIApiKey', 'apiKey')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await renameCredential(queryRunner, 'apiKey', 'openAIApi', 'apiKey', 'openAIApiKey')
    }
}

const resolveEncryptionKey = (): string => {
    if (process.env.CHRONOS_SECRETKEY_OVERWRITE) return process.env.CHRONOS_SECRETKEY_OVERWRITE
    const filePath = process.env.SECRETKEY_PATH
        ? path.join(process.env.SECRETKEY_PATH, 'encryption.key')
        : path.join(os.homedir(), '.chronos', 'encryption.key')
    return fs.readFileSync(filePath, 'utf8')
}

const renameCredential = async (
    queryRunner: QueryRunner,
    fromCredentialName: string,
    toCredentialName: string,
    fromFieldName: string,
    toFieldName: string
): Promise<void> => {
    const rows: { id: string; encryptedData: string }[] = await queryRunner.query(
        `SELECT "id", "encryptedData" FROM "credential" WHERE "credentialName" = ?`,
        [fromCredentialName]
    )
    if (rows.length === 0) return

    const encryptionKey = resolveEncryptionKey()

    for (const row of rows) {
        const decrypted = AES.decrypt(row.encryptedData, encryptionKey).toString(enc.Utf8)
        const data = JSON.parse(decrypted) as Record<string, unknown>
        if (fromFieldName in data) {
            data[toFieldName] = data[fromFieldName]
            delete data[fromFieldName]
        }
        const reEncrypted = AES.encrypt(JSON.stringify(data), encryptionKey).toString()
        await queryRunner.query(
            `UPDATE "credential" SET "credentialName" = ?, "encryptedData" = ?, "updatedDate" = CURRENT_TIMESTAMP WHERE "id" = ?`,
            [toCredentialName, reEncrypted, row.id]
        )
    }
}
