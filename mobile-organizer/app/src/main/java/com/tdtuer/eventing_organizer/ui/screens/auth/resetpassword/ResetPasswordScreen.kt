package com.tdtuer.eventing_organizer.ui.screens.auth.resetpassword

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.tdtuer.eventing_organizer.ui.theme.EventingTheme

@Composable
fun ResetPasswordScreen(
    viewModel: ResetPasswordViewModel = hiltViewModel(),
    onResetSuccess: () -> Unit
) {
    val uiState = viewModel

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            onResetSuccess()
        }
    }

    ResetPasswordContent(
        newPassword = uiState.newPassword,
        confirmPassword = uiState.confirmPassword,
        isLoading = uiState.isLoading,
        error = uiState.error,
        onNewPasswordChange = viewModel::onNewPasswordChange,
        onConfirmPasswordChange = viewModel::onConfirmPasswordChange,
        onPerformReset = viewModel::performPasswordReset
    )
}

@Composable
private fun ResetPasswordContent(
    newPassword: String,
    confirmPassword: String,
    isLoading: Boolean,
    error: String?,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onPerformReset: () -> Unit
) {
    Scaffold {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(it)
                .padding(32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Set a New Password", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = newPassword,
                onValueChange = onNewPasswordChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("New Password") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                isError = error?.contains("Password", ignoreCase = true) == true
            )
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = confirmPassword,
                onValueChange = onConfirmPasswordChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Confirm Password") },
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                singleLine = true,
                isError = error?.contains("match", ignoreCase = true) == true
            )

            if (error != null) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 16.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onPerformReset,
                enabled = !isLoading,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (isLoading) {
                    CircularProgressIndicator()
                } else {
                    Text("Save New Password")
                }
            }
        }
    }
}

@Preview(showBackground = true, showSystemUi = true, name = "Default State")
@Composable
fun ResetPasswordScreenPreview() {
    EventingTheme {
        ResetPasswordContent(
            newPassword = "",
            confirmPassword = "",
            isLoading = false,
            error = null,
            onNewPasswordChange = {},
            onConfirmPasswordChange = {},
            onPerformReset = {}
        )
    }
}

@Preview(showBackground = true, showSystemUi = true, name = "Error State")
@Composable
fun ResetPasswordScreenErrorPreview() {
    EventingTheme {
        ResetPasswordContent(
            newPassword = "password123",
            confirmPassword = "password456",
            isLoading = false,
            error = "Passwords do not match.",
            onNewPasswordChange = {},
            onConfirmPasswordChange = {},
            onPerformReset = {}
        )
    }
}

@Preview(showBackground = true, showSystemUi = true, name = "Loading State")
@Composable
fun ResetPasswordScreenLoadingPreview() {
    EventingTheme {
        ResetPasswordContent(
            newPassword = "password123",
            confirmPassword = "password123",
            isLoading = true,
            error = null,
            onNewPasswordChange = {},
            onConfirmPasswordChange = {},
            onPerformReset = {}
        )
    }
}
