package com.tdtuer.eventing.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.tdtuer.eventing.MainActivity
import com.tdtuer.eventing.R
// Alias để tránh xung đột tên Result
import com.tdtuer.eventing.domain.model.Result as DomainResult
import com.tdtuer.eventing.domain.model.TicketStatus
import com.tdtuer.eventing.domain.usecase.events.GetEventWeatherUseCase
import com.tdtuer.eventing.domain.usecase.tickets.GetUserTicketsUseCase
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

@HiltWorker
class WeatherNotificationWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val getUserTicketsUseCase: GetUserTicketsUseCase,
    private val getEventWeatherUseCase: GetEventWeatherUseCase
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        // //Log.d("WeatherWorker", "🚀 Worker started...")
        return try {
            checkUpcomingEventWeather()
            // //Log.d("WeatherWorker", "✅ Worker finished successfully!")
            Result.success()
        } catch (e: Exception) {
            // {}//Log.e("WeatherWorker", "❌ Worker failed: ${e.message}")
            Result.failure()
        }
    }

    private suspend fun checkUpcomingEventWeather() {
        // 1. Lấy danh sách vé của user
        var tickets = listOf<com.tdtuer.eventing.domain.model.MyTicketUiModel>()

        // Lấy vé (giả sử limit 50 để check)
        getUserTicketsUseCase(1, 50).collect { result ->
            if (result is DomainResult.Success) {
                tickets = result.data
            }
        }

        if (tickets.isEmpty()) {
            // //Log.d("WeatherWorker", "No tickets found.")
            return
        }

        val currentTime = System.currentTimeMillis()

        // 2. Lọc các vé hợp lệ (PAID/CHECKED_IN) và chưa diễn ra
        val validTickets = tickets.filter { ticket ->
            val isSuccessStatus = ticket.status == TicketStatus.PAID || ticket.status == TicketStatus.CHECKED_IN
            val isFutureEvent = ticket.eventTimestamp > currentTime
            isSuccessStatus && isFutureEvent
        }

        // 3. Xử lý logic theo số ngày còn lại
        validTickets.forEach { ticket ->
            // Tính số ngày còn lại
            val diffMs = ticket.eventTimestamp - currentTime
            val daysLeft = TimeUnit.MILLISECONDS.toDays(diffMs)

            // //Log.d("WeatherWorker", "Event: ${ticket.eventName} - Days left: $daysLeft")

            when (daysLeft) {
                1L -> { // Còn 1 ngày (Ngày mai) -> Gửi báo cáo thời tiết
                    getEventWeatherUseCase(ticket.eventId).collect { weatherResult ->
                        if (weatherResult is DomainResult.Success) {
                            val weather = weatherResult.data

                            val advice = getWeatherAdvice(weather.condition)
                            val title = "📅 Tomorrow: ${ticket.eventName}"
                            val message = "Forecast: ${weather.description} (${weather.temperature}°C). $advice"

                            sendNotification(title, message, ticket.ticketId.hashCode())
                        }
                    }
                }

                3L, 5L -> { // Còn 3 hoặc 5 ngày -> Gửi nhắc nhở
                    val title = "⏳ Upcoming Event: ${ticket.eventName}"
                    val message = "Only $daysLeft days left! Get ready for an amazing experience. Check your ticket now."

                    sendNotification(title, message, ticket.ticketId.hashCode())
                }
            }
        }
    }

    private fun getWeatherAdvice(condition: String): String {
        return when {
            condition.contains("Rain", ignoreCase = true) ||
                    condition.contains("Thunderstorm", ignoreCase = true) ||
                    condition.contains("Drizzle", ignoreCase = true) -> {
                "It might rain 🌧️. Don't forget your raincoat or umbrella!"
            }

            condition.contains("Clear", ignoreCase = true) ||
                    condition.contains("Sun", ignoreCase = true) -> {
                "It's going to be sunny ☀️. Remember to bring sunscreen!"
            }

            condition.contains("Snow", ignoreCase = true) -> {
                "It's snowing ❄️. Stay warm and safe!"
            }

            condition.contains("Clouds", ignoreCase = true) -> {
                "Perfect weather for an event ☁️. Enjoy your time!"
            }

            else -> {
                "Have a wonderful event experience! 🎉"
            }
        }
    }

    private fun sendNotification(title: String, message: String, notificationId: Int) {
        // 1. Kiểm tra quyền (Android 13+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    applicationContext,
                    android.Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                // {}//Log.e("WeatherWorker", "Missing POST_NOTIFICATIONS permission")
                return
            }
        }

        val notificationManager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "weather_alert_channel"

        // 2. Tạo Channel
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Event Reminders & Weather",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for upcoming events and weather alerts"
            }
            notificationManager.createNotificationChannel(channel)
        }

        // 3. Tạo Intent mở App
        val intent = Intent(applicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val pendingIntent: PendingIntent = PendingIntent.getActivity(
            applicationContext,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 4. Build Notification
        val notification = NotificationCompat.Builder(applicationContext, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground) // Đảm bảo icon này tồn tại
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent) // Set action click
            .setAutoCancel(true)
            .build()

        notificationManager.notify(notificationId, notification)
    }
}