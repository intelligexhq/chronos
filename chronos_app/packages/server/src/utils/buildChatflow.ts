import { Request } from 'express'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { omit } from 'lodash'
import {
    IFileUpload,
    convertSpeechToText,
    convertTextToSpeechStream,
    ICommonObject,
    addSingleFileToStorage,
    addArrayFilesToStorage,
    mapMimeTypeToInputField,
    mapExtToInputField,
    getFileFromUpload,
    removeSpecificFileFromUpload,
    IServerSideEventStreamer
} from 'chronos-components'
import { StatusCodes } from 'http-status-codes'
import { IncomingInput, IExecuteFlowParams, MODE } from '../Interface'
import { InternalChronosError } from '../errors/internalChronosError'
import { databaseEntities } from '.'
import { ChatFlow } from '../database/entities/ChatFlow'
import { getRunningExpressApp } from '../utils/getRunningExpressApp'
import { validateFileMimeTypeAndExtensionMatch } from './fileValidation'
import { validateFlowAPIKey } from './validateKey'
import logger from './logger'
import { checkStorage, updatePredictionsUsage, updateStorageUsage } from './quotaUsage'
import { getErrorMessage } from '../errors/utils'
import { CHRONOS_METRIC_COUNTERS, CHRONOS_COUNTER_STATUS, IMetricsProvider } from '../Interface.Metrics'
import { OMIT_QUEUE_JOB_DATA } from './constants'
import { executeAgentFlow } from './buildAgentflow'

const shouldAutoPlayTTS = (textToSpeechConfig: string | undefined | null): boolean => {
    if (!textToSpeechConfig) return false
    try {
        const config = typeof textToSpeechConfig === 'string' ? JSON.parse(textToSpeechConfig) : textToSpeechConfig
        for (const providerKey in config) {
            const provider = config[providerKey]
            if (provider && provider.status === true && provider.autoPlay === true) {
                return true
            }
        }
        return false
    } catch (error) {
        logger.error(`Error parsing textToSpeechConfig: ${getErrorMessage(error)}`)
        return false
    }
}

const generateTTSForResponseStream = async (
    responseText: string,
    textToSpeechConfig: string | undefined,
    options: ICommonObject,
    chatId: string,
    chatMessageId: string,
    sseStreamer: IServerSideEventStreamer,
    abortController?: AbortController
): Promise<void> => {
    try {
        if (!textToSpeechConfig) return
        const config = typeof textToSpeechConfig === 'string' ? JSON.parse(textToSpeechConfig) : textToSpeechConfig

        let activeProviderConfig = null
        for (const providerKey in config) {
            const provider = config[providerKey]
            if (provider && provider.status === true) {
                activeProviderConfig = {
                    name: providerKey,
                    credentialId: provider.credentialId,
                    voice: provider.voice,
                    model: provider.model
                }
                break
            }
        }

        if (!activeProviderConfig) return

        await convertTextToSpeechStream(
            responseText,
            activeProviderConfig,
            options,
            abortController || new AbortController(),
            (format: string) => {
                sseStreamer.streamTTSStartEvent(chatId, chatMessageId, format)
            },
            (chunk: Buffer) => {
                const audioBase64 = chunk.toString('base64')
                sseStreamer.streamTTSDataEvent(chatId, chatMessageId, audioBase64)
            },
            () => {
                sseStreamer.streamTTSEndEvent(chatId, chatMessageId)
            }
        )
    } catch (error) {
        logger.error(`[server]: TTS streaming failed: ${getErrorMessage(error)}`)
        sseStreamer.streamTTSEndEvent(chatId, chatMessageId)
    }
}

/**
 * Execute flow - routes to the appropriate flow executor based on type.
 * Only AGENTFLOW (v2) is supported. Other types return an error.
 */
export const executeFlow = async ({
    componentNodes,
    incomingInput,
    chatflow,
    chatId,
    isEvaluation: _isEvaluation,
    evaluationRunId,
    appDataSource,
    telemetry,
    cachePool,
    usageCacheManager,
    sseStreamer,
    baseURL,
    isInternal,
    files,
    signal,
    isTool
}: IExecuteFlowParams) => {
    // Local constants for removed parameters
    const orgId = ''
    const workspaceId = ''
    const subscriptionId = ''
    // Ensure incomingInput has all required properties with default values
    incomingInput = {
        history: [],
        streaming: false,
        ...incomingInput
    }

    let overrideConfig = incomingInput.overrideConfig ?? {}
    const uploads = incomingInput.uploads
    const chatflowid = chatflow.id

    /* Process file uploads from the chat
     * - Images
     * - Files
     * - Audio
     */
    let fileUploads: IFileUpload[] = []
    let uploadedFilesContent = ''
    if (uploads) {
        fileUploads = uploads
        for (let i = 0; i < fileUploads.length; i += 1) {
            await checkStorage(orgId, subscriptionId, usageCacheManager)

            const upload = fileUploads[i]

            // if upload in an image, a rag file, or audio
            if ((upload.type === 'file' || upload.type === 'file:rag' || upload.type === 'audio') && upload.data) {
                const filename = upload.name
                const splitDataURI = upload.data.split(',')
                const bf = Buffer.from(splitDataURI.pop() || '', 'base64')
                const mime = splitDataURI[0].split(':')[1].split(';')[0]

                // Validate file extension, MIME type, and content to prevent security vulnerabilities
                validateFileMimeTypeAndExtensionMatch(filename, mime)

                const { totalSize } = await addSingleFileToStorage(mime, bf, filename, orgId, chatflowid, chatId)
                await updateStorageUsage(orgId, workspaceId, totalSize, usageCacheManager)
                upload.type = 'stored-file'
                // Omit upload.data since we don't store the content in database
                fileUploads[i] = omit(upload, ['data'])
            }

            if (upload.type === 'url' && upload.data) {
                const filename = upload.name
                const urlData = upload.data
                fileUploads[i] = { data: urlData, name: filename, type: 'url', mime: upload.mime ?? 'image/png' }
            }

            // Run Speech to Text conversion
            if (upload.mime === 'audio/webm' || upload.mime === 'audio/mp4' || upload.mime === 'audio/ogg') {
                logger.debug(`[server]: [${orgId}]: Attempting a speech to text conversion...`)
                let speechToTextConfig: ICommonObject = {}
                if (chatflow.speechToText) {
                    const speechToTextProviders = JSON.parse(chatflow.speechToText)
                    for (const provider in speechToTextProviders) {
                        const providerObj = speechToTextProviders[provider]
                        if (providerObj.status) {
                            speechToTextConfig = providerObj
                            speechToTextConfig['name'] = provider
                            break
                        }
                    }
                }
                if (speechToTextConfig) {
                    const options: ICommonObject = {
                        orgId,
                        chatId,
                        chatflowid,
                        appDataSource,
                        databaseEntities: databaseEntities
                    }
                    const speechToTextResult = await convertSpeechToText(upload, speechToTextConfig, options)
                    logger.debug(`[server]: [${orgId}]: Speech to text result: ${speechToTextResult}`)
                    if (speechToTextResult) {
                        incomingInput.question = speechToTextResult
                    }
                }
            }

            if (upload.type === 'file:full' && upload.data) {
                upload.type = 'stored-file:full'
                // Omit upload.data since we don't store the content in database
                uploadedFilesContent += `<doc name='${upload.name}'>${upload.data}</doc>\n\n`
                fileUploads[i] = omit(upload, ['data'])
            }
        }
    }

    // Process form data body with files
    if (files?.length) {
        overrideConfig = { ...incomingInput }
        for (const file of files) {
            await checkStorage(orgId, subscriptionId, usageCacheManager)

            const fileNames: string[] = []
            const fileBuffer = await getFileFromUpload(file.path ?? file.key)
            // Address file name with special characters: https://github.com/expressjs/multer/issues/1104
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8')

            // Validate file extension, MIME type, and content to prevent security vulnerabilities
            validateFileMimeTypeAndExtensionMatch(file.originalname, file.mimetype)

            const { path: storagePath, totalSize } = await addArrayFilesToStorage(
                file.mimetype,
                fileBuffer,
                file.originalname,
                fileNames,
                orgId,
                chatflowid
            )
            await updateStorageUsage(orgId, workspaceId, totalSize, usageCacheManager)

            const fileInputFieldFromMimeType = mapMimeTypeToInputField(file.mimetype)

            const fileExtension = path.extname(file.originalname)

            const fileInputFieldFromExt = mapExtToInputField(fileExtension)

            let fileInputField = 'txtFile'

            if (fileInputFieldFromExt !== 'txtFile') {
                fileInputField = fileInputFieldFromExt
            } else if (fileInputFieldFromMimeType !== 'txtFile') {
                fileInputField = fileInputFieldFromExt
            }

            if (overrideConfig[fileInputField]) {
                const existingFileInputField = overrideConfig[fileInputField].replace('FILE-STORAGE::', '')
                const existingFileInputFieldArray = JSON.parse(existingFileInputField)

                const newFileInputField = storagePath.replace('FILE-STORAGE::', '')
                const newFileInputFieldArray = JSON.parse(newFileInputField)

                const updatedFieldArray = existingFileInputFieldArray.concat(newFileInputFieldArray)

                overrideConfig[fileInputField] = `FILE-STORAGE::${JSON.stringify(updatedFieldArray)}`
            } else {
                overrideConfig[fileInputField] = storagePath
            }

            await removeSpecificFileFromUpload(file.path ?? file.key)
        }
        if (overrideConfig.vars && typeof overrideConfig.vars === 'string') {
            overrideConfig.vars = JSON.parse(overrideConfig.vars)
        }
        incomingInput = {
            ...incomingInput,
            overrideConfig,
            chatId
        }
    }

    // Only Agentflow V2 is supported
    if (chatflow.type === 'AGENTFLOW') {
        return executeAgentFlow({
            componentNodes,
            incomingInput,
            chatflow,
            chatId,
            evaluationRunId,
            appDataSource,
            telemetry,
            cachePool,
            usageCacheManager,
            sseStreamer,
            baseURL,
            isInternal,
            uploadedFilesContent,
            fileUploads,
            signal,
            isTool
        })
    }

    // Deprecated flow types
    throw new InternalChronosError(
        StatusCodes.GONE,
        `Flow type '${chatflow.type}' is deprecated. Only Agentflow V2 (type AGENTFLOW) is supported. Please migrate your flow.`
    )
}

/**
 * Build/Data Preparation for execute function
 * @param {Request} req
 * @param {boolean} isInternal
 */
export const utilBuildChatflow = async (req: Request, isInternal: boolean = false): Promise<any> => {
    const appServer = getRunningExpressApp()

    const chatflowid = req.params.id

    // Check if chatflow exists
    const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({
        id: chatflowid
    })
    if (!chatflow) {
        throw new InternalChronosError(StatusCodes.NOT_FOUND, `Chatflow ${chatflowid} not found`)
    }

    const isAgentFlow = chatflow.type === 'AGENTFLOW'
    const httpProtocol = req.get('x-forwarded-proto') || req.protocol
    const baseURL = `${httpProtocol}://${req.get('host')}`
    const incomingInput: IncomingInput = req.body || {} // Ensure incomingInput is never undefined
    const chatId = incomingInput.chatId ?? incomingInput.overrideConfig?.sessionId ?? uuidv4()
    const files = (req.files as Express.Multer.File[]) || []
    const abortControllerId = `${chatflow.id}_${chatId}`
    const isTool = req.get('flowise-tool') === 'true'
    const isEvaluation: boolean = req.headers['X-Flowise-Evaluation'] || req.body.evaluation
    let evaluationRunId = ''
    evaluationRunId = req.body.evaluationRunId
    if (isEvaluation && chatflow.type !== 'AGENTFLOW' && req.body.evaluationRunId) {
        // this is needed for the collection of token metrics for non-agent flows,
        // for agentflows the execution trace has the info needed
        const newEval = {
            evaluation: {
                status: true,
                evaluationRunId
            }
        }
        chatflow.analytic = JSON.stringify(newEval)
    }

    let organizationId = ''

    try {
        // Validate API Key if its external API request
        if (!isInternal) {
            const isKeyValidated = await validateFlowAPIKey(req, chatflow)
            if (!isKeyValidated) {
                throw new InternalChronosError(StatusCodes.UNAUTHORIZED, `Unauthorized`)
            }
        }

        // Open source: No workspace/organization needed
        const workspaceId = ''
        const orgId = ''
        organizationId = orgId
        const subscriptionId = ''

        const executeData: IExecuteFlowParams = {
            incomingInput, // Use the defensively created incomingInput variable
            chatflow,
            chatId,
            baseURL,
            isInternal,
            files,
            isEvaluation,
            evaluationRunId,
            appDataSource: appServer.AppDataSource,
            sseStreamer: appServer.sseStreamer,
            telemetry: appServer.telemetry,
            cachePool: appServer.cachePool,
            componentNodes: appServer.nodesPool.componentNodes,
            isTool, // used to disable streaming if incoming request its from ChatflowTool
            usageCacheManager: appServer.usageCacheManager
        }

        if (process.env.MODE === MODE.QUEUE) {
            const predictionQueue = appServer.queueManager.getQueue('prediction')
            const job = await predictionQueue.addJob(omit(executeData, OMIT_QUEUE_JOB_DATA))
            logger.debug(`[server]: [${orgId}/${chatflow.id}/${chatId}]: Job added to queue: ${job.id}`)

            const queueEvents = predictionQueue.getQueueEvents()
            const result = await job.waitUntilFinished(queueEvents)
            appServer.abortControllerPool.remove(abortControllerId)
            if (!result) {
                throw new Error('Job execution failed')
            }
            await updatePredictionsUsage(orgId, subscriptionId, workspaceId, appServer.usageCacheManager)
            incrementSuccessMetricCounter(appServer.metricsProvider, isInternal, isAgentFlow)
            return result
        } else {
            // Add abort controller to the pool
            const signal = new AbortController()
            appServer.abortControllerPool.add(abortControllerId, signal)
            executeData.signal = signal

            const result = await executeFlow(executeData)

            appServer.abortControllerPool.remove(abortControllerId)
            await updatePredictionsUsage(orgId, subscriptionId, workspaceId, appServer.usageCacheManager)
            incrementSuccessMetricCounter(appServer.metricsProvider, isInternal, isAgentFlow)
            return result
        }
    } catch (e) {
        logger.error(`[server]:${organizationId}/${chatflow.id}/${chatId} Error:`, e)
        appServer.abortControllerPool.remove(`${chatflow.id}_${chatId}`)
        incrementFailedMetricCounter(appServer.metricsProvider, isInternal, isAgentFlow)
        if (e instanceof InternalChronosError && e.statusCode === StatusCodes.UNAUTHORIZED) {
            throw e
        } else {
            throw new InternalChronosError(StatusCodes.INTERNAL_SERVER_ERROR, getErrorMessage(e))
        }
    }
}

/**
 * Increment success metric counter
 */
const incrementSuccessMetricCounter = (metricsProvider: IMetricsProvider, isInternal: boolean, isAgentFlow: boolean) => {
    if (isAgentFlow) {
        metricsProvider?.incrementCounter(
            isInternal ? CHRONOS_METRIC_COUNTERS.AGENTFLOW_PREDICTION_INTERNAL : CHRONOS_METRIC_COUNTERS.AGENTFLOW_PREDICTION_EXTERNAL,
            { status: CHRONOS_COUNTER_STATUS.SUCCESS }
        )
    } else {
        metricsProvider?.incrementCounter(
            isInternal ? CHRONOS_METRIC_COUNTERS.CHATFLOW_PREDICTION_INTERNAL : CHRONOS_METRIC_COUNTERS.CHATFLOW_PREDICTION_EXTERNAL,
            { status: CHRONOS_COUNTER_STATUS.SUCCESS }
        )
    }
}

/**
 * Increment failed metric counter
 */
const incrementFailedMetricCounter = (metricsProvider: IMetricsProvider, isInternal: boolean, isAgentFlow: boolean) => {
    if (isAgentFlow) {
        metricsProvider?.incrementCounter(
            isInternal ? CHRONOS_METRIC_COUNTERS.AGENTFLOW_PREDICTION_INTERNAL : CHRONOS_METRIC_COUNTERS.AGENTFLOW_PREDICTION_EXTERNAL,
            { status: CHRONOS_COUNTER_STATUS.FAILURE }
        )
    } else {
        metricsProvider?.incrementCounter(
            isInternal ? CHRONOS_METRIC_COUNTERS.CHATFLOW_PREDICTION_INTERNAL : CHRONOS_METRIC_COUNTERS.CHATFLOW_PREDICTION_EXTERNAL,
            { status: CHRONOS_COUNTER_STATUS.FAILURE }
        )
    }
}

export { shouldAutoPlayTTS, generateTTSForResponseStream }
