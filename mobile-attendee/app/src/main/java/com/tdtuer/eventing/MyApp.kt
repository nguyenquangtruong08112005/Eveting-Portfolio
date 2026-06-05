package com.tdtuer.eventing

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.onesignal.OneSignal
import com.tdtuer.eventing.constants.Constraints
import dagger.hilt.android.HiltAndroidApp
import vn.zalopay.sdk.Environment
import vn.zalopay.sdk.ZaloPaySDK
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.tdtuer.eventing.worker.WeatherNotificationWorker
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@HiltAndroidApp
class MyApp: Application(), Configuration.Provider {
    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override fun onCreate() {
        super.onCreate()

        // Khởi tạo OneSignal (chỉ khi có App ID hợp lệ)
        val oneSignalAppId = Constraints.ONESIGNAL_APP_ID
        if (oneSignalAppId.isNotBlank() && oneSignalAppId != "YOUR_ONESIGNAL_APP_ID") {
            OneSignal.initWithContext(this, oneSignalAppId)
        }

        ZaloPaySDK.init(554, Environment.SANDBOX)
        setupWeatherWorker()
    }

    private fun setupWeatherWorker() {
        val workRequest = PeriodicWorkRequestBuilder<WeatherNotificationWorker>(
            12, TimeUnit.HOURS // Chạy mỗi 12 tiếng
        ).build()

        WorkManager.getInstance(this).enqueue(workRequest)
    }

    override fun getWorkManagerConfiguration() =
        Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

}