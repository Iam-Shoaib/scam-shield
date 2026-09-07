package com.scamshield.mobile.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.scamshield.mobile.data.settings.ProtectionSettings
import com.scamshield.mobile.worker.ScanWorker

/**
 * Receives incoming SMS and, only when the user has protection turned on,
 * hands the message off to WorkManager for scanning. The receiver itself
 * only gets a few seconds of guaranteed execution and /api/scan can take up
 * to 5 minutes, so it never makes the network call inline.
 */
class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        // Fast local read, not a network call — acceptable to block on here.
        val protectionEnabled = ProtectionSettings(context).protectionEnabledBlocking()
        if (!protectionEnabled) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        if (messages.isEmpty()) return

        val sender = messages.first().originatingAddress ?: "unknown"
        val body = messages.joinToString("") { it.messageBody ?: "" }
        if (body.isBlank()) return

        val pendingResult = goAsync()
        try {
            val input = Data.Builder()
                .putString(ScanWorker.KEY_SENDER, sender)
                .putString(ScanWorker.KEY_BODY, body)
                .putLong(ScanWorker.KEY_RECEIVED_AT, System.currentTimeMillis())
                .build()
            val request = OneTimeWorkRequestBuilder<ScanWorker>()
                .setInputData(input)
                .build()
            WorkManager.getInstance(context).enqueue(request)
        } finally {
            pendingResult.finish()
        }
    }
}
