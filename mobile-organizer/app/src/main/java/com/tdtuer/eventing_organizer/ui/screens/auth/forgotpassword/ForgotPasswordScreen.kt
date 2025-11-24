package com.tdtuer.eventing_organizer.ui.screens.auth.forgotpassword

import android.annotation.SuppressLint
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing_organizer.ui.components.GradientButton
import com.tdtuer.eventing_organizer.ui.theme.EventingTheme

@Composable
fun ForgotPasswordScreen(
    viewModel: ForgotPasswordViewModel = viewModel(),
    onBackClick: () -> Unit
) {
    ForgotPasswordContent(
        email = viewModel.email,
        onEmailChange = viewModel::onEmailChange,
        onSendClick = viewModel::onSendClick,
        isLoading = viewModel.isLoading,
        isSuccess = viewModel.isSuccess,
        error = viewModel.error,
        onBackClick = onBackClick
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ForgotPasswordContent(
    email: String,
    onEmailChange: (String) -> Unit,
    onSendClick: () -> Unit,
    isLoading: Boolean,
    isSuccess: Boolean,
    error: String?,
    onBackClick: () -> Unit
) {
    Scaffold(topBar = { ForgotPasswordTopBar(onBackClick) }) { padding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                AnimatedVisibility(!isSuccess) {
                    ForgotPasswordForm(
                        email = email,
                        onEmailChange = onEmailChange,
                        onSendClick = onSendClick,
                        isLoading = isLoading,
                        error = error
                    )
                }

                AnimatedVisibility(isSuccess) {
                    SuccessMessage()
                }
            }
        }
    }
}

@Composable
private fun SuccessMessage() {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "Check Your Inbox!",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "We have sent a password reset link to your email address. Please check your inbox and spam folder.",
            textAlign = TextAlign.Center
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ForgotPasswordTopBar(onBackClick: () -> Unit) {
    TopAppBar(title = {
        Text(
            text = "Forgot Password", fontSize = 28.sp, fontWeight = FontWeight.Bold
        )
    }, navigationIcon = {
        IconButton(onClick = onBackClick) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
        }
    })
}

@Composable
private fun ForgotPasswordHeader() {
    Text(
        text = "Please enter your email address to request a password reset.",
        color = Color.Gray,
        fontSize = MaterialTheme.typography.bodyLarge.fontSize,
        lineHeight = 24.sp
    )
}

@Composable
private fun ForgotPasswordForm(
    email: String,
    onEmailChange: (String) -> Unit,
    onSendClick: () -> Unit,
    isLoading: Boolean,
    error: String?
) {
    Column(
        modifier = Modifier.fillMaxSize(), // Added to make the Column fill the available space
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        ForgotPasswordHeader()
        Spacer(modifier = Modifier.height(32.dp))
        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text("Email") },
            placeholder = { Text("abc@email.com") },
            leadingIcon = { Icon(Icons.Default.Email, contentDescription = "Email Icon") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            isError = error != null
        )
        if (error != null) {
            Text(
                text = error,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
        // This Spacer will now push the button to the bottom
        Spacer(modifier = Modifier.weight(1f))

        if (isLoading) {
            CircularProgressIndicator()
        } else {
            GradientButton(
                text = "SEND", onClick = onSendClick,
                icon = Icons.AutoMirrored.Default.ArrowForward
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
    }
}


@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@Preview(showBackground = true, showSystemUi = true)
@Composable
fun ForgotPasswordScreenPreview() {
    EventingTheme {
        ForgotPasswordContent(
            email = "",
            onEmailChange = {},
            onSendClick = {},
            isLoading = false,
            isSuccess = false,
            error = null,
            onBackClick = {}
        )
    }
}

@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@Preview(showBackground = true, showSystemUi = true)
@Composable
fun ForgotPasswordScreenSuccessPreview() {
    EventingTheme {
        ForgotPasswordContent(
            email = "",
            onEmailChange = {},
            onSendClick = {},
            isLoading = false,
            isSuccess = true,
            error = null,
            onBackClick = {}
        )
    }
}