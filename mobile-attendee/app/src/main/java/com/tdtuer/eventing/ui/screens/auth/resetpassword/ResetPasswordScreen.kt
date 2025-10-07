package com.tdtuer.eventing.ui.screens.auth.resetpassword

import android.annotation.SuppressLint
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
import androidx.compose.material.icons.filled.Email
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.ui.components.GradientButton
import com.tdtuer.eventing.ui.theme.EventingTheme

@Composable
fun ResetPasswordScreen(
    viewModel: ResetPasswordViewModel = viewModel(), onBackClick: () -> Unit
) {
    ResetPasswordContent(
        email = viewModel.email,
        onEmailChange = viewModel::onEmailChange,
        onSendClick = viewModel::onSendClick,
        onBackClick = onBackClick
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResetPasswordContent(
    email: String, onEmailChange: (String) -> Unit, onSendClick: () -> Unit, onBackClick: () -> Unit
) {
    Scaffold(
        topBar = { ResetPasswordTopBar(onBackClick) }) { padding ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                ResetPasswordHeader()
                Spacer(modifier = Modifier.height(32.dp))
                ResetPasswordForm(
                    email = email, onEmailChange = onEmailChange, onSendClick = onSendClick
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ResetPasswordTopBar(onBackClick: () -> Unit) {
    TopAppBar(title = {
        Text(
            text = "Reset Password", fontSize = 28.sp, fontWeight = FontWeight.Bold
        )
    }, navigationIcon = {
        IconButton(onClick = onBackClick) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
        }
    })
}

@Composable
private fun ResetPasswordHeader() {
    Text(
        text = "Please enter your email address to request a password reset",
        color = Color.Gray,
        fontSize = MaterialTheme.typography.bodyLarge.fontSize,
        lineHeight = 24.sp
    )
}

@Composable
private fun ResetPasswordForm(
    email: String, onEmailChange: (String) -> Unit, onSendClick: () -> Unit
) {
    OutlinedTextField(
        value = email,
        onValueChange = onEmailChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text("Email") },
        placeholder = { Text("abc@email.com") },
        leadingIcon = { Icon(Icons.Default.Email, contentDescription = "Email Icon") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        singleLine = true,
        shape = RoundedCornerShape(12.dp)
    )
    Spacer(modifier = Modifier.height(40.dp))
    GradientButton(
        text = "SEND", onClick = onSendClick
    )
}


@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@Preview(showBackground = true, showSystemUi = true)
@Composable
fun ResetPasswordScreenPreview() {
    EventingTheme {
        // Since the ViewModel is not available in the preview, we pass empty state and lambdas
        ResetPasswordContent(email = "", onEmailChange = {}, onSendClick = {}, onBackClick = {})
    }
}
