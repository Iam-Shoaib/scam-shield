package com.scamshield.mobile.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// The web app pairs Newsreader (serif display), IBM Plex Sans (body), and
// IBM Plex Mono (cost/signal-hash values) — see app/layout.tsx. Bundling
// those exact font files as static assets is the way to match them
// pixel-for-pixel; until then, generic serif/sans-serif/monospace families
// preserve the same *role split* (serif for verdicts/headings, sans for
// body copy, mono for technical values) without depending on font files
// this project doesn't have.
private val DisplayFont = FontFamily.Serif
private val BodyFont = FontFamily.SansSerif
private val MonoFont = FontFamily.Monospace

val ScamShieldTypography = Typography(
    headlineMedium = TextStyle(fontFamily = DisplayFont, fontWeight = FontWeight.SemiBold, fontSize = 28.sp, lineHeight = 34.sp),
    titleLarge = TextStyle(fontFamily = DisplayFont, fontWeight = FontWeight.SemiBold, fontSize = 22.sp, lineHeight = 28.sp),
    titleMedium = TextStyle(fontFamily = BodyFont, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 22.sp),
    bodyLarge = TextStyle(fontFamily = BodyFont, fontWeight = FontWeight.Normal, fontSize = 15.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontFamily = BodyFont, fontWeight = FontWeight.Normal, fontSize = 13.5.sp, lineHeight = 20.sp),
    bodySmall = TextStyle(fontFamily = BodyFont, fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 17.sp),
    labelLarge = TextStyle(fontFamily = MonoFont, fontWeight = FontWeight.Medium, fontSize = 12.sp, lineHeight = 16.sp),
    labelMedium = TextStyle(fontFamily = MonoFont, fontWeight = FontWeight.Normal, fontSize = 11.sp, lineHeight = 15.sp),
)
