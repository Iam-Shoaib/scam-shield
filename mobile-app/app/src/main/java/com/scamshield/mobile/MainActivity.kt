package com.scamshield.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.scamshield.mobile.ui.detail.ScanDetailScreen
import com.scamshield.mobile.ui.home.HomeScreen
import com.scamshield.mobile.ui.ledger.LedgerScreen
import com.scamshield.mobile.ui.settings.SettingsScreen
import com.scamshield.mobile.ui.theme.ScamShieldTheme

private const val ROUTE_HOME = "home"
private const val ROUTE_LEDGER = "ledger"
private const val ROUTE_SETTINGS = "settings"
private const val ROUTE_DETAIL = "detail/{scanId}"

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ScamShieldTheme {
                ScamShieldRoot()
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun ScamShieldRoot() {
    val navController = rememberNavController()
    val destinations = listOf(
        Triple(ROUTE_HOME, "Home", Icons.Filled.Home),
        Triple(ROUTE_LEDGER, "Ledger", Icons.Filled.History),
        Triple(ROUTE_SETTINGS, "Settings", Icons.Filled.Settings),
    )

    Scaffold(
        bottomBar = {
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = backStackEntry?.destination
            NavigationBar {
                destinations.forEach { (route, label, icon) ->
                    NavigationBarItem(
                        selected = currentRoute?.hierarchy?.any { it.route == route } == true,
                        onClick = {
                            navController.navigate(route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(icon, contentDescription = label) },
                        label = { Text(label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(navController = navController, startDestination = ROUTE_HOME, modifier = Modifier.padding(padding)) {
            composable(ROUTE_HOME) {
                HomeScreen(onOpenScan = { id -> navController.navigate("detail/$id") })
            }
            composable(ROUTE_LEDGER) {
                LedgerScreen(onOpenScan = { id -> navController.navigate("detail/$id") })
            }
            composable(ROUTE_SETTINGS) {
                SettingsScreen()
            }
            composable(ROUTE_DETAIL) { backStackEntry ->
                val scanId = backStackEntry.arguments?.getString("scanId") ?: return@composable
                ScanDetailScreen(
                    scanId = scanId,
                    onRetried = { newId ->
                        navController.navigate("detail/$newId") {
                            popUpTo(ROUTE_DETAIL) { inclusive = true }
                        }
                    },
                )
            }
        }
    }
}
