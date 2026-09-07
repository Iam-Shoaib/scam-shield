package com.scamshield.mobile.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.scamshield.mobile.data.local.MinerCallEntity
import com.scamshield.mobile.data.network.MinerCallRecordDto
import com.scamshield.mobile.ui.components.MinerCallRow
import com.scamshield.mobile.ui.components.VerdictBadge
import com.scamshield.mobile.ui.components.isMajorityFailed

private const val UNKNOWN_SENDER = "Retry"

@Composable
fun ScanDetailScreen(scanId: String, onRetried: (String) -> Unit = {}, viewModel: ScanDetailViewModel = viewModel()) {
    LaunchedEffect(scanId) { viewModel.load(scanId) }
    val state by viewModel.state
    val retryState by viewModel.retryState
    val retriedScanId by viewModel.retriedScanId

    LaunchedEffect(retriedScanId) {
        retriedScanId?.let(onRetried)
    }

    when (val s = state) {
        is DetailState.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        is DetailState.NotFound -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("Scan not found.", color = MaterialTheme.colorScheme.secondary)
        }
        is DetailState.Local -> {
            val scan = s.scan.scan
            val failed = s.scan.calls.count { !it.ok }
            DetailBody(
                verdict = scan.overallVerdict,
                inputText = scan.inputText,
                reasonBullets = scan.reasonBullets,
                majorityFailed = isMajorityFailed(s.scan.calls.size, failed),
                retryState = retryState,
                onRetry = { viewModel.retry(scan.inputText, scan.senderNumber) },
            ) {
                items(s.scan.calls) { call -> MinerCallRow(call) }
            }
        }
        is DetailState.Remote -> {
            val scan = s.scan
            val failed = scan.calls.count { !it.ok }
            DetailBody(
                verdict = scan.overallVerdict,
                inputText = scan.inputText,
                reasonBullets = scan.reasonBullets,
                majorityFailed = isMajorityFailed(scan.calls.size, failed),
                retryState = retryState,
                onRetry = { viewModel.retry(scan.inputText, UNKNOWN_SENDER) },
            ) {
                items(scan.calls) { call -> MinerCallRow(call.toDisplayEntity(scan.id)) }
            }
        }
    }
}

@Composable
private fun DetailBody(
    verdict: String,
    inputText: String,
    reasonBullets: List<String>,
    majorityFailed: Boolean,
    retryState: RetryState,
    onRetry: () -> Unit,
    calls: androidx.compose.foundation.lazy.LazyListScope.() -> Unit,
) {
    LazyColumn(Modifier.fillMaxSize().padding(16.dp)) {
        item {
            Column(Modifier.fillMaxWidth()) {
                if (majorityFailed) {
                    VerdictBadge("Inconclusive")
                    Text(
                        inputText,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 10.dp, bottom = 10.dp),
                    )
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.errorContainer, RoundedCornerShape(10.dp))
                            .padding(12.dp),
                    ) {
                        Text(
                            "Most miners for this scan failed or errored out. This isn't a verdict — see the errors below.",
                            style = MaterialTheme.typography.bodySmall,
                        )
                        when (retryState) {
                            is RetryState.Running -> Text(
                                "Retrying…",
                                style = MaterialTheme.typography.labelMedium,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                            is RetryState.Failed -> {
                                Text(
                                    retryState.message,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.padding(top = 8.dp),
                                )
                                Button(onClick = onRetry, modifier = Modifier.padding(top = 8.dp)) {
                                    Text("Retry this check")
                                }
                            }
                            is RetryState.Idle -> Button(onClick = onRetry, modifier = Modifier.padding(top = 8.dp)) {
                                Text("Retry this check")
                            }
                        }
                    }
                } else {
                    VerdictBadge(verdict)
                    Text(
                        inputText,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(top = 10.dp, bottom = 10.dp),
                    )
                    reasonBullets.forEach { bullet ->
                        Text("• $bullet", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
                    }
                }
            }
        }
        item {
            Text(
                "Miner-by-miner evidence",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.padding(vertical = 12.dp),
            )
        }
        calls()
    }
}

private fun MinerCallRecordDto.toDisplayEntity(scanId: String) = MinerCallEntity(
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
