package com.scamshield.mobile.ui.components

/**
 * True when more than half the miner calls for a scan failed/errored —
 * mirrors isMajorityFailed in components/Badge.tsx on the web app. A scan
 * like that carries too little signal to trust the stored verdict, so it
 * gets shown as "Inconclusive" with a retry option instead.
 */
fun isMajorityFailed(total: Int, failed: Int): Boolean {
    if (total == 0) return false
    return failed.toDouble() / total > 0.5
}
