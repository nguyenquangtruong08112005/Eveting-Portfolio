package com.tdtuer.eventing.ui.navigation


import android.content.Intent
import android.net.Uri
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
import com.tdtuer.eventing.ui.screens.home.HomeScreen
import com.tdtuer.eventing.ui.screens.home.HomeViewModel
import com.tdtuer.eventing.ui.screens.onboarding.OnboardingScreen
import com.tdtuer.eventing.ui.screens.onboarding.OnboardingViewModel
import com.tdtuer.eventing.ui.screens.splash.SplashScreen
import com.tdtuer.eventing.ui.screens.splash.SplashViewModel
import com.yourpackage.ui.navigation.Screen

@Composable
fun RootNavigationGraph(navController: NavHostController, intent: Intent?) {

    // Handle deep links
    LaunchedEffect(intent) {
        val link = intent?.data?.toString()
        if (link != null) {
            val uri = Uri.parse(link)
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

        composable(route = Graph.MAIN_APP) {
            HomeScreen(
                viewModel = hiltViewModel<HomeViewModel>(),
                navController = navController
            )
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
