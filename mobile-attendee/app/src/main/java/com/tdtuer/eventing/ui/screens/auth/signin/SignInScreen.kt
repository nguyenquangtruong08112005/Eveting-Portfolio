package com.tdtuer.eventing.ui.screens.auth.signin

import android.widget.Toast
import androidx.compose.foundation.Image
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
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
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
import com.tdtuer.eventing.ui.theme.AppTheme


@Composable
fun SignInScreen(
    viewModel: SignInViewModel = viewModel(),
    onSignInSuccess: () -> Unit,
    onSignUpClick: () -> Unit,
    onForgotPasswordClick: () -> Unit
) {
    val authState by viewModel.authState.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(authState) {
        when (val state = authState) {
            is AuthState.Success -> {
                Toast.makeText(context, "Sign in successful!", Toast.LENGTH_SHORT).show()
                onSignInSuccess()
            }

            is AuthState.Error -> {
                Toast.makeText(context, state.message, Toast.LENGTH_SHORT).show()
            }

            else -> { /* Idle or Loading */
            }
        }
    }

    SignInContent(
        authState = authState,
        email = viewModel.email,
        onEmailChange = viewModel::onEmailChange,
        password = viewModel.password,
        onPasswordChange = viewModel::onPasswordChange,
        passwordVisibility = viewModel.passwordVisibility,
        onPasswordVisibilityToggle = viewModel::onPasswordVisibilityToggle,
        rememberMe = viewModel.rememberMe,
        onRememberMeChange = viewModel::onRememberMeChange,
        onSignInClick = viewModel::onSignInClick,
        onForgotPasswordClick = onForgotPasswordClick,
        onGoogleLoginClick = { viewModel.onGoogleLoginClick(context) },
        onFacebookLoginSuccess = viewModel::onFacebookLoginClick,
        onFacebookLoginError = { error ->
            val message = error ?: "Facebook Sign-In failed"
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        },
        onSignUpClick = onSignUpClick
    )
}

@Composable
private fun SignInContent(
    authState: AuthState,
    email: String,
    onEmailChange: (String) -> Unit,
    password: String,
    onPasswordChange: (String) -> Unit,
    passwordVisibility: Boolean,
    onPasswordVisibilityToggle: () -> Unit,
    rememberMe: Boolean,
    onRememberMeChange: (Boolean) -> Unit,
    onSignInClick: () -> Unit,
    onForgotPasswordClick: () -> Unit,
    onGoogleLoginClick: () -> Unit,
    onFacebookLoginSuccess: (AccessToken) -> Unit,
    onFacebookLoginError: (String?) -> Unit,
    onSignUpClick: () -> Unit
) {
    val focusManager = LocalFocusManager.current
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTapGestures(onTap = {
                        focusManager.clearFocus()
                    })
                }
                .navigationBarsPadding()
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            SignInHeader()
            Spacer(modifier = Modifier.height(16.dp))
            SignInForm(
                email = email,
                onEmailChange = onEmailChange,
                password = password,
                onPasswordChange = onPasswordChange,
                passwordVisibility = passwordVisibility,
                onPasswordVisibilityToggle = onPasswordVisibilityToggle,
                rememberMe = rememberMe,
                onRememberMeChange = onRememberMeChange,
                onSignInClick = onSignInClick,
                onForgotPasswordClick = onForgotPasswordClick,
                isLoading = authState is AuthState.Loading
            )
            Spacer(modifier = Modifier.height(32.dp))
            OrDivider("Or continue with")
            Spacer(modifier = Modifier.height(24.dp))
            SocialLogins(
                onGoogleLoginClick = onGoogleLoginClick,
                onFacebookLoginSuccess = onFacebookLoginSuccess,
                onFacebookLoginError = onFacebookLoginError
            )
            Spacer(modifier = Modifier.weight(1f))
            SignUpRedirect(onSignUpClick = onSignUpClick)
        }
    }
}

@Composable
private fun SignInHeader() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 0.dp, end = 0.dp, top = 15.dp, bottom = 5.dp)
    ) {
        Image(
            painter = painterResource(id = R.drawable.logo),
            contentDescription = "Logo",
            modifier = Modifier.width(150.dp)
        )
        Image(
            painter = painterResource(id = R.drawable.group_33657),
            contentDescription = "Banner",
            modifier = Modifier.width(250.dp)
        )
    }
}

@Composable
private fun SignInForm(
    email: String,
    onEmailChange: (String) -> Unit,
    password: String,
    onPasswordChange: (String) -> Unit,
    passwordVisibility: Boolean,
    onPasswordVisibilityToggle: () -> Unit,
    rememberMe: Boolean,
    onRememberMeChange: (Boolean) -> Unit,
    onSignInClick: () -> Unit,
    onForgotPasswordClick: () -> Unit,
    isLoading: Boolean
) {
    val (emailFR, passwordFR) = remember { FocusRequester.createRefs() }


    Column {
        Text(
            text = "Sign in",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
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
            keyboardActions = KeyboardActions(onNext = { passwordFR.requestFocus() }),
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
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
                imeAction = ImeAction.Done
            ),
            keyboardActions = KeyboardActions(onDone = { onSignInClick() }),
            singleLine = true,
            shape = RoundedCornerShape(12.dp)
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            TextButton(onClick = onForgotPasswordClick) {
                Text(
                    "Forgot password?",
                    fontSize = MaterialTheme.typography.bodyMedium.fontSize,
                    color = AppTheme.extendedColors.textPrimary
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Remember me", fontSize = MaterialTheme.typography.bodyMedium.fontSize)
//                Spacer(modifier = Modifier.width(4.dp))
                Switch(
                    modifier = Modifier.scale(0.8f),
                    checked = rememberMe,
                    onCheckedChange = onRememberMeChange,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = MaterialTheme.colorScheme.primary,
                        checkedTrackColor = MaterialTheme.colorScheme.primaryContainer,
                        uncheckedThumbColor = MaterialTheme.colorScheme.background,
                        uncheckedTrackColor = MaterialTheme.colorScheme.secondaryContainer,
                    ),
                )
            }
        }
        Spacer(modifier = Modifier.height(32.dp))
        if (isLoading) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            GradientButton(
                text = "SIGN IN", onClick = onSignInClick,                icon = Icons.AutoMirrored.Default.ArrowForward

            )
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
private fun SignUpRedirect(onSignUpClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Text("Don't have an account?", fontSize = MaterialTheme.typography.bodyMedium.fontSize)
        TextButton(onClick = onSignUpClick) {
            Text(
                "Sign Up",
                fontWeight = FontWeight.Bold,
                fontSize = MaterialTheme.typography.bodyLarge.fontSize
            )
        }
    }
}
