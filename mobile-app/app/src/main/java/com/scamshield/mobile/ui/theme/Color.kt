package com.scamshield.mobile.ui.theme

import androidx.compose.ui.graphics.Color

// Ported 1:1 from app/globals.css's design tokens, not stock Material colors.

object LightPalette {
    val Paper = Color(0xFFF4F5F1)
    val PaperRaised = Color(0xFFFCFCFA)
    val Graphite = Color(0xFF20231C)
    val Steel = Color(0xFF5B5F52)
    val Border = Color(0xFFD3D6CB)

    val SafeText = Color(0xFF247B52)
    val SafeFill = Color(0xFFE6F5EE)

    val SuspiciousText = Color(0xFF8B631D)
    val SuspiciousFill = Color(0xFFF5EFE6)

    val ScamText = Color(0xFFC22E3A)
    val ScamFill = Color(0xFFF5E6E7)
}

object DarkPalette {
    val Paper = Color(0xFF121309)
    val PaperRaised = Color(0xFF20231C)
    val Graphite = Color(0xFFF4F5F1)
    val Steel = Color(0xFF959C91)
    val Border = Color(0xFF3A3D34)

    val SafeText = Color(0xFF44BB83)
    val SafeFill = Color(0xFF19382A)

    val SuspiciousText = Color(0xFFC69239)
    val SuspiciousFill = Color(0xFF382D19)

    val ScamText = Color(0xFFD26F77)
    val ScamFill = Color(0xFF38191C)
}
