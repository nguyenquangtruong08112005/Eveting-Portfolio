// ui/navigation/Screen.kt
package com.yourpackage.ui.navigation

sealed class Screen(val route: String) {
    // Luồng khởi động & xác thực
    data object Splash : Screen("splash_screen")
    data object Onboarding : Screen("onboarding_screen")
    data object AuthDecision :
        Screen("auth_decision_screen") // Màn hình chọn "Sign In" hoặc "Sign Up"

    data object SignIn : Screen("sign_in_screen")
    data object SignUp : Screen("sign_up_screen")
    data object ForgotPassword : Screen("forgot_password_screen")
    data object OtpVerification : Screen("otp_verification_screen")

    data object Verification : Screen("verification_screen")

    // Luồng chính (các tab trong Bottom Navigation Bar)
    data object Home : Screen("home_screen")
    data object Events : Screen("events_screen")
    data object Map : Screen("map_screen")
    data object Profile : Screen("profile_screen")

    // Luồng chi tiết sự kiện
    data object EventDetails : Screen("event_details_screen/{eventId}") {
        fun createRoute(eventId: String) = "event_details_screen/$eventId"
    }

    data object OrganizerProfile : Screen("organizer_profile_screen/{organizerId}") {
        fun createRoute(organizerId: String) = "organizer_profile_screen/$organizerId"
    }

    data object BookEvent : Screen("book_event_screen/{eventId}") {
        fun createRoute(eventId: String) = "book_event_screen/$eventId"
    }

    data object SelectPayment : Screen("select_payment_screen")
    data object AddCard : Screen("add_card_screen")
    data object ReviewSummary : Screen("review_summary_screen")
    data object BookingConfirmation : Screen("booking_confirmation_screen/{ticketId}") {
        fun createRoute(ticketId: String) = "booking_confirmation_screen/$ticketId"
    }

    // Luồng tìm kiếm
    data object Search : Screen("search_screen")

    // Luồng Profile & Cài đặt
    data object EditProfile : Screen("edit_profile_screen")
    data object Notifications : Screen("notifications_screen")
    data object MyBookings : Screen("my_bookings_screen")
    data object Settings : Screen("settings_screen")
    data object InviteFriends : Screen("invite_friends_screen")

    // Luồng tạo sự kiện (nếu có)
    data object CreateEventStep1 : Screen("create_event_step1_screen")
    // ... thêm các bước tạo sự kiện khác
}