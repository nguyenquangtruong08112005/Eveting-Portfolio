package com.tdtuer.eventing

import android.app.Application
import com.google.firebase.FirebaseApp
import dagger.hilt.android.HiltAndroidApp

// Đây là annotation Bắt Buộc khi dùng Hilt (không đụng tới)
// Tự động tạo các Hilt components cho toàn bộ app (ApplicationComponent)
// Cho phép inject dependencies vào các Application, Activity, ViewModel, vvvv
@HiltAndroidApp
class MyApp: Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this) // tạo firebase app
    }
}