package com.tdtuer.eventing.ui.screens.eventdetail

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your drawable resources
import com.tdtuer.eventing.ui.components.FacePile
import com.tdtuer.eventing.ui.theme.EventingTheme

@Composable
fun EventDetailScreen(viewModel: EventDetailViewModel) {
    val eventDetails by viewModel.eventDetails.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        // Background Image
        Image(
            painter = painterResource(id = R.drawable.group_34057), // Replace with your image
            contentDescription = "Event Background",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        // Top action icons
        TopActionButtons(
            onBackClick = { viewModel.onBackClick() },
            onFavoriteClick = { viewModel.onFavoriteClick() }
        )

        // Main Content
        LazyColumn(
            modifier = Modifier.fillMaxSize()
        ) {
            // Spacer to push the content card down
            item {
                Spacer(modifier = Modifier.height(200.dp))
            }

            // White content card
            item {
                Surface(
                    shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                    color = Color.White,
                    modifier = Modifier.fillParentMaxHeight()
                ) {
                    Column {
                        FloatingActionButtons(
                            onCallClick = { viewModel.onCallClick() },
                            onDirectionsClick = { viewModel.onDirectionsClick() },
                            onTicketClick = { viewModel.onMyTicketClick() }
                        )
                        eventDetails?.let { details ->
                            EventInfoSection(details, viewModel)
                        }
                    }
                }
            }
        }

        // Bottom "Messages" button
        Button(
            onClick = { viewModel.onMessagesButtonClick() },
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .height(56.dp)
                .align(Alignment.BottomCenter),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF212121),
                contentColor = Color.White
            )
        ) {
            Text(text = "Messages", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        }
    }
}


@Composable
fun TopActionButtons(onBackClick: () -> Unit, onFavoriteClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 48.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(
            onClick = onBackClick,
            modifier = Modifier
                .size(40.dp)
                .background(Color.Black.copy(alpha = 0.3f), CircleShape)
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
        }
        IconButton(
            onClick = onFavoriteClick,
            modifier = Modifier
                .size(40.dp)
                .background(Color.Black.copy(alpha = 0.3f), CircleShape)
        ) {
            Icon(Icons.Default.Favorite, contentDescription = "Favorite", tint = Color(0xFFF44336))
        }
    }
}

@Composable
fun FloatingActionButtons(onCallClick: () -> Unit, onDirectionsClick: () -> Unit, onTicketClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 40.dp)
            .offset(y = (-30).dp), // Pulls the card up
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            ActionButton(icon = Icons.Default.Call, text = "Call", onClick = onCallClick)
            ActionButton(icon = Icons.Default.LocationOn, text = "Directions", onClick = onDirectionsClick)
            ActionButton(icon = Icons.Default.ConfirmationNumber, text = "My Ticket", onClick = onTicketClick)
        }
    }
}

@Composable
fun ActionButton(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        FloatingActionButton(
            onClick = onClick,
            shape = CircleShape,
            containerColor = MaterialTheme.colorScheme.secondaryContainer,
            contentColor = MaterialTheme.colorScheme.onSecondaryContainer,
            elevation = FloatingActionButtonDefaults.elevation(0.dp)
        ) {
            Icon(icon, contentDescription = text)
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(text, fontSize = 12.sp)
    }
}

@Composable
fun EventInfoSection(details: EventDetails, viewModel: EventDetailViewModel) {
    Column(modifier = Modifier.padding(horizontal = 24.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(details.title, fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Surface(
                color = Color(0xFFFFF0E5),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = "BOOKED",
                    color = Color(0xFFF57C00),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.LocationOn, contentDescription = "Location", tint = Color.Gray, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(details.location, color = Color.Gray, fontSize = 14.sp)
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.CalendarToday, contentDescription = "Date", tint = Color.Gray, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(8.dp))
            Text(details.date, color = Color.Gray, fontSize = 14.sp)
        }
        Spacer(modifier = Modifier.height(24.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            FacePile(avatars = details.attendeeAvatars)
            Spacer(modifier = Modifier.width(12.dp))
            Text("${details.memberCount}+ Members are joined:", fontSize = 14.sp)
            Spacer(modifier = Modifier.weight(1f))
            TextButton(onClick = { viewModel.onViewAllInviteClick() }) {
                Text("VIEW ALL / INVITE", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
        HorizontalDivider(modifier = Modifier.padding(vertical = 24.dp))
        OrganizerSection(details.organizer, viewModel)
        HorizontalDivider(modifier = Modifier.padding(vertical = 24.dp))
        DescriptionSection(details.description, viewModel)
        Spacer(modifier = Modifier.height(100.dp)) // Spacer for bottom button overlap
    }
}

@Composable
fun OrganizerSection(organizer: Organizer, viewModel: EventDetailViewModel) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Image(
            painter = painterResource(id = organizer.avatar),
            contentDescription = "Organizer Avatar",
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(organizer.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Text(organizer.title, color = Color.Gray, fontSize = 13.sp)
        }
        Spacer(modifier = Modifier.weight(1f))
        OutlinedButton(
            onClick = { viewModel.onOrganizerChatClick() },
            shape = CircleShape,
            modifier = Modifier.size(40.dp),
            contentPadding = PaddingValues(0.dp),
            border = BorderStroke(1.dp, Color.LightGray)
        ) {
            Icon(Icons.Default.ChatBubble, contentDescription = "Chat", tint = MaterialTheme.colorScheme.primary)
        }
        Spacer(modifier = Modifier.width(8.dp))
        OutlinedButton(
            onClick = { viewModel.onOrganizerCallClick() },
            shape = CircleShape,
            modifier = Modifier.size(40.dp),
            contentPadding = PaddingValues(0.dp),
            border = BorderStroke(1.dp, Color.LightGray)
        ) {
            Icon(Icons.Default.Call, contentDescription = "Call", tint = MaterialTheme.colorScheme.primary)
        }
    }
}

@Composable
fun DescriptionSection(description: String, viewModel: EventDetailViewModel) {
    Column {
        Text("Description", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = description,
            color = Color.Gray,
            fontSize = 14.sp,
            maxLines = 4,
            overflow = TextOverflow.Ellipsis,
            lineHeight = 20.sp
        )
        TextButton(onClick = { viewModel.onReadMoreClick() }) {
            Text("Read More", fontWeight = FontWeight.Bold)
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun EventDetailScreenPreview() {
    EventingTheme {
        EventDetailScreen(viewModel = viewModel())
    }
}