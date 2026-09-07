package com.scamshield.mobile

import android.app.Application
import androidx.work.Configuration

class ScamShieldApp : Application(), Configuration.Provider {
    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder().build()
}
