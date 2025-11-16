package com.tdtuer.eventing

import android.app.Application
import com.google.firebase.FirebaseApp
import dagger.hilt.android.HiltAndroidApp
import vn.zalopay.sdk.Environment
import vn.zalopay.sdk.ZaloPaySDK

@HiltAndroidApp
class MyApp: Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this) // tạo firebase app

        ZaloPaySDK.init(554, Environment.SANDBOX)
    }
}