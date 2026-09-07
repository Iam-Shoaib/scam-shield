package com.scamshield.mobile.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.scamshield.mobile.data.ScanRepository
import com.scamshield.mobile.data.network.ScanEvent

class ScanWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    companion object {
        const val KEY_SENDER = "sender"
        const val KEY_BODY = "body"
        const val KEY_RECEIVED_AT = "receivedAt"
    }

    override suspend fun doWork(): Result {
        val sender = inputData.getString(KEY_SENDER) ?: return Result.failure()
        val body = inputData.getString(KEY_BODY) ?: return Result.failure()
        val receivedAt = inputData.getLong(KEY_RECEIVED_AT, System.currentTimeMillis())

        val repository = ScanRepository(applicationContext)

        return try {
            var failed = false
            repository.scanSms(sender, body, receivedAt) { event ->
                when (event) {
                    is ScanEvent.Done -> {
                        val verdict = event.scan.overallVerdict
                        if (verdict == "SUSPICIOUS" || verdict == "SCAM") {
                            val headline = event.scan.reasonBullets.firstOrNull()
                                ?: "Scam Shield flagged this text — open the app for details."
                            NotificationHelper.notifyVerdict(
                                applicationContext,
                                sender,
                                verdict.lowercase().replaceFirstChar { it.uppercase() },
                                headline,
                                notificationId = event.scan.id.hashCode(),
                            )
                        }
                    }
                    is ScanEvent.Error -> failed = true
                    else -> Unit
                }
            }
            if (failed) Result.retry() else Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }
}
