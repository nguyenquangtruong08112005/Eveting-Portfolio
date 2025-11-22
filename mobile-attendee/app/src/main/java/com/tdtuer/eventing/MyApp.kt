package com.tdtuer.eventing

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.Configuration
import com.google.firebase.FirebaseApp
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
        FirebaseApp.initializeApp(this) // tạo firebase app

        ZaloPaySDK.init(554, Environment.SANDBOX)
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