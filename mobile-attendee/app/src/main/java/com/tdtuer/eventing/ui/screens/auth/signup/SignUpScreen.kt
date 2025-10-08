package com.tdtuer.eventing.ui.screens.auth.signup

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.facebook.AccessToken
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.components.FacebookLoginButton
import com.tdtuer.eventing.ui.components.GradientButton
import com.tdtuer.eventing.ui.components.OrDivider
import com.tdtuer.eventing.ui.components.SocialLoginButton
import com.tdtuer.eventing.ui.screens.auth.AuthState

@Composable
fun SignUpScreen(
    viewModel: SignUpViewModel = viewModel(),
    onSignUpSuccess: () -> Unit,
    onSignInClick: () -> Unit,
) {
    val authState by viewModel.authState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(authState) {
        when (val state = authState) {
            is AuthState.Success -> {
                Toast.makeText(context, "Sign up successful!", Toast.LENGTH_SHORT).show()
                onSignUpSuccess()
            }

            is AuthState.Error -> {
                Toast.makeText(context, state.message, Toast.LENGTH_SHORT).show()
            }

            else -> { /* No-op for Idle and Loading */
            }
        }
    }

    SignUpContent(
        authState = authState,
        fullName = viewModel.fullName,
        onFullNameChange = viewModel::onFullNameChange,
        email = viewModel.email,
        onEmailChange = viewModel::onEmailChange,
        password = viewModel.password,
        onPasswordChange = viewModel::onPasswordChange,
        passwordVisibility = viewModel.passwordVisibility,
        onPasswordVisibilityToggle = viewModel::onPasswordVisibilityToggle,
        confirmPassword = viewModel.confirmPassword,
        onConfirmPasswordChange = viewModel::onConfirmPasswordChange,
        confirmPasswordVisibility = viewModel.confirmPasswordVisibility,
        onConfirmPasswordVisibilityToggle = viewModel::onConfirmPasswordVisibilityToggle,
        onSignUpClick = viewModel::onSignUpClick,
        onGoogleLoginClick = { viewModel.onGoogleLoginClick(context) },
        onFacebookLoginSuccess = viewModel::onFacebookLoginClick,
        onFacebookLoginError = { errorMessage ->
            val message = errorMessage ?: "Facebook Sign-In failed"
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        },
        onSignInLinkClick = { onSignInClick() }
    )
}

@Composable
private fun SignUpContent(
    authState: AuthState,
    fullName: String,
    onFullNameChange: (String) -> Unit,
    email: String,
    onEmailChange: (String) -> Unit,
    password: String,
    onPasswordChange: (String) -> Unit,
    passwordVisibility: Boolean,
    onPasswordVisibilityToggle: () -> Unit,
    confirmPassword: String,
    onConfirmPasswordChange: (String) -> Unit,
    confirmPasswordVisibility: Boolean,
    onConfirmPasswordVisibilityToggle: () -> Unit,
    onSignUpClick: () -> Unit,
    onGoogleLoginClick: () -> Unit,
    onFacebookLoginSuccess: (AccessToken) -> Unit,
    onFacebookLoginError: (String?) -> Unit,
    onSignInLinkClick: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    Surface(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(onTap = {
                    focusManager.clearFocus()
                })
            },
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .navigationBarsPadding()
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            SignUpHeader(onSignInLinkClick = onSignInLinkClick)
            Spacer(modifier = Modifier.height(24.dp))
            SignUpForm(
                fullName = fullName,
                onFullNameChange = onFullNameChange,
                email = email,
                onEmailChange = onEmailChange,
                password = password,
                onPasswordChange = onPasswordChange,
                passwordVisibility = passwordVisibility,
                onPasswordVisibilityToggle = onPasswordVisibilityToggle,
                confirmPassword = confirmPassword,
                onConfirmPasswordChange = onConfirmPasswordChange,
                confirmPasswordVisibility = confirmPasswordVisibility,
                onConfirmPasswordVisibilityToggle = onConfirmPasswordVisibilityToggle,
                onSignUpClick = onSignUpClick,
                isLoading = authState is AuthState.Loading
            )
            Spacer(modifier = Modifier.height(24.dp))
            OrDivider("Or continue with")
            Spacer(modifier = Modifier.height(24.dp))
            SocialLogins(
                onGoogleLoginClick = onGoogleLoginClick,
                onFacebookLoginSuccess = onFacebookLoginSuccess,
                onFacebookLoginError = onFacebookLoginError
            )
            Spacer(modifier = Modifier.weight(1f))
            SignInRedirect(onSignInLinkClick = onSignInLinkClick)
        }
    }
}

@Composable
private fun SignUpHeader(onSignInLinkClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 32.dp)
    ) {
        IconButton(onClick = onSignInLinkClick) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = "Back to Sign In"
            )
        }
        Text(
            text = "Sign up",
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun SignUpForm(
    fullName: String,
    onFullNameChange: (String) -> Unit,
    email: String,
    onEmailChange: (String) -> Unit,
    password: String,
    onPasswordChange: (String) -> Unit,
    passwordVisibility: Boolean,
    onPasswordVisibilityToggle: () -> Unit,
    confirmPassword: String,
    onConfirmPasswordChange: (String) -> Unit,
    confirmPasswordVisibility: Boolean,
    onConfirmPasswordVisibilityToggle: () -> Unit,
    onSignUpClick: () -> Unit,
    isLoading: Boolean
) {
    // 1. Create FocusRequesters
    val (fullNameFR, emailFR, passwordFR, confirmPasswordFR) = remember { FocusRequester.createRefs() }

    // 2. Auto-focus on the first field
    LaunchedEffect(Unit) {
        fullNameFR.requestFocus()
    }

    Column {
        OutlinedTextField(
            value = fullName,
            onValueChange = onFullNameChange,
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(fullNameFR),
            label = { Text("Full name") },
            leadingIcon = { Icon(Icons.Default.Person, contentDescription = "Full name Icon") },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { emailFR.requestFocus() })
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(emailFR),
            label = { Text("Email") },
            leadingIcon = { Icon(Icons.Default.Email, contentDescription = "Email Icon") },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next
            ),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardActions = KeyboardActions(onNext = { passwordFR.requestFocus() })
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = password,
            onValueChange = onPasswordChange,
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(passwordFR),
            label = { Text("Password") },
            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = "Password Icon") },
            trailingIcon = {
                val icon =
                    if (passwordVisibility) Icons.Filled.Visibility else Icons.Filled.VisibilityOff
                IconButton(onClick = onPasswordVisibilityToggle) {
                    Icon(icon, contentDescription = "Toggle password visibility")
                }
            },
            visualTransformation = if (passwordVisibility) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Next
            ),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardActions = KeyboardActions(onNext = { confirmPasswordFR.requestFocus() })
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = confirmPassword,
            onValueChange = onConfirmPasswordChange,
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(confirmPasswordFR),
            label = { Text("Confirm password") },
            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = "Password Icon") },
            trailingIcon = {
                val icon =
                    if (confirmPasswordVisibility) Icons.Filled.Visibility else Icons.Filled.VisibilityOff
                IconButton(onClick = onConfirmPasswordVisibilityToggle) {
                    Icon(icon, contentDescription = "Toggle confirm password visibility")
                }
            },
            visualTransformation = if (confirmPasswordVisibility) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done
            ),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardActions = KeyboardActions(onDone = { onSignUpClick() })
        )

        Spacer(modifier = Modifier.height(32.dp))

        if (isLoading) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            GradientButton(text = "SIGN UP", onClick = onSignUpClick)
        }
    }
}

@Composable
private fun SocialLogins(
    onGoogleLoginClick: () -> Unit,
    onFacebookLoginSuccess: (AccessToken) -> Unit,
    onFacebookLoginError: (String?) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.Center
    ) {
        SocialLoginButton(
            iconRes = R.drawable.google,
            text = "Google",
            onClick = onGoogleLoginClick
        )
        Spacer(modifier = Modifier.width(16.dp))
        FacebookLoginButton(
            onAuthSuccess = onFacebookLoginSuccess,
            onAuthError = onFacebookLoginError
        )
    }
}

@Composable
private fun SignInRedirect(onSignInLinkClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Text("Already have an account?", fontSize = MaterialTheme.typography.bodyMedium.fontSize)
        TextButton(onClick = onSignInLinkClick) {
            Text(
                "Sign In",
                fontWeight = FontWeight.Bold,
                fontSize = MaterialTheme.typography.bodyLarge.fontSize
            )
        }
    }
}
