package com.tdtuer.eventing.ui.navigation


import androidx.compose.runtime.Composable
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import androidx.navigation.navigation
import com.tdtuer.eventing.ui.screens.auth.signin.SignInScreen
import com.tdtuer.eventing.ui.screens.auth.signin.SignInViewModel
import com.tdtuer.eventing.ui.screens.auth.signup.SignUpScreen
import com.tdtuer.eventing.ui.screens.auth.signup.SignUpViewModel
import com.tdtuer.eventing.ui.screens.home.HomeScreen
import com.tdtuer.eventing.ui.screens.home.HomeViewModel
import com.tdtuer.eventing.ui.screens.onboarding.OnboardingScreen
import com.tdtuer.eventing.ui.screens.splash.SplashScreen
import com.tdtuer.eventing.ui.screens.splash.SplashViewModel
import com.tdtuer.eventing.ui.screens.onboarding.OnboardingViewModel
import com.yourpackage.ui.navigation.Screen

@Composable
fun RootNavigationGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        route = Graph.ROOT,
        startDestination = Screen.Splash.route
    ) {
        composable(Screen.Splash.route) {
            SplashScreen(
                viewModel = hiltViewModel<SplashViewModel>(),
                onNavigateToOnboarding = {
                    // Điều hướng thẳng đến màn hình Onboarding
                    navController.navigate(Screen.Onboarding.route) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToHome = {
                    navController.navigate(Graph.MAIN_APP) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                },
                onNavigateToAuth = {
                    // Điều hướng đến đồ thị con Xác thực
                    navController.navigate(Graph.AUTHENTICATION) {
                        popUpTo(Screen.Splash.route) { inclusive = true }
                    }
                }
            )
        }

        // Onboarding giờ là một màn hình riêng biệt ở cấp cao nhất
        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                viewModel = hiltViewModel<OnboardingViewModel>(),
                onOnboardingComplete = {
                    // Sau khi onboarding xong, điều hướng đến luồng xác thực
                    navController.navigate(Graph.AUTHENTICATION) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }

        // Đồ thị con cho luồng Xác thực
        authGraph(navController = navController)

        composable(route = Graph.MAIN_APP) {
            HomeScreen(
                viewModel = hiltViewModel<HomeViewModel>(),
                navController = navController
            )
        }
    }
}


/**
 * Đồ thị con quản lý tất cả các màn hình liên quan đến Đăng nhập, Đăng ký.
 */
fun NavGraphBuilder.authGraph(navController: NavHostController) {
    navigation(
        route = Graph.AUTHENTICATION,
        // Điểm bắt đầu hợp lý là màn hình Đăng nhập
        startDestination = Screen.SignUp.route
    ) {
        // KHÔNG còn màn hình Onboarding ở đây
        composable(Screen.AuthDecision.route) { /* AuthDecisionScreen(navController) */ }
        composable(Screen.SignIn.route) { SignInScreen(viewModel = hiltViewModel<SignInViewModel>()) }
        composable(Screen.SignUp.route) {
            SignUpScreen(
                viewModel = hiltViewModel<SignUpViewModel>(),
                onSignUpSuccess = {
                    // Điều hướng sau khi đăng ký thành công
                    navController.navigate(Graph.MAIN_APP) {
                        popUpTo(Screen.SignUp.route) { inclusive = true }
                    }
                },
                onSignInClick = {
                    navController.navigate(Screen.SignIn.route)
                },
            )
        }
        composable(Screen.ForgotPassword.route) { /* ForgotPasswordScreen(navController) */ }
        composable(Screen.OtpVerification.route) { /* OtpVerificationScreen(navController) */ }
    }
}

/**
 * NavHost cho các màn hình chính sau khi đăng nhập
 * Bao gồm các tab của Bottom Bar và các màn hình chi tiết khác.
 */

@Composable
fun MainAppNavGraph(navController: NavHostController) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        // 4 màn hình tab chính
        composable(Screen.Home.route) { HomeScreen(
            viewModel = hiltViewModel<HomeViewModel>(),
            navController = navController
        ) }
        composable(Screen.Events.route) { /* EventsScreen(navController) */ }
        composable(Screen.Map.route) { /* MapScreen(navController) */ }
        composable(Screen.Profile.route) { /* MyProfileScreen(navController) */ }

        // Các màn hình chi tiết được mở từ các tab
        composable(
            route = Screen.EventDetails.route,
            arguments = listOf(navArgument("eventId") { type = NavType.StringType })
        ) { /* EventDetailsScreen(navController, eventId = ...) */ }

        composable(Screen.Search.route) { /* SearchScreen(navController) */ }
        composable(Screen.Notifications.route) { /* NotificationsScreen(navController) */ }
        composable(Screen.MyBookings.route) { /* MyBookingsScreen(navController) */ }
        // ... và các màn hình khác trong luồng chính
    }
}