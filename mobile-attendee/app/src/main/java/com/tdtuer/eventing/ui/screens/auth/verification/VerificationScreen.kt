package com.tdtuer.eventing.ui.screens.auth.verification

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.ui.screens.auth.GradientButton
import com.tdtuer.eventing.ui.theme.EventingTheme

class VerificationActivity : ComponentActivity() {
    private val viewModel: VerificationViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                VerificationScreen(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun VerificationScreen(viewModel: VerificationViewModel) {
    val otpValue = viewModel.otpValue
    val timerSeconds = viewModel.timerSeconds
    val isTimerRunning = viewModel.isTimerRunning

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF7F7F7)) // Màu nền xám nhạt
    ) {
        // --- Phần nội dung trên cùng ---
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(24.dp)
        ) {
            IconButton(onClick = { viewModel.onBackNavigationClick() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Spacer(modifier = Modifier.height(24.dp))
            Text(text = "Verification", fontSize = 28.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "We've send you the verification code on +1 2620 0323 7631", // Consider making this dynamic
                color = Color.Gray,
                fontSize = 16.sp,
                lineHeight = 24.sp
            )
            Spacer(modifier = Modifier.height(32.dp))

            // Ô nhập OTP
            OtpInputFields(otpValue = otpValue)

            Spacer(modifier = Modifier.height(32.dp))

            // Nút Continue
            GradientButton(text = "CONTINUE", onClick = { viewModel.onContinueClick() })

            Spacer(modifier = Modifier.height(24.dp))

            // Đếm ngược hoặc nút Re-send
            Text(
                text = if (isTimerRunning) "Re-send code in 0:${String.format("%02d", timerSeconds)}" else "Re-send code",
                color = if (isTimerRunning) Color.Gray else MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .clickable(enabled = !isTimerRunning) { viewModel.onResendCodeClick() }
            )
        }

        // --- Bàn phím số tùy chỉnh ---
        NumberKeypad(
            onNumberClick = { number -> viewModel.onNumberClick(number) },
            onBackspaceClick = { viewModel.onBackspaceClick() }
        )
    }
}

@Composable
fun OtpInputFields(otpValue: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly
    ) {
        (0 until 4).forEach { index ->
            val digit = otpValue.getOrNull(index)?.toString()
            Box(
                modifier = Modifier
                    .size(width = 60.dp, height = 60.dp)
                    .border(
                        width = 1.dp,
                        color = if (digit != null) Color(0xFF5669FF) else Color.LightGray,
                        shape = RoundedCornerShape(12.dp)
                    )
                    .background(Color.White, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = digit ?: "-",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (digit != null) Color.Black else Color.LightGray
                )
            }
        }
    }
}

@Composable
fun NumberKeypad(onNumberClick: (String) -> Unit, onBackspaceClick: () -> Unit) {
    val keys = listOf(
        listOf("1", "2", "3"),
        listOf("4", "5", "6"),
        listOf("7", "8", "9"),
        listOf("", "0", "backspace")
    )
    val letters = mapOf(
        '2' to "ABC", '3' to "DEF", '4' to "GHI", '5' to "JKL",
        '6' to "MNO", '7' to "PQRS", '8' to "TUV", '9' to "WXYZ"
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFFE0E0E0)) // Màu nền bàn phím
            .padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        keys.forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                row.forEach { key ->
                    Box(modifier = Modifier.weight(1f)) {
                        when (key) {
                            "" -> Spacer(modifier = Modifier.size(60.dp)) // Assuming 60.dp is key height
                            "backspace" -> BackspaceKey(onClick = onBackspaceClick)
                            else -> NumberKey(
                                number = key,
                                letters = letters[key.first()] ?: "",
                                onClick = { onNumberClick(key) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun NumberKey(number: String, letters: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(60.dp)
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick),
        color = Color.White,
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = number, fontSize = 22.sp, fontWeight = FontWeight.SemiBold)
            if (letters.isNotEmpty()) {
                Text(text = letters, fontSize = 10.sp, color = Color.Gray)
            }
        }
    }
}

@Composable
fun BackspaceKey(onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(60.dp)
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick),
        color = Color.Transparent, // Nền trong suốt để hòa vào bàn phím
        shape = RoundedCornerShape(8.dp)
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(Icons.Default.Backspace, contentDescription = "Backspace", tint = Color.DarkGray)
        }
    }
}


@Preview(showBackground = true)
@Composable
fun VerificationScreenPreview() {
    EventingTheme {
        VerificationScreen(viewModel = VerificationViewModel())
    }
}
