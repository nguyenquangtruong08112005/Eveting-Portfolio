package com.tdtuer.eventing.ui.screens.auth.signup

import android.annotation.SuppressLint
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.tdtuer.eventing.ui.screens.auth.AuthState
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.User
import com.tdtuer.eventing.ui.components.GradientButton
import com.tdtuer.eventing.ui.components.OrDivider
import com.tdtuer.eventing.ui.components.SocialLoginButton
import com.tdtuer.eventing.ui.theme.EventingTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class SignUpActivity : ComponentActivity() {
    private val viewModel: SignUpViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                SignUpScreen(viewModel = viewModel, navController = null)
            }
        }
    }
}

@Composable
fun SignUpScreen(viewModel: SignUpViewModel, navController: NavController?) {
    val authState by viewModel.authState.collectAsState()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .navigationBarsPadding() // Thêm khoảng đệm cho thanh điều hướng
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(modifier = Modifier.height(40.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
//                IconButton(onClick = { viewModel.onBackNavigationClick() }) {
//                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
//                }

                Text(
                    text = "Sign up",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = viewModel.fullName,
                onValueChange = { viewModel.onFullNameChange(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Full name") },
                leadingIcon = { Icon(Icons.Default.Person, contentDescription = "Full name Icon") },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = viewModel.email,
                onValueChange = { viewModel.onEmailChange(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = "Email Icon") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = viewModel.password,
                onValueChange = { viewModel.onPasswordChange(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = "Password Icon") },
                trailingIcon = {
                    val icon =
                        if (viewModel.passwordVisibility) Icons.Filled.Visibility else Icons.Filled.VisibilityOff
                    IconButton(onClick = { viewModel.onPasswordVisibilityToggle() }) {
                        Icon(icon, contentDescription = "Toggle password visibility")
                    }
                },
                visualTransformation = if (viewModel.passwordVisibility) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = viewModel.confirmPassword,
                onValueChange = { viewModel.onConfirmPasswordChange(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Confirm password") },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = "Password Icon") },
                trailingIcon = {
                    val icon =
                        if (viewModel.confirmPasswordVisibility) Icons.Filled.Visibility else Icons.Filled.VisibilityOff
                    IconButton(onClick = { viewModel.onConfirmPasswordVisibilityToggle() }) {
                        Icon(icon, contentDescription = "Toggle confirm password visibility")
                    }
                },
                visualTransformation = if (viewModel.confirmPasswordVisibility) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))

            GradientButton(text = "SIGN UP", onClick = { viewModel.onSignUpClick() })
            Spacer(modifier = Modifier.height(24.dp))
            OrDivider()
            Spacer(modifier = Modifier.height(24.dp))
            SocialLoginButton(
                iconRes = R.drawable.google, // SỬA LẠI: Dùng logo Google thực tế
                text = "Login with Google",
                onClick = { viewModel.onGoogleLoginClick() }
            )
            Spacer(modifier = Modifier.height(16.dp))
            SocialLoginButton(
                iconRes = R.drawable.facebook, // SỬA LẠI: Dùng logo Facebook thực tế
                text = "Login with Facebook",
                onClick = { viewModel.onFacebookLoginClick() }
            )

            Spacer(modifier = Modifier.weight(1f))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text("Already have an account?")
                TextButton(onClick = { viewModel.onSignInLinkClick() }) {
                    Text("Sign In", fontWeight = FontWeight.Bold)
                }
            }

            when (authState) {
                is AuthState.Success -> {
                    Text("Sign up successful!")
                }
                is AuthState.Error -> {
                    Text("Error: ${(authState as AuthState.Error).message}")
                }
                AuthState.Loading -> {
                    CircularProgressIndicator()
                }
                AuthState.Idle -> {
                    // Trạng thái ban đầu
                }
            }
        }
    }
}
