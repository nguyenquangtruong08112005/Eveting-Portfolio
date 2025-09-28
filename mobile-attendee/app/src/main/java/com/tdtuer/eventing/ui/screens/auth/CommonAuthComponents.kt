package com.tdtuer.eventing.ui.screens.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.border

// Composable chung cho các nút có nền Gradient
@Composable
fun GradientButton(text: String, onClick: () -> Unit) {
    val gradient = Brush.horizontalGradient(listOf(Color(0xFF7A80F2), Color(0xFF9498F7)))
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(gradient, shape = RoundedCornerShape(12.dp))
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(vertical = 16.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = text,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.width(8.dp))
            Icon(
                imageVector = Icons.Default.ArrowForward,
                contentDescription = "Button Arrow",
                tint = Color.White
            )
        }
    }
}

// Composable chung cho dấu gạch "OR"
@Composable
fun OrDivider() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Divider(modifier = Modifier.weight(1f))
        Text(
            text = "OR",
            modifier = Modifier.padding(horizontal = 16.dp),
            color = Color.Gray,
            fontSize = 14.sp
        )
        Divider(modifier = Modifier.weight(1f))
    }
}

// Composable chung cho các nút đăng nhập mạng xã hội
@Composable
fun SocialLoginButton(iconRes: Int, text: String, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        Image(
            painter = painterResource(id = iconRes),
            contentDescription = "$text logo",
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(text, fontWeight = FontWeight.Medium, color = Color.Black)
    }
}

@Composable
fun EventDetailRow(icon: ImageVector, title: String, subtitle: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFFE0E0F8)), // Màu nền icon
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = Color(0xFF5669FF), modifier = Modifier.size(24.dp))
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(title, fontSize = 18.sp, fontWeight = FontWeight.Medium)
            Text(subtitle, fontSize = 14.sp, color = Color.Gray)
        }
    }
}

// Composable chung cho hiệu ứng các avatar xếp chồng
@Composable
fun FacePile(avatars: List<Int>) {
    Box(modifier = Modifier.height(30.dp)) {
        avatars.forEachIndexed { index, avatarRes ->
            Image(
                painter = painterResource(id = avatarRes),
                contentDescription = null,
                modifier = Modifier
                    .size(30.dp)
                    .clip(CircleShape)
                    .border(2.dp, Color.White, CircleShape)
                    .align(Alignment.CenterStart)
                    .offset(x = (index * 20).dp) // Hiệu ứng xếp chồng
            )
        }
    }
}
