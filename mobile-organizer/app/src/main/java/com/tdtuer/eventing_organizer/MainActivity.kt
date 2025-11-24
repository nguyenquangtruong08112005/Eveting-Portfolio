// eventing_organizer/MainActivity.kt
package com.tdtuer.eventing_organizer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController
import com.tdtuer.eventing_organizer.ui.main.MainViewModel
import com.tdtuer.eventing_organizer.ui.navigation.RootNavigationGraph
import com.tdtuer.eventing_organizer.ui.theme.EventingTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val mainViewModel: MainViewModel = hiltViewModel()
            val isDarkModePreference by mainViewModel.isDarkMode.collectAsState()
            val useDarkTheme = isDarkModePreference ?: isSystemInDarkTheme()

            EventingTheme(darkTheme = useDarkTheme) {
                val navController = rememberNavController()
                // Gọi vào Graph điều hướng chính của Organizer
                RootNavigationGraph(navController = navController, intent = intent)
            }
        }
    }
}