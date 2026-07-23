package com.tdtuer.eventing.ui.screens.chat

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.TagFaces
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your drawable resources
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(viewModel: ChatViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            ChatTopBar(
                user = uiState.conversationPartner,
                onBackClick = viewModel::onBackClick,
                onSearchClick = viewModel::onSearchClick,
                onMoreOptionsClick = viewModel::onMoreOptionsClick
            )
        },
        bottomBar = {
            MessageInputBar(
                message = uiState.currentMessage,
                onMessageChange = viewModel::onCurrentMessageChange,
                onSendMessage = viewModel::onSendMessageClick
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            reverseLayout = true // New messages appear at the bottom
        ) {
            items(uiState.messages.reversed()) { message ->
                // This logic can be expanded to show a date separator
                // when the date changes between messages.
                MessageBubble(
                    message = message,
                    isOutgoing = message.senderId == uiState.currentUserId
                )
            }
            item {
                DateSeparator("Today")
            }
        }
    }
}

// --- Custom Composables for this Screen ---

@OptIn(ExperimentalMaterial3Api::class) // <-- FIX IS HERE
@Composable
private fun ChatTopBar(
    user: User?,
    onBackClick: () -> Unit,
    onSearchClick: () -> Unit,
    onMoreOptionsClick: () -> Unit
) {
    TopAppBar(
        title = {
            user?.let {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(
                        painter = painterResource(id = it.avatarRes),
                        contentDescription = "User Avatar",
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(it.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        Text(it.email, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        },
        navigationIcon = {
            IconButton(onClick = onBackClick) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
        },
        actions = {
            IconButton(onClick = onSearchClick) { Icon(Icons.Default.Search, contentDescription = "Search") }
            IconButton(onClick = onMoreOptionsClick) { Icon(Icons.Default.MoreVert, contentDescription = "More") }
        }
    )
}

@Composable
private fun MessageBubble(message: Message, isOutgoing: Boolean) {
    val alignment = if (isOutgoing) Alignment.CenterEnd else Alignment.CenterStart
    val backgroundColor = if (isOutgoing) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    val textColor = if (isOutgoing) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
    val bubbleShape = if (isOutgoing) {
        RoundedCornerShape(20.dp, 4.dp, 20.dp, 20.dp)
    } else {
        RoundedCornerShape(4.dp, 20.dp, 20.dp, 20.dp)
    }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                start = if (isOutgoing) 64.dp else 0.dp,
                end = if (isOutgoing) 0.dp else 64.dp
            ),
        contentAlignment = alignment
    ) {
        Column(horizontalAlignment = if (isOutgoing) Alignment.End else Alignment.Start) {
            Text(message.timestamp, fontSize = 12.sp, color = Color.Gray, modifier = Modifier.padding(bottom = 4.dp, start = 8.dp, end = 8.dp))
            Surface(shape = bubbleShape, color = backgroundColor, shadowElevation = 1.dp) {
                Text(
                    text = message.text,
                    color = textColor,
                    modifier = Modifier.padding(16.dp),
                    fontSize = 16.sp
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MessageInputBar(
    message: String,
    onMessageChange: (String) -> Unit,
    onSendMessage: () -> Unit
) {
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
                ),
                leadingIcon = {
                    Icon(Icons.Default.TagFaces, contentDescription = "Emoji")
                }
            )
            // In a real app, send would be an icon button,
            // but for simplicity, we'll send when the input changes for this demo.
            // Or you can add a dedicated send button here.
        }
    }
}

@Composable
fun DateSeparator(text: String) {
    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant) {
            Text(text = text, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
        }
    }
}

@Preview(showSystemUi = true)
@Composable
fun ChatScreenPreview() {
    EventingTheme {
        ChatScreen(viewModel = viewModel())
    }
}