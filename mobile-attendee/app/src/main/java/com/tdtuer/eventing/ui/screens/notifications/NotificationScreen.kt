package com.tdtuer.eventing.ui.screens.notifications

import android.annotation.SuppressLint
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.tdtuer.eventing.domain.model.Notification
import com.tdtuer.eventing.domain.model.NotificationType
import com.tdtuer.eventing.ui.navigation.Screen
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationScreen(
    viewModel: NotificationViewModel = hiltViewModel(),
    navController: NavHostController
) {
    val notifications by viewModel.notifications.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notifications", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onMoreOptionsClick() }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More Options")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Color.White
    ) { innerPadding ->
        if (isLoading && notifications.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppTheme.colorScheme.primary)
            }
        } else if (!isLoading && notifications.isEmpty()) {
            // Hiển thị màn hình trống nếu không có thông báo
            EmptyNotificationScreen()
        } else {
            LazyColumn(
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize(),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                items(notifications, key = { it.id }) { notification ->
                    NotificationItemRow(
                        notification = notification,
                        onClick = {
                            // 1. Đánh dấu đã đọc
                            viewModel.markAsRead(notification)

                            // 2. Điều hướng nếu có eventId
                            notification.eventId?.let { eventId ->
                                navController.navigate(Screen.EventDetails.createRoute(eventId))
                            }
                        }
                    )
                    HorizontalDivider(
                        color = Color.LightGray.copy(alpha = 0.3f),
                        thickness = 1.dp,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun NotificationItemRow(
    notification: Notification,
    onClick: () -> Unit
) {
    // Xác định màu nền: Chưa đọc thì màu hơi xám/nổi bật, đã đọc thì trắng
    val backgroundColor = if (notification.isRead) Color.White else AppTheme.colorScheme.primary.copy(alpha = 0.05f)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(backgroundColor)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 16.dp),
        verticalAlignment = Alignment.Top
    ) {
        // Icon dựa trên loại thông báo
        NotificationIcon(type = notification.type)

        Spacer(modifier = Modifier.width(16.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Tiêu đề thông báo
                Text(
                    text = notification.title,
                    fontWeight = if (notification.isRead) FontWeight.SemiBold else FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Color.Black,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )

                // Thời gian (ví dụ: "2 hrs ago")
                Text(
                    text = notification.timeAgo,
                    color = Color.Gray,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(start = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(4.dp))

            // Nội dung thông báo
            Text(
                text = notification.message,
                color = if (notification.isRead) Color.Gray else Color.DarkGray,
                fontSize = 14.sp,
                lineHeight = 20.sp,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
fun NotificationIcon(type: NotificationType) {
    val (icon, color) = when (type) {
        NotificationType.REMINDER -> Icons.Default.Notifications to Color(0xFFFF9800) // Cam
        NotificationType.UPDATE -> Icons.Default.Info to Color(0xFF2196F3) // Xanh dương
        NotificationType.PROMOTION -> Icons.Default.LocalOffer to Color(0xFFE91E63) // Hồng
        NotificationType.SYSTEM -> Icons.Default.Settings to Color.Gray
        NotificationType.INVITE -> Icons.Default.PersonAdd to Color(0xFF9C27B0) // Tím
        NotificationType.FOLLOW -> Icons.Default.Person to Color(0xFF4CAF50) // Xanh lá
        NotificationType.LIKE -> Icons.Default.Favorite to Color(0xFFF44336) // Đỏ
        NotificationType.JOIN -> Icons.Default.Event to Color(0xFF3F51B5) // Indigo
        else -> Icons.Default.Notifications to AppTheme.colorScheme.primary
    }

    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .background(color.copy(alpha = 0.1f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(24.dp)
        )
    }
}

@Preview(showBackground = true)
@Composable
fun NotificationScreenPreview() {
    EventingTheme {
        // Preview UI tĩnh (không cần ViewModel thực)
        // Lưu ý: Để preview hoạt động tốt, bạn nên tách Content ra khỏi logic ViewModel như các màn hình khác
    }
}