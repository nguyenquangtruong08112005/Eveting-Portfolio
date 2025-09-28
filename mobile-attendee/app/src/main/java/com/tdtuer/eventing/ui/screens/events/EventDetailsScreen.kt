package com.tdtuer.eventing.ui.screens.events

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
// R class import is crucial, ensure it's correct and project is synced
import com.tdtuer.eventing.ui.screens.auth.EventDetailRow
import com.tdtuer.eventing.ui.screens.auth.FacePile
import com.tdtuer.eventing.ui.screens.auth.GradientButton
import com.tdtuer.eventing.ui.theme.EventingTheme

class EventDetailsActivity : ComponentActivity() {
    private val viewModel: EventDetailsViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                EventDetailsScreen(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun EventDetailsScreen(viewModel: EventDetailsViewModel) {
    val eventDetails by viewModel.eventDetails

    Scaffold(
        bottomBar = { BuyTicketBottomBar(price = eventDetails.ticketPrice, onBuyClick = { viewModel.onBuyTicketClick() }) }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .background(Color(0xFFF7F7F7)) // Màu nền xám nhạt
        ) {
            EventDetailsHeader(
                bannerImageRes = eventDetails.bannerImageRes,
                facePileAvatars = eventDetails.goingFacePileAvatars,
                goingCountText = eventDetails.goingCountText,
                onBackClick = { viewModel.onBackNavigationClick() },
                onBookmarkClick = { viewModel.onBookmarkClick() },
                onInviteClick = { viewModel.onInviteClick() }
            )

            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = eventDetails.title,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 36.sp
                )

                Spacer(modifier = Modifier.height(24.dp))

                EventDetailRow(
                    icon = Icons.Default.CalendarToday,
                    title = eventDetails.date,
                    subtitle = eventDetails.dateTimeSubtitle
                )
                Spacer(modifier = Modifier.height(16.dp))

                EventDetailRow(
                    icon = Icons.Default.LocationOn,
                    title = eventDetails.locationTitle,
                    subtitle = eventDetails.locationSubtitle
                )
                Spacer(modifier = Modifier.height(16.dp))

                OrganizerRow(
                    avatarRes = eventDetails.organizerAvatarRes,
                    name = eventDetails.organizerName,
                    role = eventDetails.organizerRole,
                    onFollowClick = { viewModel.onFollowOrganizerClick() }
                )

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "About Event",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = eventDetails.aboutEvent,
                    color = Color.Gray,
                    fontSize = 16.sp,
                    lineHeight = 24.sp
                )
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
fun EventDetailsHeader(
    bannerImageRes: Int,
    facePileAvatars: List<Int>,
    goingCountText: String,
    onBackClick: () -> Unit,
    onBookmarkClick: () -> Unit,
    onInviteClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
            .clip(RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp))
    ) {
        Image(
            painter = painterResource(id = bannerImageRes),
            contentDescription = "Event Banner",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Black.copy(alpha = 0.5f), Color.Transparent),
                        startY = 0f,
                        endY = 200f
                    )
                )
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onBackClick) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Text(
                text = "Event Details",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            IconButton(onClick = onBookmarkClick) {
                Icon(Icons.Default.BookmarkBorder, contentDescription = "Bookmark", tint = Color.White)
            }
        }

        Card(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .offset(y = 30.dp)
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    FacePile(avatars = facePileAvatars)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(goingCountText, color = Color(0xFF3F38DD), fontWeight = FontWeight.SemiBold)
                }
                Button(
                    onClick = onInviteClick,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5669FF)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Invite", color = Color.White)
                }
            }
        }
    }
    Spacer(modifier = Modifier.height(30.dp))
}

@Composable
fun OrganizerRow(avatarRes: Int, name: String, role: String, onFollowClick: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(
                painter = painterResource(id = avatarRes),
                contentDescription = "Organizer Avatar",
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(name, fontSize = 18.sp, fontWeight = FontWeight.Medium)
                Text(role, fontSize = 14.sp, color = Color.Gray)
            }
        }
        Button(
            onClick = onFollowClick,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5669FF)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Follow", color = Color.White)
        }
    }
}

@Composable
fun BuyTicketBottomBar(price: String, onBuyClick: () -> Unit) {
    BottomAppBar(
        containerColor = Color.White,
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text("Total Price", color = Color.Gray, fontSize = 14.sp)
                Text(price, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color(0xFF5669FF))
            }
            GradientButton(
                text = "BUY TICKET",
                onClick = onBuyClick
            )
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun EventDetailsScreenPreview() {
    EventingTheme {
        // For preview, create a new instance of the ViewModel
        EventDetailsScreen(viewModel = EventDetailsViewModel())
    }
}
