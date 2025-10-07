package com.tdtuer.eventing

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.navigation.compose.rememberNavController
import com.tdtuer.eventing.ui.navigation.RootNavigationGraph
import com.tdtuer.eventing.ui.theme.EventingTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {

        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val intent = this.intent
        setContent {
            EventingTheme {
                val navController = rememberNavController()
                RootNavigationGraph(navController = navController, intent = intent)
            }
        }
    }
}
