package com.tdtuer.eventing.ui.screens.auth.verification

import android.util.Log
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.tdtuer.eventing.ui.theme.EventingTheme

@Composable
fun VerificationScreen(
    viewModel: VerificationViewModel = hiltViewModel(),
    onVerified: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val lifecycleOwner = LocalLifecycleOwner.current

    // Tự động kiểm tra trạng thái mỗi khi người dùng quay lại màn hình (Resume)
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.checkVerificationStatus()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Gửi email xác thực khi màn hình được hiển thị lần đầu tiên
    LaunchedEffect(Unit) {
        viewModel.sendVerificationEmail()
    }

    // Tự động điều hướng khi email đã được xác thực thành công
    LaunchedEffect(uiState.isVerified) {
        if (uiState.isVerified) {
            onVerified()
        }
    }

    VerificationContent(
        uiState = uiState,
        onResendClick = { viewModel.sendVerificationEmail() }
    )
}

@Composable
private fun VerificationContent(
    uiState: VerificationUiState,
    onResendClick: () -> Unit
) {
    Scaffold {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(it)
                .padding(32.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                VerificationHeader()
                Spacer(modifier = Modifier.height(24.dp))
                VerificationActions(
                    uiState = uiState,
                    onResendClick = onResendClick
                )
            }
        }
    }
}

@Composable
private fun VerificationHeader() {
    Text(
        text = "Xác thực Email",
        style = MaterialTheme.typography.headlineMedium
    )
    Spacer(modifier = Modifier.height(16.dp))
    Text(
        text = "Chúng tôi đã gửi một link xác thực đến email của bạn. Vui lòng kiểm tra hộp thư (bao gồm cả mục Spam/Rác).",
        textAlign = TextAlign.Center
    )
}

@Composable
private fun VerificationActions(
    uiState: VerificationUiState,
    onResendClick: () -> Unit
) {

    // Thay thế nút "Tôi đã xác thực" bằng một chỉ báo tự động
    if (uiState.isLoading) {
        CircularProgressIndicator()
    } else {
        Text(
            text = "Đang chờ bạn xác thực...",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center
        )
    }

    Spacer(modifier = Modifier.height(24.dp))

    Button(onClick = onResendClick) {
        Text("Gửi lại email")
    }

    if (uiState.error != null) {
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = uiState.error,
            color = MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center
        )
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun VerificationScreenPreview() {
    EventingTheme {
        VerificationContent(
            uiState = VerificationUiState(
                isLoading = false,
                isVerified = false,
                error = null
            ),
            onResendClick = {}
        )
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun VerificationScreenLoadingPreview() {
    EventingTheme {
        VerificationContent(
            uiState = VerificationUiState(isLoading = true),
            onResendClick = {}
        )
    }
}
