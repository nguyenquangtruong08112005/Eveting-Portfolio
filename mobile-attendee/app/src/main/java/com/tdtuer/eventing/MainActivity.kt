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
import android.util.Log
import androidx.compose.runtime.LaunchedEffect
import javax.inject.Inject

// --- IMPORT CÁC USECASE MỚI ---
import com.tdtuer.eventing.domain.usecase.events.GetAllEventsUseCase
import com.tdtuer.eventing.domain.usecase.events.GetEventByIdUseCase
import com.tdtuer.eventing.domain.usecase.events.FindNearbyEventsUseCase
import com.tdtuer.eventing.domain.usecase.events.SearchEventsUseCase
import com.tdtuer.eventing.domain.model.Result

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    // --- TIÊM (INJECT) TẤT CẢ USECASE ---
    @Inject
    lateinit var getAllEventsUseCase: GetAllEventsUseCase

    @Inject
    lateinit var getEventByIdUseCase: GetEventByIdUseCase

    @Inject
    lateinit var findNearbyEventsUseCase: FindNearbyEventsUseCase

    @Inject
    lateinit var searchEventsUseCase: SearchEventsUseCase

    override fun onCreate(savedInstanceState: Bundle?) {
        // ... (code 'installSplashScreen' và 'enableEdgeToEdge' của bạn)
        super.onCreate(savedInstanceState)

        val intent = this.intent
        setContent {
            EventingTheme {

                // --- KHỐI TEST LOGCAT ---
                LaunchedEffect(key1 = true) { // Chạy 1 lần duy nhất
                    val TAG = "EventApiTest" // Tag để lọc trong Logcat

                    // --- Test 1: GetAllEvents (Phân trang) ---
                    Log.d(TAG, "[Test 1] Đang gọi GetAllEvents(page=1, limit=5)...")
                    getAllEventsUseCase(page = 1, limit = 5).collect { result ->
                        when (result) {
                            is Result.Success -> Log.d(TAG, "[GetAllEvents] ✅ THÀNH CÔNG: ${result.data.size} events. ${result.data.firstOrNull()?.name}")
                            is Result.Failure -> Log.e(TAG, "[GetAllEvents] ❌ LỖI: ${result.exception.message}")
                            is Result.Loading -> Log.d(TAG, "[GetAllEvents] ⏳ Đang tải...")
                        }
                    }

                    // --- Test 2: GetEventById (Lấy 1 ID cụ thể) ---
                    // (Lấy ID từ JSON mẫu của bạn)
                    val testEventId = "evt_foodfest_saigon_2025"
                    Log.d(TAG, "[Test 2] Đang gọi GetEventById($testEventId)...")
                    getEventByIdUseCase(testEventId).collect { result ->
                        when (result) {
                            is Result.Success -> Log.d(TAG, "[GetEventById] ✅ THÀNH CÔNG: ${result.data.name}. Mô tả: ${result.data.description}...")
                            is Result.Failure -> Log.e(TAG, "[GetEventById] ❌ LỖI: ${result.exception.message}")
                            is Result.Loading -> Log.d(TAG, "[GetEventById] ⏳ Đang tải...")
                        }
                    }

                    // --- Test 3: FindNearbyEvents ---
                    // (Lấy tọa độ gần GEM Center từ JSON mẫu của bạn)
                    val testLat = "15.894895065492118"
                    val testLon = "108.19471678786722"
                    val testRadius = 500.0 // 10km
                    Log.d(TAG, "[Test 3] Đang gọi FindNearbyEvents(lat=$testLat, lon=$testLon)...")
                    findNearbyEventsUseCase(testLat, testLon, testRadius, page = 1, limit = 10).collect { result ->
                        when (result) {
                            is Result.Success -> Log.d(TAG, "[FindNearby] ✅ THÀNH CÔNG: Tìm thấy ${result.data.size} events lân cận.")
                            is Result.Failure -> Log.e(TAG, "[FindNearby] ❌ LỖI: ${result.exception}")
                            is Result.Loading -> Log.d(TAG, "[FindNearby] ⏳ Đang tải...")
                        }
                    }

                    // --- Test 4: SearchEvents ---
                    Log.d(TAG, "[Test 4] Đang gọi SearchEvents(category=music)...")
                    searchEventsUseCase(
                        category = "music", // (Lấy 'music' từ JSON mẫu)
                        date = null, // (Không lọc)
                        sortBy = "date",
                        sortOrder = "asc",
                        page = 1,
                        limit = 5
                    ).collect { result ->
                        when (result) {
                            is Result.Success -> Log.d(TAG, "[SearchEvents] ✅ THÀNH CÔNG: Tìm thấy ${result.data.size} events 'music'.")
                            is Result.Failure -> Log.e(TAG, "[SearchEvents] ❌ LỖI: ${result.exception.message}")
                            is Result.Loading -> Log.d(TAG, "[SearchEvents] ⏳ Đang tải...")
                        }
                    }
                }

                // --- UI của bạn ---
                val navController = rememberNavController()
                RootNavigationGraph(navController = navController, intent = intent)
            }
        }
    }
}