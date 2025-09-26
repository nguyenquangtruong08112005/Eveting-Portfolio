package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.R // Quan trọng: Thay bằng R của project bạn
import com.tdtuer.eventing.ui.theme.EventingTheme

// --- Data Models để biểu diễn các loại thông báo khác nhau ---

// Đại diện cho một mục thông báo
data class NotificationItem(
    val id: Int,
    val userName: String,
    val userAvatarRes: Int,
    val timestamp: String,
    val type: NotificationType
)

// Dùng sealed class để định nghĩa các loại thông báo cụ thể
sealed class NotificationType {
    data class Invite(val eventName: String) : NotificationType()
    object Follow : NotificationType()
    data class Like(val target: String) : NotificationType()
    data class Join(val eventName: String) : NotificationType()
}

// --- Activity ---
class NotificationActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                NotificationScreen()
            }
        }
    }
}

// --- Composable cho toàn bộ màn hình ---

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationScreen() {
    // Dữ liệu mẫu
    val notifications = remember {
        listOf(
            NotificationItem(1, "David Silbia", R.drawable.default_pfp, "Just now", NotificationType.Invite("Jo Malone London's Mother's")),
            NotificationItem(2, "Adnan Safi", R.drawable.default_pfp, "5 min ago", NotificationType.Follow),
            NotificationItem(3, "Joan Baker", R.drawable.default_pfp, "20 min ago", NotificationType.Invite("A virtual Evening of Smooth Jazz")),
            NotificationItem(4, "Ronald C. Kinch", R.drawable.default_pfp, "1 hr ago", NotificationType.Like("you events")),
            NotificationItem(5, "Clara Tolson", R.drawable.default_pfp, "9 hr ago", NotificationType.Join("your Event Gala Music Festival")),
            NotificationItem(6, "Jennifer Fritz", R.drawable.default_pfp, "Tue, 5:10 pm", NotificationType.Invite("International Kids Safe")),
            NotificationItem(7, "Eric G. Prickett", R.drawable.default_pfp, "Wed, 3:30 pm", NotificationType.Follow)
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notification", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { /* Handle back press */ }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Handle more options */ }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More Options")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Color.White
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize(),
            contentPadding = PaddingValues(vertical = 8.dp)
        ) {
            items(notifications) { notification ->
                NotificationItemRow(notification = notification)
                Divider(color = Color.LightGray.copy(alpha = 0.3f), thickness = 1.dp)
            }
        }
    }
}


// --- Composable cho một hàng thông báo ---

@Composable
fun NotificationItemRow(notification: NotificationItem) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            // Avatar
            Image(
                painter = painterResource(id = notification.userAvatarRes),
                contentDescription = "${notification.userName} avatar",
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )

            Spacer(modifier = Modifier.width(12.dp))

            // Cột chứa text và timestamp
            Column(modifier = Modifier.weight(1f)) {
                // Nội dung thông báo
                Text(
                    text = buildAnnotatedString {
                        withStyle(style = SpanStyle(fontWeight = FontWeight.Bold, color = Color.Black)) {
                            append(notification.userName)
                        }
                        append(" ")
                        val actionText = when (val type = notification.type) {
                            is NotificationType.Follow -> "Started following you"
                            is NotificationType.Invite -> "Invite ${type.eventName}"
                            is NotificationType.Join -> "Join ${type.eventName}"
                            is NotificationType.Like -> "Like ${type.target}"
                        }
                        withStyle(style = SpanStyle(color = Color.Gray)) {
                            append(actionText)
                        }
                    },
                    lineHeight = 20.sp,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Timestamp
            Text(
                text = notification.timestamp,
                color = Color.Gray,
                fontSize = 12.sp
            )
        }

        // Các nút Accept/Reject (chỉ hiển thị với loại Invite)
        if (notification.type is NotificationType.Invite) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 52.dp, top = 8.dp), // 40dp (avatar) + 12dp (spacer)
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = { /* Handle Reject */ },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Reject")
                }
                Button(
                    onClick = { /* Handle Accept */ },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5669FF))
                ) {
                    Text("Accept")
                }
            }
        }
    }
}

// --- Preview ---

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun NotificationScreenPreview() {
    EventingTheme {
        NotificationScreen()
    }
}