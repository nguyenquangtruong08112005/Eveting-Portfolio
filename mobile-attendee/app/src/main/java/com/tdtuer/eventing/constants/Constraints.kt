package com.tdtuer.eventing.constants

object Constraints {
    const val BASE_URL = "https://unplug-ferry-spotlight.ngrok-free.dev"


    // Cấu hình OneSignal
    const val ONESIGNAL_APP_ID = "23b5aabf-02d5-4878-8b2c-536f95cf6db6"

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