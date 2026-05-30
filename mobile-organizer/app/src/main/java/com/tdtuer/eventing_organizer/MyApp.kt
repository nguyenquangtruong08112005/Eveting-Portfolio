package com.tdtuer.eventing_organizer

import android.app.Application
import com.google.firebase.FirebaseApp
import com.onesignal.OneSignal
import com.tdtuer.eventing_organizer.constants.Constraints
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MyApp: Application(){
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this) // tạo firebase app

        // Khởi tạo OneSignal (chỉ khi có App ID hợp lệ)
        val oneSignalAppId = Constraints.ONESIGNAL_APP_ID
        if (oneSignalAppId.isNotBlank() && oneSignalAppId != "YOUR_ONESIGNAL_APP_ID") {
            OneSignal.initWithContext(this, oneSignalAppId)
        }
    }
}