package com.scamshield.mobile.data

import android.content.Context
import com.scamshield.mobile.data.local.AppDatabase
import com.scamshield.mobile.data.local.MinerCallEntity
import com.scamshield.mobile.data.local.ScanEntity
import com.scamshield.mobile.data.local.ScanWithCalls
import com.scamshield.mobile.data.network.MinerCallRecordDto
import com.scamshield.mobile.data.network.ScamShieldApi
import com.scamshield.mobile.data.network.ScanEvent
import com.scamshield.mobile.data.network.ScanResultDto
import com.scamshield.mobile.data.network.ScansPage
import kotlinx.coroutines.flow.Flow

class ScanRepository(context: Context) {

    private val db = AppDatabase.get(context)
    private val dao = db.scanDao()
    private val api = ScamShieldApi(Config.DEFAULT_API_ORIGIN)

    fun localHistory(): Flow<List<ScanEntity>> = dao.getAllScansFlow()

    fun localScan(id: String): Flow<ScanWithCalls?> = dao.getScanWithCalls(id)

    suspend fun hasLocalScan(id: String): Boolean = dao.hasScan(id)

    /** Runs a scan for an incoming SMS and persists the result, tagged with its sender. */
    suspend fun scanSms(sender: String, body: String, receivedAtEpochMs: Long, onEvent: suspend (ScanEvent) -> Unit = {}) {
        api.scan(body, Config.DEFAULT_MAX_SPEND_USD) { event ->
            onEvent(event)
            if (event is ScanEvent.Done) {
                persist(event.scan, sender, receivedAtEpochMs)
            }
        }
    }

    /**
     * Re-runs a scan whose original result had too many failed miner calls
     * to trust (see isMajorityFailed) — a fresh scan, persisted as a new
     * row tagged with the same sender, so the failed one stays on record.
     */
    suspend fun rescan(text: String, sender: String): ScanResultDto {
        var result: ScanResultDto? = null
        api.scan(text, Config.DEFAULT_MAX_SPEND_USD) { event ->
            if (event is ScanEvent.Done) {
                persist(event.scan, sender, System.currentTimeMillis())
                result = event.scan
            } else if (event is ScanEvent.Error) {
                throw IllegalStateException(event.error)
            }
        }
        return result ?: throw IllegalStateException("Retry didn't return a result.")
    }

    /** Fetches a ledger entry not already cached locally (GET /api/scans/{id}). */
    suspend fun fetchRemoteScan(id: String): ScanResultDto? = api.getScan(id)

    /** Global, cursor-paginated public ledger — GET /api/scans. */
    suspend fun listGlobalLedger(cursor: String?): ScansPage = api.listScans(cursor)

    private suspend fun persist(scan: ScanResultDto, sender: String, receivedAtEpochMs: Long) {
        val entity = ScanEntity(
            id = scan.id,
            createdAt = scan.createdAt,
            inputText = scan.inputText,
            translatedText = scan.translatedText,
            overallVerdict = scan.overallVerdict,
            reasonBullets = scan.reasonBullets,
            totalCostUsd = scan.totalCostUsd,
            totalCalls = scan.totalCalls,
            uniqueMinersUsed = scan.uniqueMinersUsed,
            senderNumber = sender,
            receivedAtEpochMs = receivedAtEpochMs,
        )
        val calls = scan.calls.map { it.toEntity(scan.id) }
        dao.insertScanWithCalls(entity, calls)
    }
}

private fun MinerCallRecordDto.toEntity(scanId: String) = MinerCallEntity(
    scanId = scanId,
    minerId = minerId,
    minerName = minerName,
    category = category,
    entityKind = entityKind,
    entity = entity,
    ok = ok,
    verdictLabel = verdict?.label,
    verdictConfidence = verdict?.confidence,
    verdictReason = verdict?.reason,
    costUsd = costUsd,
    durationMs = durationMs,
    error = error,
)
