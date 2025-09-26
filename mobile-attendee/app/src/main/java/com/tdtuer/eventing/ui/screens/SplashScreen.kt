package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme

class SplashScreenActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                SplashScreen()
            }
        }
    }
}

@Composable
fun SplashScreen() {
    // Tạo một nền gradient nhẹ nhàng từ trên xuống dưới
    val backgroundGradient = Brush.verticalGradient(
        colors = listOf(
            Color.White,
            Color(0xFFF2F6FF), // Màu xanh tím rất nhạt
            Color.White
        )
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(brush = backgroundGradient),
        contentAlignment = Alignment.Center // Căn chỉnh mọi thứ vào chính giữa
    ) {
        // Hiển thị logo của bạn
        Image(
            painter = painterResource(id = R.drawable.default_pfp), // Tên file logo bạn đã lưu
            contentDescription = "EventHub Logo",
            modifier = Modifier.width(200.dp) // Điều chỉnh kích thước logo nếu cần
        )
    }
}

@Preview(showSystemUi = true, showBackground = true)
@Composable
fun SplashScreenPreview() {
    EventingTheme {
        SplashScreen()
    }
}