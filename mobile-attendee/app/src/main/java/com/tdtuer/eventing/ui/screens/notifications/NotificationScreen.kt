package com.tdtuer.eventing.ui.screens.notifications

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items // Keep this import
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
// R class import is still needed for resources used directly in UI if any
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme
// NotificationItem and NotificationType are now in NotificationViewModel.kt

// --- Activity ---
class NotificationActivity : ComponentActivity() {
    private val viewModel: NotificationViewModel by viewModels() // Use ViewModel delegate

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                NotificationScreen(viewModel = viewModel) // Pass ViewModel
            }
        }
    }
}

// --- Composable cho toàn bộ màn hình ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationScreen(viewModel: NotificationViewModel) { // Accept ViewModel
    val notifications by viewModel.notifications // Observe notifications from ViewModel

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notification", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackPress() }) { // Delegate to ViewModel
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onMoreOptionsClick() }) { // Delegate to ViewModel
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
            items(notifications, key = { it.id }) { notification ->
                NotificationItemRow(
                    notification = notification,
                    onAcceptInvite = { viewModel.onAcceptInvite(notification.id) }, // Delegate
                    onRejectInvite = { viewModel.onRejectInvite(notification.id) }  // Delegate
                )
                Divider(color = Color.LightGray.copy(alpha = 0.3f), thickness = 1.dp)
            }
        }
    }
}


// --- Composable cho một hàng thông báo ---
@Composable
fun NotificationItemRow(
    notification: NotificationItem,
    onAcceptInvite: () -> Unit,
    onRejectInvite: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top
        ) {
            Image(
                painter = painterResource(id = notification.userAvatarRes),
                contentDescription = "${notification.userName} avatar",
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = buildAnnotatedString {
                        withStyle(style = SpanStyle(fontWeight = FontWeight.Bold, color = Color.Black)) {
                            append(notification.userName)
                        }
                        append(" ")
                        val actionText = when (val type = notification.type) {
                            is NotificationType.Follow -> "Started following you"
                            is NotificationType.Invite -> "Invite you to ${type.eventName}" // Updated text for clarity
                            is NotificationType.Join -> "Joined ${type.eventName}"
                            is NotificationType.Like -> "Liked ${type.target}"
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
            Text(
                text = notification.timestamp,
                color = Color.Gray,
                fontSize = 12.sp
            )
        }

        if (notification.type is NotificationType.Invite) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 52.dp, top = 8.dp), // 40dp (avatar) + 12dp (spacer)
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onRejectInvite,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Reject")
                }
                Button(
                    onClick = onAcceptInvite,
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
        // For preview, create a new instance of the ViewModel
        NotificationScreen(viewModel = NotificationViewModel())
    }
}
