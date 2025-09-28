package com.tdtuer.eventing.ui.screens.auth.resetpassword

import android.annotation.SuppressLint
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Email
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.ui.screens.auth.GradientButton
import com.tdtuer.eventing.ui.theme.EventingTheme

class ResetPasswordActivity : ComponentActivity() {
    // Use the viewModels delegate to get a ViewModel instance
    private val viewModel: ResetPasswordViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                // Pass the ViewModel to the screen
                ResetPasswordScreen(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun ResetPasswordScreen(viewModel: ResetPasswordViewModel) {
    // Observe email state from the ViewModel
    val email = viewModel.email

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            // Nút Back
            IconButton(onClick = { /* TODO: Handle back navigation, possibly via ViewModel or directly if simple */ }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Tiêu đề
            Text(
                text = "Reset Password",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Dòng mô tả
            Text(
                text = "Please enter your email address to request a password reset",
                color = Color.Gray,
                fontSize = 16.sp,
                lineHeight = 24.sp
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Trường nhập Email
            OutlinedTextField(
                value = email, // Use email from ViewModel
                onValueChange = { viewModel.onEmailChange(it) }, // Delegate change to ViewModel
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email") },
                placeholder = { Text("abc@email.com") },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = "Email Icon") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Nút SEND (Sử dụng component chung)
            GradientButton(
                text = "SEND", 
                onClick = { viewModel.onSendClick() } // Delegate click to ViewModel
            )
        }
    }
}


@SuppressLint("ViewModelConstructorInComposable")
@Preview(showBackground = true, showSystemUi = true)
@Composable
fun ResetPasswordScreenPreview() {
    EventingTheme {
        // For preview, create a new instance of the ViewModel
        // or use a mock/fake ViewModel if more complex setup is needed.
        ResetPasswordScreen(viewModel = ResetPasswordViewModel())
    }
}
