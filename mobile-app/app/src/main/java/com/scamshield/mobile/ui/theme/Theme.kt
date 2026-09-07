package com.scamshield.mobile.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp

// Flat, hairline-bordered, generous whitespace — matches the web app's
// editorial look rather than Material's default elevation/shadow language.
private val ScamShieldShapes = Shapes(
    extraSmall = androidx.compose.foundation.shape.RoundedCornerShape(6.dp),
    small = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(24.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(999.dp),
)

private val LightColors = lightColorScheme(
    background = LightPalette.Paper,
    surface = LightPalette.PaperRaised,
    onBackground = LightPalette.Graphite,
    onSurface = LightPalette.Graphite,
    primary = LightPalette.Graphite,
    onPrimary = LightPalette.Paper,
    secondary = LightPalette.Steel,
    outline = LightPalette.Border,
    error = LightPalette.ScamText,
    errorContainer = LightPalette.ScamFill,
)

private val DarkColors = darkColorScheme(
    background = DarkPalette.Paper,
    surface = DarkPalette.PaperRaised,
    onBackground = DarkPalette.Graphite,
    onSurface = DarkPalette.Graphite,
    primary = DarkPalette.Graphite,
    onPrimary = DarkPalette.Paper,
    secondary = DarkPalette.Steel,
    outline = DarkPalette.Border,
    error = DarkPalette.ScamText,
    errorContainer = DarkPalette.ScamFill,
)

@Composable
fun ScamShieldTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colors,
        typography = ScamShieldTypography,
        shapes = ScamShieldShapes,
        content = content,
    )
}
