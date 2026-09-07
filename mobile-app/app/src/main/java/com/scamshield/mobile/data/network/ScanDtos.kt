package com.scamshield.mobile.data.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Mirrors lib/telegraph/scanTypes.ts exactly — see app/api/scan/route.ts for
// the NDJSON stream this is parsed from.

@Serializable
data class ScanResultDto(
    val id: String,
    val createdAt: String,
    val inputText: String,
    val translatedText: String? = null,
    val detectedNonEnglish: Boolean = false,
    val entities: EntitiesDto = EntitiesDto(),
    val calls: List<MinerCallRecordDto> = emptyList(),
    val skippedEntities: List<SkippedEntityDto> = emptyList(),
    val overallVerdict: String,
    val reasonBullets: List<String> = emptyList(),
    val totalCostUsd: Double = 0.0,
    val totalCalls: Int = 0,
    val uniqueMinersUsed: Int = 0,
)

@Serializable
data class EntitiesDto(
    val urls: List<String> = emptyList(),
    val emails: List<String> = emptyList(),
    val ips: List<String> = emptyList(),
)

@Serializable
data class SkippedEntityDto(
    val kind: String,
    val entity: String,
    val reason: String,
)

// Note: the server serializes this record's cost/duration/hash fields as
// snake_case (cost_usd, duration_ms, signal_hash) even though the rest of
// the API is camelCase — see lib/telegraph/scanTypes.ts. Preserve that
// exactly rather than "fixing" it here.
@Serializable
data class MinerCallRecordDto(
    val minerId: String,
    val minerName: String,
    val category: String,
    val entityKind: String,
    val entity: String,
    val ok: Boolean,
    val verdict: VerdictDto? = null,
    @SerialName("cost_usd") val costUsd: Double = 0.0,
    @SerialName("duration_ms") val durationMs: Long = 0,
    @SerialName("signal_hash") val signalHash: String? = null,
    val error: String? = null,
    val rawExcerpt: String? = null,
)

@Serializable
data class VerdictDto(
    val label: String,
    val confidence: Double? = null,
    val reason: String,
)

// One line of the /api/scan NDJSON stream.
@Serializable
sealed class ScanEvent {
    @Serializable
    data class Start(val totalTasks: Int, val scanId: String? = null) : ScanEvent()

    @Serializable
    data class MoreTasks(val additionalTasks: Int) : ScanEvent()

    @Serializable
    data class Call(val call: MinerCallRecordDto) : ScanEvent()

    @Serializable
    data class Done(val scan: ScanResultDto) : ScanEvent()

    @Serializable
    data class Error(val error: String) : ScanEvent()
}
