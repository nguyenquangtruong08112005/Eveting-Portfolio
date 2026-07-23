package com.tdtuer.eventing_organizer.ui.screens.auth.signup

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
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
import com.tdtuer.eventing_organizer.R
import com.tdtuer.eventing_organizer.ui.components.GradientButton
import com.tdtuer.eventing_organizer.ui.components.OrDivider
import com.tdtuer.eventing_organizer.ui.components.SocialLoginButton
import com.tdtuer.eventing_organizer.ui.screens.auth.AuthState

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
                Toast.makeText(context, state.message, Toast.LENGTH_LONG).show()
            }
            else -> { }
        }
    }

    SignUpContent(
        viewModel = viewModel,
        authState = authState,
        onSignUpClick = viewModel::onSignUpClick,
        onGoogleLoginClick = { viewModel.onGoogleLoginClick(context) },
        onFacebookLoginSuccess = viewModel::onFacebookLoginClick,
        onFacebookLoginError = { Toast.makeText(context, it ?: "Error", Toast.LENGTH_SHORT).show() },
        onSignInLinkClick = { onSignInClick() }
    )
}

@Composable
private fun SignUpContent(
    viewModel: SignUpViewModel, // Truyền ViewModel vào để lấy state
    authState: AuthState,
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
            .pointerInput(Unit) { detectTapGestures(onTap = { focusManager.clearFocus() }) },
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

            SignUpForm(viewModel = viewModel, onSignUpClick = onSignUpClick, isLoading = authState is AuthState.Loading)

            Spacer(modifier = Modifier.height(24.dp))
//            OrDivider("Or continue with")
//            Spacer(modifier = Modifier.height(24.dp))
//            SocialLogins(onGoogleLoginClick, onFacebookLoginSuccess, onFacebookLoginError)
            Spacer(modifier = Modifier.weight(1f))
            SignInRedirect(onSignInLinkClick = onSignInLinkClick)
        }
    }
}

@Composable
private fun SignUpHeader(onSignInLinkClick: () -> Unit) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(top = 32.dp)
    ) {
        IconButton(onClick = onSignInLinkClick) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
        }
        Text("Sign up", fontSize = 28.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun SignUpForm(
    viewModel: SignUpViewModel,
    onSignUpClick: () -> Unit,
    isLoading: Boolean
) {
    val (nameFR, emailFR, passFR, confirmFR) = remember { FocusRequester.createRefs() }

    Column {
        // Basic Info
        OutlinedTextField(
            value = viewModel.fullName,
            onValueChange = viewModel::onFullNameChange,
            modifier = Modifier.fillMaxWidth().focusRequester(nameFR),
            label = { Text("Full name") },
            leadingIcon = { Icon(Icons.Default.Person, null) },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { emailFR.requestFocus() })
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = viewModel.email,
            onValueChange = viewModel::onEmailChange,
            modifier = Modifier.fillMaxWidth().focusRequester(emailFR),
            label = { Text("Email") },
            leadingIcon = { Icon(Icons.Default.Email, null) },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { passFR.requestFocus() })
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = viewModel.password,
            onValueChange = viewModel::onPasswordChange,
            modifier = Modifier.fillMaxWidth().focusRequester(passFR),
            label = { Text("Password") },
            leadingIcon = { Icon(Icons.Default.Lock, null) },
            trailingIcon = {
                IconButton(onClick = viewModel::onPasswordVisibilityToggle) {
                    Icon(if (viewModel.passwordVisibility) Icons.Filled.Visibility else Icons.Filled.VisibilityOff, null)
                }
            },
            visualTransformation = if (viewModel.passwordVisibility) VisualTransformation.None else PasswordVisualTransformation(),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(onNext = { confirmFR.requestFocus() })
        )
        Spacer(modifier = Modifier.height(16.dp))
        OutlinedTextField(
            value = viewModel.confirmPassword,
            onValueChange = viewModel::onConfirmPasswordChange,
            modifier = Modifier.fillMaxWidth().focusRequester(confirmFR),
            label = { Text("Confirm password") },
            leadingIcon = { Icon(Icons.Default.Lock, null) },
            trailingIcon = {
                IconButton(onClick = viewModel::onConfirmPasswordVisibilityToggle) {
                    Icon(if (viewModel.confirmPasswordVisibility) Icons.Filled.Visibility else Icons.Filled.VisibilityOff, null)
                }
            },
            visualTransformation = if (viewModel.confirmPasswordVisibility) VisualTransformation.None else PasswordVisualTransformation(),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done)
        )

        Spacer(modifier = Modifier.height(20.dp))

        // --- ORGANIZER TOGGLE ---
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text("Register as Organizer", fontWeight = FontWeight.Bold)
                Text("Create and manage events", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(
                checked = viewModel.isOrganizerMode,
                onCheckedChange = viewModel::onOrganizerModeChange
            )
        }

        // --- ORGANIZER FIELDS ---
        AnimatedVisibility(visible = viewModel.isOrganizerMode) {
            Column {
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = viewModel.companyName,
                    onValueChange = viewModel::onCompanyNameChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Company / Organization Name*") },
                    leadingIcon = { Icon(Icons.Default.Business, null) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = viewModel.taxCode,
                    onValueChange = viewModel::onTaxCodeChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Tax Code (Optional)") },
                    leadingIcon = { Icon(Icons.Default.Numbers, null) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = viewModel.website,
                    onValueChange = viewModel::onWebsiteChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Website (Optional)") },
                    leadingIcon = { Icon(Icons.Default.Language, null) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = viewModel.description,
                    onValueChange = viewModel::onDescriptionChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Description") },
                    leadingIcon = { Icon(Icons.Default.Description, null) },
                    minLines = 3,
                    shape = RoundedCornerShape(12.dp)
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
                text = if (viewModel.isOrganizerMode) "REGISTER ORGANIZER" else "SIGN UP",
                onClick = onSignUpClick,
                icon = Icons.AutoMirrored.Default.ArrowForward
            )
        }
    }
}

// ... (SocialLogins và SignInRedirect giữ nguyên)
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
//        Spacer(modifier = Modifier.width(16.dp))
//        FacebookLoginButton(
//            onAuthSuccess = onFacebookLoginSuccess,
//            onAuthError = onFacebookLoginError
//        )
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