package com.scamshield.mobile.ui.detail

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.scamshield.mobile.data.ScanRepository
import com.scamshield.mobile.data.local.ScanWithCalls
import com.scamshield.mobile.data.network.ScanResultDto
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

sealed class DetailState {
    object Loading : DetailState()
    data class Local(val scan: ScanWithCalls) : DetailState()
    data class Remote(val scan: ScanResultDto) : DetailState()
    object NotFound : DetailState()
}

sealed class RetryState {
    object Idle : RetryState()
    object Running : RetryState()
    data class Failed(val message: String) : RetryState()
}

class ScanDetailViewModel(app: Application) : AndroidViewModel(app) {
    private val repository = ScanRepository(app)

    var state = mutableStateOf<DetailState>(DetailState.Loading)
        private set

    var retryState = mutableStateOf<RetryState>(RetryState.Idle)
        private set

    /** Set once a retry completes successfully — the screen navigates to this id. */
    var retriedScanId = mutableStateOf<String?>(null)
        private set

    fun load(scanId: String) {
        viewModelScope.launch {
            if (repository.hasLocalScan(scanId)) {
                repository.localScan(scanId).collectLatest { local ->
                    state.value = local?.let { DetailState.Local(it) } ?: DetailState.NotFound
                }
            } else {
                val remote = repository.fetchRemoteScan(scanId)
                state.value = remote?.let { DetailState.Remote(it) } ?: DetailState.NotFound
            }
        }
    }

    fun retry(text: String, sender: String) {
        viewModelScope.launch {
            retryState.value = RetryState.Running
            try {
                val result = repository.rescan(text, sender)
                retryState.value = RetryState.Idle
                retriedScanId.value = result.id
            } catch (e: Exception) {
                retryState.value = RetryState.Failed(e.message ?: "Retry failed — try again in a moment.")
            }
        }
    }
}
