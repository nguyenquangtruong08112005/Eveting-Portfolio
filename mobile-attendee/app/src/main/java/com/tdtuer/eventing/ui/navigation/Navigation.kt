package com.tdtuer.eventing.ui.navigation


import android.content.Intent
import android.net.Uri
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.tdtuer.eventing.ui.screens.events.EventDetailsScreen
import com.tdtuer.eventing.ui.screens.events.EventDetailsViewModel
import com.tdtuer.eventing.ui.screens.events.EventPreviewScreen
import com.tdtuer.eventing.ui.screens.events.EventPreviewViewModel
import com.tdtuer.eventing.ui.screens.notifications.NotificationScreen
import com.tdtuer.eventing.ui.screens.notifications.NotificationViewModel

@Composable
fun RootNavigationGraph(navController: NavHostController, intent: Intent?) {

    // Handle deep links
    LaunchedEffect(intent) {
        val link = intent?.data?.toString()
        if (link != null) {
            val uri = link.toUri()
            val mode = uri.getQueryParameter("mode")
            val oobCode = uri.getQueryParameter("oobCode")

            if (oobCode != null) {
                when (mode) {
                    "resetPassword" -> {
                        navController.navigate(Screen.ResetPassword.createRoute(oobCode))
                    }

                    "verifyEmail" -> {
                        // The verification link is handled inside VerificationScreen
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
            // LƯU Ý: HomeScreen của bạn có thể cần chứa một NavHost nội bộ
            // để quản lý việc chuyển đổi giữa 4 tab (Home, Events, Map, Profile).
            // HOẶC, bạn có thể triển khai BottomNavBar ở cấp Activity
            // và dùng navController này để điều hướng 4 tab.
            // Tệp MainAppWithDrawer.kt của bạn cho thấy bạn đang
            // đi theo hướng một Scaffold chính.
        }

        composable(Screen.Events.route) {
            // TODO: Tạo EventsScreen()
            Text("Events Screen")
        }

        composable(Screen.Map.route) {
            // TODO: Tạo MapScreen()
            Text("Map Screen")
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
            arguments = listOf(navArgument("eventId") { type = NavType.StringType })
        ) {
            // TODO: Tạo BookEventScreen(navController = navController)
            Text("Book Event Screen")
        }

        composable(Screen.SelectPayment.route) {
            // TODO: Tạo SelectPaymentScreen(navController = navController)
            Text("Select Payment Screen")
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
            route = Screen.BookingConfirmation.route,
            arguments = listOf(navArgument("ticketId") { type = NavType.StringType })
        ) {
            // TODO: Tạo BookingConfirmationScreen(navController = navController)
            Text("Booking Confirmation Screen")
        }

        // 4. Luồng Tìm kiếm
        composable(Screen.Search.route) {
            // TODO: Tạo SearchScreen(navController = navController)
            Text("Search Screen")
        }

        // 5. Luồng Profile & Cài đặt
        composable(Screen.EditProfile.route) {
            // TODO: Tạo EditProfileScreen(navController = navController)
            Text("Edit Profile Screen")
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
            // TODO: Tạo SettingsScreen(navController = navController)
            Text("Settings Screen")
        }

        composable(Screen.InviteFriends.route) {
            // TODO: Tạo InviteFriendsScreen(navController = navController)
            Text("Invite Friends Screen")
        }

        // (Thêm các màn hình còn lại trong Screen.kt vào đây)
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
