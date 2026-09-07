package com.scamshield.mobile.ui.components

import android.net.Uri
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.scamshield.mobile.R

/**
 * The same loop shown as the "scan in progress" indicator on the web app
 * and in the Firefox extension's modal (public/Animation.mp4, bundled here
 * as res/raw/animation.mp4).
 */
@OptIn(UnstableApi::class)
@Composable
fun ScanningIndicator(modifier: Modifier = Modifier, sizeDp: Int = 40) {
    val context = LocalContext.current
    val player = remember {
        ExoPlayer.Builder(context).build().apply {
            val uri = Uri.parse("android.resource://${context.packageName}/${R.raw.animation}")
            setMediaItem(MediaItem.fromUri(uri))
            volume = 0f
            repeatMode = Player.REPEAT_MODE_ALL
            prepare()
            playWhenReady = true
        }
    }

    DisposableEffect(Unit) {
        onDispose { player.release() }
    }

    AndroidView(
        modifier = modifier.size(sizeDp.dp).clip(CircleShape),
        factory = {
            PlayerView(it).apply {
                useController = false
                this.player = player
            }
        },
    )
}
