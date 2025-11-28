// ui/navigation/Screen.kt
package com.tdtuer.eventing.ui.navigation

sealed class Screen(val route: String) {
    // Luồng khởi động & xác thực
    data object Splash : Screen("splash_screen")
    data object Onboarding : Screen("onboarding_screen")
    data object AuthDecision :
        Screen("auth_decision_screen") // Màn hình chọn "Sign In" hoặc "Sign Up"

    data object SignIn : Screen("sign_in_screen")
    data object SignUp : Screen("sign_up_screen")
    data object ForgotPassword : Screen("forgot_password_screen")

    // --> ADDED FOR PASSWORD RESET
    data object ResetPassword : Screen("reset_password_screen/{oobCode}") {
        fun createRoute(oobCode: String) = "reset_password_screen/$oobCode"
    }

    data object OtpVerification : Screen("otp_verification_screen")

    data object Verification : Screen("verification_screen")

    // Luồng chính (các tab trong Bottom Navigation Bar)
    data object Home : Screen("home_screen")
    data object Events : Screen("events_screen")
    data object Map : Screen("map_screen")
    data object Profile : Screen("profile_screen")
    data object MyTickets : Screen("my_tickets_screen")

    // Luồng chi tiết sự kiện
    data object EventPreview : Screen("event_preview_screen/{eventId}") {
        fun createRoute(eventId: String) = "event_preview_screen/$eventId"
    }

    data object EventDetails : Screen("event_details_screen/{eventId}") {
        fun createRoute(eventId: String) = "event_details_screen/$eventId"
    }

    data object OrganizerProfile : Screen("organizer_profile_screen/{organizerId}") {
        fun createRoute(organizerId: String) = "organizer_profile_screen/$organizerId"
    }

    data object BookEvent : Screen("book_event_screen/{eventId}?ticketTypes={ticketTypes}") {
        fun createRoute(eventId: String, ticketData: String) =
            "book_event_screen/$eventId?ticketTypes=$ticketData"
    }

    data object Payment : Screen("payment_screen/{ticketId}") {
        fun createRoute(ticketId: String) = "payment_screen/$ticketId"
    }

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

    data object Ticket : Screen("ticket_screen/{ticketId}") {
        fun createRoute(ticketId: String) = "ticket_screen/$ticketId"
    }

    data object PostEvent : Screen("post_event_screen/{eventId}") {
        fun createRoute(eventId: String) = "post_event_screen/$eventId"
    }

    data object Calendar : Screen("calendar_screen") // Đã có màn hình CalendarScreen
    data object Bookmark : Screen("bookmark_screen") // Map với WishlistScreen
    data object HelpFaqs : Screen("help_faqs_screen") // Màn hình mới hoặc webview

    data object FeaturedProfile : Screen("featured_profile_screen/{profileId}") {
        fun createRoute(profileId: String) = "featured_profile_screen/$profileId"
    }}
