package com.scamshield.mobile.data

// Mirrors firefox-extension/config.js's pattern: one place that knows the
// backend origin, with an easy override for local dev.
object Config {
    const val DEFAULT_API_ORIGIN = "https://scam-shield-rouge.vercel.app"

    // Message-only miners, no per-URL/email/IP fan-out — matches the web
    // app's "Essentials" preset (components/ScanForm.tsx SPEND_PRESETS).
    // SMS scans run automatically and in volume, unlike a deliberate
    // one-off web/extension check, so mobile defaults to the cheapest tier.
    const val DEFAULT_MAX_SPEND_USD = 0.15
}
