package com.tdtuer.eventing.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.tdtuer.eventing.MainActivity
import com.tdtuer.eventing.R
import com.tdtuer.eventing.data.network.EventApiService
import com.tdtuer.eventing.data.network.model.UpdateUserRequest
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject
import kotlin.random.Random

@AndroidEntryPoint
class MyFirebaseMessagingService : FirebaseMessagingService() {

    @Inject
    lateinit var apiService: EventApiService

    @Inject
    lateinit var auth: FirebaseAuth

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        //Log.d("FCM", "Refreshed token: $token")
        // Gửi token lên server nếu user đang đăng nhập
        if (auth.currentUser != null) {
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    apiService.updateUserProfile(UpdateUserRequest(fcmToken = token))
                } catch (e: Exception) {
                    {}//Log.e("FCM", "Failed to send token", e)
                }
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        val eventId = remoteMessage.data["eventId"]
        remoteMessage.notification?.let {
            sendNotification(it.title, it.body, eventId)
        }
    }

    private fun sendNotification(title: String?, messageBody: String?, eventId: String?) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            if (eventId != null) {
                data = android.net.Uri.parse("https://eventing.tdtuer.com/events/$eventId")
            }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val channelId = "event_updates_channel"
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(messageBody)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Event Updates",
                NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        notificationManager.notify(Random.nextInt(), notificationBuilder.build())
    }
}