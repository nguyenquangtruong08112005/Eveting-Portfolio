package com.tdtuer.eventing.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.border
import com.tdtuer.eventing.ui.theme.AppTheme

// Composable chung cho các nút có nền Gradient
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GradientButton(text: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .background(AppTheme.extendedColors.buttonLinear)
                .padding(vertical = 16.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = text,
                    color = AppTheme.colorScheme.onPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = "Button Arrow",
                    tint = AppTheme.colorScheme.onPrimary
                )
            }
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
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            thickness = DividerDefaults.Thickness,
            color = AppTheme.colorScheme.outlineVariant
        )
        Text(
            text = "OR",
            modifier = Modifier.padding(horizontal = 16.dp),
            color = AppTheme.extendedColors.textSecondary,
            fontSize = 14.sp
        )
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            thickness = DividerDefaults.Thickness,
            color = AppTheme.colorScheme.outlineVariant
        )
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
        Text(text, fontWeight = FontWeight.Medium, color = AppTheme.colorScheme.onSurface)
    }
}

@Composable
fun EventDetailRow(icon: ImageVector, title: String, subtitle: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(AppTheme.colorScheme.secondaryContainer), // Màu nền icon
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = AppTheme.colorScheme.onSecondaryContainer, modifier = Modifier.size(24.dp))
        }
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(title, fontSize = 18.sp, fontWeight = FontWeight.Medium, color = AppTheme.colorScheme.onSurface)
            Text(subtitle, fontSize = 14.sp, color = AppTheme.colorScheme.onSurfaceVariant)
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
                    .border(2.dp, AppTheme.colorScheme.background, CircleShape)
                    .align(Alignment.CenterStart)
                    .offset(x = (index * 20).dp) // Hiệu ứng xếp chồng
            )
        }
    }
}
