package com.scamshield.mobile.data.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

private val json = Json {
    ignoreUnknownKeys = true
    isLenient = true
}

class ScamShieldApi(private val apiOrigin: String) {

    private val client = OkHttpClient.Builder()
        // The server allows scans to run up to 5 minutes (maxDuration=300
        // in app/api/scan/route.ts) while it streams progress — match that
        // on the client so a slow scan isn't cut off mid-stream.
        .readTimeout(300, TimeUnit.SECONDS)
        .callTimeout(310, TimeUnit.SECONDS)
        .build()

    /**
     * POSTs to /api/scan and reads the NDJSON response line by line, the
     * same protocol firefox-extension/background.js's runScan() consumes.
     * [onEvent] is invoked once per event; the call suspends until the
     * stream closes (a "done" or "error" event, or the connection ending).
     */
    suspend fun scan(text: String, maxSpendUsd: Double, onEvent: suspend (ScanEvent) -> Unit) {
        withContext(Dispatchers.IO) {
            val bodyJson = kotlinx.serialization.json.buildJsonObject {
                put("text", kotlinx.serialization.json.JsonPrimitive(text))
                put("maxSpendUsd", kotlinx.serialization.json.JsonPrimitive(maxSpendUsd))
            }.toString()

            val request = Request.Builder()
                .url("$apiOrigin/api/scan")
                .post(bodyJson.toRequestBody("application/json".toMediaType()))
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    onEvent(ScanEvent.Error("Request failed (${response.code})."))
                    return@use
                }
                val source = response.body?.source() ?: run {
                    onEvent(ScanEvent.Error("Empty response body."))
                    return@use
                }
                while (!source.exhausted()) {
                    val line = source.readUtf8Line() ?: break
                    if (line.isBlank()) continue
                    val event = parseLine(line)
                    if (event != null) onEvent(event)
                }
            }
        }
    }

    /** Fetches a single scan by id — used to hydrate a ledger row not yet cached locally. */
    suspend fun getScan(id: String): ScanResultDto? = withContext(Dispatchers.IO) {
        val request = Request.Builder().url("$apiOrigin/api/scans/$id").get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext null
            val body = response.body?.string() ?: return@withContext null
            runCatching { json.decodeFromString(ScanResultDto.serializer(), body) }.getOrNull()
        }
    }

    /** Cursor-paginated global scan history — mirrors GET /api/scans used by the web ledger page. */
    suspend fun listScans(cursor: String?, limit: Int = 20): ScansPage = withContext(Dispatchers.IO) {
        val urlBuilder = StringBuilder("$apiOrigin/api/scans?limit=$limit")
        if (cursor != null) urlBuilder.append("&cursor=").append(cursor)
        val request = Request.Builder().url(urlBuilder.toString()).get().build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext ScansPage(emptyList(), null)
            val body = response.body?.string() ?: return@withContext ScansPage(emptyList(), null)
            val element = json.parseToJsonElement(body).jsonObject
            val items = element["items"]?.let {
                json.decodeFromJsonElement(kotlinx.serialization.builtins.ListSerializer(ScanResultDto.serializer()), it)
            } ?: emptyList()
            val nextCursor = element["nextCursor"]?.jsonPrimitive?.contentOrNull
            ScansPage(items, nextCursor)
        }
    }

    private fun parseLine(line: String): ScanEvent? {
        val obj = runCatching { json.parseToJsonElement(line).jsonObject }.getOrNull() ?: return null
        return when (obj["type"]?.jsonPrimitive?.contentOrNull) {
            "start" -> ScanEvent.Start(
                totalTasks = obj["totalTasks"]?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 0,
                scanId = obj["scanId"]?.jsonPrimitive?.contentOrNull,
            )
            "more_tasks" -> ScanEvent.MoreTasks(
                additionalTasks = obj["additionalTasks"]?.jsonPrimitive?.contentOrNull?.toIntOrNull() ?: 0,
            )
            "call" -> obj["call"]?.let {
                runCatching { json.decodeFromJsonElement(MinerCallRecordDto.serializer(), it) }.getOrNull()
            }?.let { ScanEvent.Call(it) }
            "done" -> obj["scan"]?.let {
                runCatching { json.decodeFromJsonElement(ScanResultDto.serializer(), it) }.getOrNull()
            }?.let { ScanEvent.Done(it) }
            "error" -> ScanEvent.Error(obj["error"]?.jsonPrimitive?.contentOrNull ?: "Scan failed.")
            else -> null
        }
    }
}

data class ScansPage(val items: List<ScanResultDto>, val nextCursor: String?)
