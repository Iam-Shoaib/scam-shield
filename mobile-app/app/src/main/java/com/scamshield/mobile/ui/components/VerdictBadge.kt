package com.scamshield.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.scamshield.mobile.ui.theme.DarkPalette
import com.scamshield.mobile.ui.theme.LightPalette
import androidx.compose.foundation.isSystemInDarkTheme

// Accepts both vocabularies the API uses: overall verdicts
// (SAFE/SUSPICIOUS/SCAM) and per-miner-call labels (clean/suspicious/malicious/unknown).
@Composable
fun VerdictBadge(verdict: String, modifier: Modifier = Modifier) {
    val dark = isSystemInDarkTheme()
    val (text, fill) = when (verdict.uppercase()) {
        "SAFE", "CLEAN" -> (if (dark) DarkPalette.SafeText else LightPalette.SafeText) to (if (dark) DarkPalette.SafeFill else LightPalette.SafeFill)
        "SUSPICIOUS" -> (if (dark) DarkPalette.SuspiciousText else LightPalette.SuspiciousText) to (if (dark) DarkPalette.SuspiciousFill else LightPalette.SuspiciousFill)
        "SCAM", "MALICIOUS" -> (if (dark) DarkPalette.ScamText else LightPalette.ScamText) to (if (dark) DarkPalette.ScamFill else LightPalette.ScamFill)
        else -> (if (dark) DarkPalette.Steel else LightPalette.Steel) to (if (dark) DarkPalette.PaperRaised else LightPalette.PaperRaised)
    }
    Text(
        text = verdict.lowercase().replaceFirstChar { it.uppercase() },
        color = text,
        style = MaterialTheme.typography.labelLarge,
        modifier = modifier
            .background(fill, RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}
