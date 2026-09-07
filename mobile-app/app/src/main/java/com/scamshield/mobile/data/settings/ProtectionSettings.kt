package com.scamshield.mobile.data.settings

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

private val Context.dataStore by preferencesDataStore(name = "protection_settings")

class ProtectionSettings(private val context: Context) {

    private object Keys {
        val PROTECTION_ENABLED = booleanPreferencesKey("protection_enabled")
    }

    val protectionEnabled: Flow<Boolean> =
        context.dataStore.data.map { it[Keys.PROTECTION_ENABLED] ?: false }

    suspend fun setProtectionEnabled(enabled: Boolean) {
        context.dataStore.edit { it[Keys.PROTECTION_ENABLED] = enabled }
    }

    /**
     * Fast, synchronous snapshot for use inside SmsReceiver.onReceive, which
     * cannot suspend. A local DataStore read is quick enough that blocking
     * here is acceptable — this is not a network call.
     */
    fun protectionEnabledBlocking(): Boolean = runBlocking { protectionEnabled.first() }
}
