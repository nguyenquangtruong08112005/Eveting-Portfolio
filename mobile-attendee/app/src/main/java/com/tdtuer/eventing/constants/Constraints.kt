package com.tdtuer.eventing.constants

object Constraints {
    const val BASE_URL = "https://uncadenced-unmelancholically-elyse.ngrok-free.dev"

    // Cấu hình Firebase Storage
    const val STORAGE_BUCKET_URL = "gs://eventing-baa25.firebasestorage.app"

    // Cấu hình OneSignal
    const val ONESIGNAL_APP_ID = "YOUR_ONESIGNAL_APP_ID"

    // Định nghĩa cấu trúc thư mục trên Storage để tránh lộn xộn
    const val PATH_USERS = "users"
    const val PATH_EVENTS = "events"
    const val PATH_AVATAR = "avatar"
    const val PATH_COVER = "cover"
    const val PATH_UPLOADS = "uploads"

    val vietnameseProvinces = listOf(
        "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
        "An Giang", "Bà Rịa - Vũng Tàu"
    )
}