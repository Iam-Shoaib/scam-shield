package com.scamshield.mobile.ui.settings

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.scamshield.mobile.data.settings.ProtectionSettings
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class SettingsViewModel(app: Application) : AndroidViewModel(app) {
    private val settings = ProtectionSettings(app)

    val protectionEnabled: StateFlow<Boolean> =
        settings.protectionEnabled.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    fun setProtectionEnabled(enabled: Boolean) {
        viewModelScope.launch { settings.setProtectionEnabled(enabled) }
    }
}
