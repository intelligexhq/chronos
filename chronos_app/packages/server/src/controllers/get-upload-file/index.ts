import { Request, Response, NextFunction } from 'express'
import fs from 'fs'
import contentDisposition from 'content-disposition'
import { streamStorageFile } from 'chronos-components'
import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ChatFlow } from '../../database/entities/ChatFlow'

const streamUploadedFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.query.chatflowId || !req.query.chatId || !req.query.fileName) {
            return res.status(500).send(`Invalid file path`)
        }
        const chatflowId = req.query.chatflowId as string
        const chatId = req.query.chatId as string
        const fileName = req.query.fileName as string
        const download = req.query.download === 'true' // Check if download parameter is set

        const appServer = getRunningExpressApp()

        // Open source: No workspace/org lookup needed
        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
            id: chatflowId
        })
        if (!chatflow) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowId} not found`)
        }
        const orgId = ''

        // Set Content-Disposition header - force attachment for download
        if (download) {
            res.setHeader('Content-Disposition', contentDisposition(fileName, { type: 'attachment' }))
        } else {
            res.setHeader('Content-Disposition', contentDisposition(fileName))
        }
        const fileStream = await streamStorageFile(chatflowId, chatId, fileName, orgId)

        if (!fileStream) throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: streamStorageFile`)

        if (fileStream instanceof fs.ReadStream && fileStream?.pipe) {
            fileStream.pipe(res)
        } else {
            res.send(fileStream)
        }
    } catch (error) {
        next(error)
    }
}

export default {
    streamUploadedFile
}
