package com.tdtuer.eventing

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.navigation.compose.rememberNavController
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.tdtuer.eventing.ui.main.MainViewModel
import com.tdtuer.eventing.ui.navigation.RootNavigationGraph
import com.tdtuer.eventing.ui.theme.EventingTheme
import com.tdtuer.eventing.worker.WeatherNotificationWorker
import dagger.hilt.android.AndroidEntryPoint
import vn.zalopay.sdk.ZaloPaySDK

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
//        testWeatherWorkerImmediate()
        val intent = this.intent
        setContent {
            // 1. Khởi tạo MainViewModel để lắng nghe Theme
            val mainViewModel: MainViewModel = hiltViewModel()
            val isDarkModePreference by mainViewModel.isDarkMode.collectAsState()

            // 2. Quyết định Theme: Nếu user chưa cài đặt (null) thì dùng theo hệ thống
            val useDarkTheme = isDarkModePreference ?: isSystemInDarkTheme()

            // 3. Đăng ký push notification khi startup
            LaunchedEffect(Unit) {
                mainViewModel.registerPushAtStartup()
            }

            EventingTheme(darkTheme = useDarkTheme) {
                // --- UI của bạn ---
                val navController = rememberNavController()
                RootNavigationGraph(navController = navController, intent = intent)
            }
        }
    }

    private fun testWeatherWorkerImmediate() {
        val request = OneTimeWorkRequestBuilder<WeatherNotificationWorker>()
            .build()

        WorkManager.getInstance(this).enqueue(request)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // Khi ZaloPay quay lại, nó sẽ gọi hàm này
        // Chúng ta chuyển intent này cho ZaloPay SDK xử lý
        ZaloPaySDK.getInstance().onResult(intent)
    }
}