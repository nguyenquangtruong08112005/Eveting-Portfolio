package com.tdtuer.eventing.ui.screens.eventchat

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your drawable resources
import com.tdtuer.eventing.ui.theme.EventingTheme

@Composable
fun EventChatScreen(viewModel: EventChatViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        bottomBar = {
            MessageInputBar(
                message = uiState.currentMessage,
                onMessageChange = viewModel::onCurrentMessageChange,
                onSendMessage = viewModel::onSendMessageClick
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) {
            // Header that looks like a bottom sheet
            EventChatHeader(eventName = uiState.eventName, onMoreOptionsClick = viewModel::onMoreOptionsClick)

            // Message List
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                reverseLayout = true
            ) {
                items(uiState.messages.reversed()) { message ->
                    if (message.sender.id == uiState.currentUserId) {
                        OutgoingMessageRow(message = message)
                    } else {
                        IncomingMessageRow(message = message)
                    }
                }
            }
        }
    }
}

// --- Custom Composables for this Screen ---

@Composable
private fun EventChatHeader(eventName: String, onMoreOptionsClick: () -> Unit) {
    Surface(
        shadowElevation = 4.dp,
        shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceVariant),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Drag Handle
            Box(
                modifier = Modifier
                    .padding(vertical = 12.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.outlineVariant)
            )
            Text("Messages", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider()
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(eventName, fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.weight(1f))
                IconButton(onClick = onMoreOptionsClick) {
                    Icon(Icons.Default.MoreVert, contentDescription = "More Options")
                }
            }
        }
    }
}

@Composable
private fun IncomingMessageRow(message: EventChatMessage) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Top // FIX: Use verticalAlignment for a Row, not crossAxisAlignment
    ) {
        Image(
            painter = painterResource(id = message.sender.avatarRes),
            contentDescription = "Sender Avatar",
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
        )
        Column(horizontalAlignment = Alignment.Start) {
            Text(
                text = "${message.sender.name}  •  ${message.timestamp}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 12.dp, bottom = 4.dp)
            )
            MessageBubble(
                message = message,
                isOutgoing = false
            )
        }
    }
}

@Composable
private fun OutgoingMessageRow(message: EventChatMessage) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.End
    ) {
        Text(
            text = message.timestamp,
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(end = 12.dp, bottom = 4.dp)
        )
        MessageBubble(message = message, isOutgoing = true)
    }
}


@Composable
private fun MessageBubble(message: EventChatMessage, isOutgoing: Boolean) {
    val backgroundColor = if (isOutgoing) MaterialTheme.colorScheme.primary else Color.White
    val textColor = if (isOutgoing) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    val bubbleShape = if (isOutgoing) {
        RoundedCornerShape(20.dp, 4.dp, 20.dp, 20.dp)
    } else {
        RoundedCornerShape(4.dp, 20.dp, 20.dp, 20.dp)
    }

    Surface(
        shape = bubbleShape,
        color = backgroundColor,
        shadowElevation = 2.dp,
        modifier = Modifier.padding(
            // Removed padding from here to let the parent Row/Column handle spacing
        )
    ) {
        Column(modifier = Modifier.padding(if (message.text != null) 16.dp else 8.dp)) {
            if (message.text != null) {
                Text(text = message.text, color = textColor, fontSize = 16.sp)
            }
            if (message.imageAttachments.isNotEmpty()) {
                Spacer(modifier = Modifier.height(if (message.text != null) 8.dp else 0.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(message.imageAttachments) { imageRes ->
                        Image(
                            painter = painterResource(id = imageRes),
                            contentDescription = "Attached image",
                            modifier = Modifier
                                .size(100.dp)
                                .clip(RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MessageInputBar(message: String, onMessageChange: (String) -> Unit, onSendMessage: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextField(
                value = message,
                onValueChange = onMessageChange,
                placeholder = { Text("Write a reply...") },
                modifier = Modifier.weight(1f),
                shape = CircleShape,
                colors = TextFieldDefaults.colors(
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                )
            )
            // Add icon buttons for emoji, gallery, attachments here
        }
    }
}

@Preview(showSystemUi = true)
@Composable
fun EventChatScreenPreview() {
    EventingTheme {
        EventChatScreen(viewModel = viewModel())
    }
}