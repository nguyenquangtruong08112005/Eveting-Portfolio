package com.tdtuer.eventing.ui.components

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.ui.theme.AppTheme

@Composable
fun EventDetailRow(icon: ImageVector, title: String, subtitle: String) {
    Row(verticalAlignment = Alignment.Top) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(AppTheme.colorScheme.outline), // Màu nền icon
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
