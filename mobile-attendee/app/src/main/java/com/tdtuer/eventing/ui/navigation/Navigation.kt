package com.tdtuer.eventing.ui.navigation


import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import androidx.navigation.navigation
import com.tdtuer.eventing.ui.screens.auth.forgotpassword.ForgotPasswordScreen
import com.tdtuer.eventing.ui.screens.auth.forgotpassword.ForgotPasswordViewModel
import com.tdtuer.eventing.ui.screens.auth.resetpassword.ResetPasswordScreen
import com.tdtuer.eventing.ui.screens.auth.signin.SignInScreen
import com.tdtuer.eventing.ui.screens.auth.signin.SignInViewModel
import com.tdtuer.eventing.ui.screens.auth.signup.SignUpScreen
import com.tdtuer.eventing.ui.screens.auth.signup.SignUpViewModel
import com.tdtuer.eventing.ui.screens.auth.verification.VerificationScreen
import com.tdtuer.eventing.ui.screens.auth.verification.VerificationViewModel
import com.tdtuer.eventing.ui.screens.home.MainAppWithDrawer
import com.tdtuer.eventing.ui.screens.home.MainAppWithDrawerViewModel
import com.tdtuer.eventing.ui.screens.onboarding.OnboardingScreen
import com.tdtuer.eventing.ui.screens.onboarding.OnboardingViewModel
import com.tdtuer.eventing.ui.screens.profile.MyProfileScreen
import com.tdtuer.eventing.ui.screens.profile.MyProfileViewModel
import com.tdtuer.eventing.ui.screens.splash.SplashScreen
import com.tdtuer.eventing.ui.screens.splash.SplashViewModel
import androidx.core.net.toUri
import com.tdtuer.eventing.ui.screens.buyticket.BuyTicketScreen
import com.tdtuer.eventing.ui.screens.ticket.BuyTicketViewModel
import com.tdtuer.eventing.ui.screens.editprofile.EditProfileScreen
import com.tdtuer.eventing.ui.screens.editprofile.EditProfileViewModel
import com.tdtuer.eventing.ui.screens.events.EventDetailsScreen
import com.tdtuer.eventing.ui.screens.events.EventDetailsViewModel
import com.tdtuer.eventing.ui.screens.events.EventPreviewScreen
import com.tdtuer.eventing.ui.screens.events.EventPreviewViewModel
import com.tdtuer.eventing.ui.screens.notifications.NotificationScreen
import com.tdtuer.eventing.ui.screens.notifications.NotificationViewModel
import com.tdtuer.eventing.ui.screens.payment.PaymentScreen
import com.tdtuer.eventing.ui.screens.payment.PaymentViewModel
import com.tdtuer.eventing.ui.screens.postevent.PostEventScreen
import com.tdtuer.eventing.ui.screens.postevent.PostEventViewModel
import com.tdtuer.eventing.ui.screens.profile.FeaturedProfileScreen
import com.tdtuer.eventing.ui.screens.profile.FeaturedProfileViewModel
import com.tdtuer.eventing.ui.screens.settings.SettingsScreen
import com.tdtuer.eventing.ui.screens.settings.SettingsViewModel
import com.tdtuer.eventing.ui.screens.ticket.TicketScreen
import com.tdtuer.eventing.ui.screens.ticket.TicketViewModel

@Composable
fun RootNavigationGraph(navController: NavHostController, intent: Intent?) {

// Handle deep links
    LaunchedEffect(intent) {
        val link = intent?.data?.toString()
        if (link != null) {
            val uri = link.toUri()

            // --- NEW LOGIC: Deep Link cho Sự kiện ---
            // Kiểm tra: host phải là eventing.tdtuer.com VÀ path segment đầu tiên là 'events'
            if (uri.host == "eventing.tdtuer.com" && uri.pathSegments.firstOrNull() == "events" && uri.pathSegments.size > 1) {
                val eventIdFromLink = uri.pathSegments[1]

                if (eventIdFromLink.isNotBlank()) {
                    // Điều hướng thẳng đến màn hình chi tiết sự kiện và xóa backstack
                    navController.navigate(Screen.EventDetails.createRoute(eventIdFromLink)) {
                        popUpTo(Graph.ROOT) { inclusive = true }
                    }
                    return@LaunchedEffect // Thoát để không xử lý tiếp các Deep Link khác
                }
            }

            // --- Existing Logic: Firebase Auth Deep Link ---
            val mode = uri.getQueryParameter("mode")
            val oobCode = uri.getQueryParameter("oobCode")

            if (oobCode != null) {
                when (mode) {
                    "resetPassword" -> {
                        navController.navigate(Screen.ResetPassword.createRoute(oobCode))
                    }

                    "verifyEmail" -> {
                        navController.navigate(Screen.Verification.route)
                    }
                }
            }
        }
    }

    NavHost(
        navController = navController,
        route = Graph.ROOT,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                viewModel = hiltViewModel<SplashViewModel>(),
                onNavigateToOnboarding = {
                    navController.navigate(Screen.Onboarding.route) {
                        popUpTo(Screen.Splash.route) {
                            inclusive = true
                        }
                    }
                },
                onNavigateToHome = {
                    navController.navigate(Graph.MAIN_APP) {
                        popUpTo(Screen.Splash.route) {
                            inclusive = true
                        }
                    }
                },
                onNavigateToAuth = {
                    navController.navigate(Graph.AUTHENTICATION) {
                        popUpTo(Screen.Splash.route) {
                            inclusive = true
                        }
                    }
                }
            )
        }

        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                viewModel = hiltViewModel<OnboardingViewModel>(),
                onOnboardingComplete = {
                    navController.navigate(Graph.AUTHENTICATION) {
                        popUpTo(Screen.Onboarding.route) {
                            inclusive = true
                        }
                    }
                }
            )
        }

        authGraph(navController = navController, intent = intent)

        mainAppGraph(navController = navController)
    }
}

fun NavGraphBuilder.mainAppGraph(navController: NavHostController) {
    navigation(
        route = Graph.MAIN_APP,
        // Màn hình bắt đầu là Home (sẽ chứa BottomNavBar)
        startDestination = Screen.Home.route
    ) {

        // 1. Các tab chính (Bottom Navigation Bar)
        // HomeScreen của bạn có thể chứa Scaffold và BottomNavBar
        composable(Screen.Home.route) {
            MainAppWithDrawer(
                viewModel = hiltViewModel<MainAppWithDrawerViewModel>(),
                navController = navController // Dùng navController này để đi đến các màn hình chi tiết
            )
        }

        composable(
            route = Screen.FeaturedProfile.route,
            arguments = listOf(navArgument("profileId") { type = NavType.StringType })
        ) {
            FeaturedProfileScreen(
                viewModel = hiltViewModel<FeaturedProfileViewModel>(),
                navController = navController
            )
        }

        composable(Screen.Profile.route) {
            MyProfileScreen(
                viewModel = hiltViewModel<MyProfileViewModel>(),
            )
        }

        // 2. Luồng chi tiết sự kiện
        composable(
            route = Screen.EventPreview.route,
            arguments = listOf(navArgument("eventId") { type = NavType.StringType })
        ) {
            // val eventId = it.arguments?.getString("eventId")
            // TODO: Tạo EventDetailsScreen(eventId = eventId, navController = navController)
            EventPreviewScreen(
                viewModel = hiltViewModel<EventPreviewViewModel>(),
                navController = navController
            )
        }

        composable(
            route = Screen.EventDetails.route,
            arguments = listOf(navArgument("eventId") { type = NavType.StringType })
        ) {
            EventDetailsScreen(
                viewModel = hiltViewModel<EventDetailsViewModel>(),
                navController = navController
            )
        }

        composable(
            route = Screen.OrganizerProfile.route,
            arguments = listOf(navArgument("organizerId") { type = NavType.StringType })
        ) {
            // TODO: Tạo OrganizerProfileScreen(navController = navController)
            Text("Organizer Profile Screen")
        }

        // 3. Luồng Đặt vé
        composable(
            route = Screen.BookEvent.route,
            arguments = listOf(
                navArgument("eventId") { type = NavType.StringType },
                navArgument("ticketTypes") {
                    type = NavType.StringType
                    nullable = true
                    defaultValue = null
                }
            )
        ) {
            BuyTicketScreen(
                viewModel = hiltViewModel<BuyTicketViewModel>(),
                navController = navController
            )
        }

        composable(
            Screen.Payment.route,
            arguments = listOf(navArgument("ticketId") { type = NavType.StringType })
        ) {
            PaymentScreen(
                viewModel = hiltViewModel<PaymentViewModel>(),
                navController = navController
            )
        }

        composable(Screen.AddCard.route) {
            // TODO: Tạo AddCardScreen(navController = navController)
            Text("Add Card Screen")
        }

        composable(Screen.ReviewSummary.route) {
            // TODO: Tạo ReviewSummaryScreen(navController = navController)
            Text("Review Summary Screen")
        }

        composable(
            route = Screen.Ticket.route,
            arguments = listOf(navArgument("ticketId") { type = NavType.StringType })
        ) {
            TicketScreen(
                viewModel = hiltViewModel<TicketViewModel>(),
                navController = navController
            )
        }

        // 4. Luồng Tìm kiếm
        composable(Screen.Search.route) {
            // TODO: Tạo SearchScreen(navController = navController)
            Text("Search Screen")
        }

        // 5. Luồng Profile & Cài đặt
        composable(Screen.EditProfile.route) {
            EditProfileScreen(
                viewModel = hiltViewModel<EditProfileViewModel>(),
                navController = navController
            )
        }

        composable(Screen.Notifications.route) {
            NotificationScreen(
                navController = navController,
                viewModel = hiltViewModel<NotificationViewModel>()
            )
        }

        composable(Screen.MyBookings.route) {
            // TODO: Tạo MyBookingsScreen(navController = navController)
            Text("My Bookings Screen")
        }

        composable(Screen.Settings.route) {
            SettingsScreen(
                viewModel = hiltViewModel<SettingsViewModel>(),
                navController = navController
            )
        }

        composable(Screen.InviteFriends.route) {
            // TODO: Tạo InviteFriendsScreen(navController = navController)
            Text("Invite Friends Screen")
        }

        composable(
            route = Screen.PostEvent.route,
            arguments = listOf(navArgument("eventId") { type = NavType.StringType })
        ) {
            PostEventScreen(
                viewModel = hiltViewModel<PostEventViewModel>(),
                navController = navController
            )
        }

        // Màn hình Calendar (Đã có code CalendarScreen)
        composable(Screen.Calendar.route) {
            com.tdtuer.eventing.ui.screens.schedule.CalendarScreen(
                viewModel = hiltViewModel()
            )
        }

        // Màn hình Bookmark (Dùng WishlistScreen)
        composable(Screen.Bookmark.route) {
            com.tdtuer.eventing.ui.screens.wishlist.WishlistScreen(
                viewModel = hiltViewModel()
            )
        }

        // Màn hình Help & FAQs (Placeholder)
        composable(Screen.HelpFaqs.route) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Help & FAQs coming soon!")
            }
        }
    }
}

fun NavGraphBuilder.authGraph(navController: NavHostController, intent: Intent?) {
    navigation(
        route = Graph.AUTHENTICATION,
        startDestination = Screen.SignIn.route
    ) {

        composable(Screen.SignIn.route) {
            SignInScreen(
                viewModel = hiltViewModel<SignInViewModel>(),
                onSignInSuccess = {
                    navController.navigate(Graph.MAIN_APP) {
                        popUpTo(Graph.AUTHENTICATION) { inclusive = true }
                    }
                },
                onSignUpClick = {
                    navController.navigate(Screen.SignUp.route) {
                        popUpTo(Screen.SignIn.route) {
                            inclusive = true
                        }
                        launchSingleTop = true
                    }
                },
                onForgotPasswordClick = {
                    navController.navigate(Screen.ForgotPassword.route)
                }
            )
        }
        composable(Screen.SignUp.route) {
            SignUpScreen(
                viewModel = hiltViewModel<SignUpViewModel>(),
                onSignUpSuccess = {
                    navController.navigate(Screen.Verification.route) {
                        popUpTo(Screen.SignUp.route) {
                            inclusive = true
                        }
                    }
                },
                onSignInClick = {
                    navController.navigate(Screen.SignIn.route) {
                        popUpTo(Screen.SignUp.route) {
                            inclusive = true
                        }
                        launchSingleTop = true
                    }
                },
            )
        }

        composable(Screen.ForgotPassword.route) {
            ForgotPasswordScreen(
                viewModel = hiltViewModel<ForgotPasswordViewModel>(),
                onBackClick = { navController.popBackStack() }
            )
        }

        composable(Screen.Verification.route) {
            val viewModel: VerificationViewModel = hiltViewModel<VerificationViewModel>()
            val deepLink = intent?.data?.toString()

            // Handle email verification deep link
            LaunchedEffect(deepLink) {
                val uri = deepLink?.let { Uri.parse(it) }
                if (uri?.getQueryParameter("mode") == "verifyEmail") {
                    viewModel.handleDeepLink(deepLink)
                }
            }

            VerificationScreen(
                viewModel = viewModel,
                onVerified = {
                    navController.navigate(Graph.MAIN_APP) {
                        popUpTo(Graph.AUTHENTICATION) {
                            inclusive = true
                        }
                    }
                }
            )
        }

        // --- NEW SCREEN FOR PASSWORD RESET ---
        composable(
            route = Screen.ResetPassword.route,
            arguments = listOf(navArgument("oobCode") { type = NavType.StringType })
        ) {
            ResetPasswordScreen(
                onResetSuccess = {
                    navController.navigate(Screen.SignIn.route) {
                        // Clear the entire auth backstack and go to Sign In
                        popUpTo(Graph.AUTHENTICATION) { inclusive = true }
                    }
                }
            )
        }
    }
}
