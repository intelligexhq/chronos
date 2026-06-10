import { MigrationInterface, QueryRunner } from 'typeorm'
import { AES, enc } from 'crypto-js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * v1.9 — rename the generic API-key credential record from
 * `openAIApi` to `apiKey` (postgres). Mirrors the sqlite migration.
 *
 * See `1800000000019-RenameOpenAIApiCredentialToApiKey.ts` (sqlite)
 * for background and rationale.
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
        `SELECT id, "encryptedData" FROM credential WHERE "credentialName" = $1`,
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
        await queryRunner.query(`UPDATE credential SET "credentialName" = $1, "encryptedData" = $2, "updatedDate" = NOW() WHERE id = $3`, [
            toCredentialName,
            reEncrypted,
            row.id
        ])
    }
}
