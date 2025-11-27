package com.tdtuer.eventing_organizer.ui.navigation


import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.core.net.toUri
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import androidx.navigation.navigation
import com.tdtuer.eventing_organizer.ui.screens.admin.AdminDashboardScreen
import com.tdtuer.eventing_organizer.ui.screens.admin.AdminEventDetailScreen
import com.tdtuer.eventing_organizer.ui.screens.auth.forgotpassword.ForgotPasswordScreen
import com.tdtuer.eventing_organizer.ui.screens.auth.forgotpassword.ForgotPasswordViewModel
import com.tdtuer.eventing_organizer.ui.screens.auth.resetpassword.ResetPasswordScreen
import com.tdtuer.eventing_organizer.ui.screens.auth.signin.SignInScreen
import com.tdtuer.eventing_organizer.ui.screens.auth.signin.SignInViewModel
import com.tdtuer.eventing_organizer.ui.screens.auth.signup.SignUpScreen
import com.tdtuer.eventing_organizer.ui.screens.auth.signup.SignUpViewModel
import com.tdtuer.eventing_organizer.ui.screens.auth.verification.VerificationScreen
import com.tdtuer.eventing_organizer.ui.screens.auth.verification.VerificationViewModel
import com.tdtuer.eventing_organizer.ui.screens.createevent.CreateEventScreen
import com.tdtuer.eventing_organizer.ui.screens.dashboard.OrganizerDashboardScreen
import com.tdtuer.eventing_organizer.ui.screens.editevent.EditEventScreen
import com.tdtuer.eventing_organizer.ui.screens.editprofile.EditProfileScreen
import com.tdtuer.eventing_organizer.ui.screens.eventmanagement.EventManagementScreen
import com.tdtuer.eventing_organizer.ui.screens.location.LocationPickerScreen
import com.tdtuer.eventing_organizer.ui.screens.onboarding.OnboardingScreen
import com.tdtuer.eventing_organizer.ui.screens.onboarding.OnboardingViewModel
import com.tdtuer.eventing_organizer.ui.screens.profile.MyProfileScreen
import com.tdtuer.eventing_organizer.ui.screens.scanner.ScannerScreen
import com.tdtuer.eventing_organizer.ui.screens.settings.SettingsScreen
import com.tdtuer.eventing_organizer.ui.screens.splash.SplashScreen
import com.tdtuer.eventing_organizer.ui.screens.splash.SplashViewModel

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
                },
                onNavigateToAdmin = {
                    navController.navigate(Screen.AdminDashboard.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
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

// Tìm hàm này và sửa lại
fun NavGraphBuilder.mainAppGraph(navController: NavHostController) {
    navigation(
        route = Graph.MAIN_APP,
        startDestination = Screen.Dashboard.route // <--- ĐỔI THÀNH DASHBOARD
    ) {
        // Màn hình Dashboard mới
        composable(Screen.Dashboard.route) {
            // Nhớ import OrganizerDashboardScreen vừa tạo
            OrganizerDashboardScreen(navController = navController)
        }

        composable(Screen.CreateEvent.route) {
            CreateEventScreen(navController = navController)
        }

        composable(Screen.LocationPicker.route) {
            LocationPickerScreen(navController = navController)
        }

        composable(Screen.Profile.route) {
            MyProfileScreen(navController = navController)
        }

        composable(Screen.EditProfile.route) {
            EditProfileScreen(navController = navController)
        }

        composable(
            route = Screen.EventManagement.route, // <-- Giờ nó sẽ nhận ra route này
            arguments = listOf(navArgument("eventId") {
                type = NavType.StringType
            })
        ) {
            EventManagementScreen(navController = navController)
        }

        composable(Screen.Scanner.route) {
            ScannerScreen(navController = navController)
        }

        composable(Screen.AdminDashboard.route) {
            AdminDashboardScreen(navController = navController)
        }

        composable(Screen.Settings.route) {
            SettingsScreen(navController = navController)
        }

        composable(
            route = Screen.AdminEventDetail.route,
            arguments = listOf(navArgument("eventId") {
                type = NavType.StringType
            })
        ) {
            AdminEventDetailScreen(navController = navController)
        }

        composable(
            route = Screen.EditEvent.route,
            arguments = listOf(navArgument("eventId") { type = NavType.StringType })
        ) {
            EditEventScreen(navController = navController)
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
                },
//                navController = navController
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
