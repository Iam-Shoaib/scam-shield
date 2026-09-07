package com.scamshield.mobile.ui.ledger

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.scamshield.mobile.data.ScanRepository
import com.scamshield.mobile.data.network.ScanResultDto
import kotlinx.coroutines.launch

class LedgerViewModel(app: Application) : AndroidViewModel(app) {
    private val repository = ScanRepository(app)

    var items = mutableStateOf<List<ScanResultDto>>(emptyList())
        private set
    var isLoading = mutableStateOf(false)
        private set
    var isLoadingMore = mutableStateOf(false)
        private set

    private var cursor: String? = null
    private var exhausted = false

    init {
        refresh()
    }

    fun refresh() {
        cursor = null
        exhausted = false
        viewModelScope.launch {
            isLoading.value = true
            val page = repository.listGlobalLedger(null)
            items.value = page.items
            cursor = page.nextCursor
            exhausted = page.nextCursor == null
            isLoading.value = false
        }
    }

    fun loadMore() {
        if (exhausted || isLoadingMore.value) return
        viewModelScope.launch {
            isLoadingMore.value = true
            val page = repository.listGlobalLedger(cursor)
            items.value = items.value + page.items
            cursor = page.nextCursor
            exhausted = page.nextCursor == null
            isLoadingMore.value = false
        }
    }
}
