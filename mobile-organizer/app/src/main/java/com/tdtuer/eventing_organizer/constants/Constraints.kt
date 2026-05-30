package com.tdtuer.eventing_organizer.constants

object Constraints {
    const val BASE_URL = "https://uncadenced-unmelancholically-elyse.ngrok-free.dev"

    // Cấu hình OneSignal
    const val ONESIGNAL_APP_ID = "YOUR_ONESIGNAL_APP_ID"

    // Cấu hình Firebase Storage
    const val STORAGE_BUCKET_URL = "gs://eventing-baa25.firebasestorage.app"

    // Định nghĩa cấu trúc thư mục trên Storage để tránh lộn xộn
    const val PATH_USERS = "users"
    const val PATH_EVENTS = "events"
    const val PATH_AVATAR = "avatar"
    const val PATH_COVER = "cover"
    const val PATH_UPLOADS = "uploads"

    val vietnameseProvinces = listOf(
        "An Giang", "Bà Rịa - Vũng Tàu", "Bạc Liêu", "Bắc Giang", "Bắc Kạn", "Bắc Ninh",
        "Bến Tre", "Bình Dương", "Bình Định", "Bình Phước", "Bình Thuận", "Cà Mau",
        "Cao Bằng", "Cần Thơ", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên",
        "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội",
        "Hà Tĩnh", "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên",
        "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn",
        "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận",
        "Phú Thọ", "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh",
        "Quảng Trị", "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
        "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh",
        "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
    )
}