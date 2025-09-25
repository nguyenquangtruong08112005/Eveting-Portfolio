package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.screens.ui.theme.EventingTheme

class EventDetailsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                EventDetailsScreen()
            }
        }
    }
}

@Composable
fun EventDetailsScreen() {
    Scaffold(
        bottomBar = { BuyTicketBottomBar(price = "$120") }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .background(Color(0xFFF7F7F7)) // Màu nền xám nhạt
        ) {
            // Phần Header ảnh bìa
            EventDetailsHeader()

            // Nội dung chính của sự kiện
            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "International Band Music Concert",
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 36.sp
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Mục Date (Gọi từ file chung)
                EventDetailRow(
                    icon = Icons.Default.CalendarToday,
                    title = "14 December, 2021",
                    subtitle = "Tuesday, 4:00PM - 9:00PM"
                )
                Spacer(modifier = Modifier.height(16.dp))

                // Mục Location (Gọi từ file chung)
                EventDetailRow(
                    icon = Icons.Default.LocationOn,
                    title = "Gala Convention Center",
                    subtitle = "36 Guild Street London, UK"
                )
                Spacer(modifier = Modifier.height(16.dp))

                // Mục Organizer
                OrganizerRow(
                    avatarRes = R.drawable.default_pfp,
                    name = "Ashfak Sayem",
                    role = "Organizer",
                    onFollowClick = { /* Handle follow */ }
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Phần About Event
                Text(
                    text = "About Event",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Enjoy your favorite dishe and a lovely your friends and family and have a great time.\n" +
                            "Food from local food trucks will be available for purchase.",
                    color = Color.Gray,
                    fontSize = 16.sp,
                    lineHeight = 24.sp
                )
                Spacer(modifier = Modifier.height(24.dp)) // Padding cuối cùng trước bottom bar
            }
        }
    }
}

@Composable
fun EventDetailsHeader() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp) // Chiều cao cố định cho header
            .clip(RoundedCornerShape(bottomStart = 32.dp, bottomEnd = 32.dp))
    ) {
        // Ảnh bìa
        Image(
            painter = painterResource(id = R.drawable.banner_svgrepo_com),
            contentDescription = "Event Banner",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        // Gradient overlay
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

        // Top Bar (Back button, Title, Bookmark)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = { /* Handle back */ }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
            Text(
                text = "Event Details",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            IconButton(onClick = { /* Handle bookmark */ }) {
                Icon(Icons.Default.BookmarkBorder, contentDescription = "Bookmark", tint = Color.White)
            }
        }

        // Phần "Going" và nút Invite (nằm chồng lên ảnh bìa)
        Card(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .offset(y = 30.dp) // Dịch lên 30dp để chồng lên ảnh
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
                    // Gọi FacePile từ file chung
                    FacePile(avatars = listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("+20 Going", color = Color(0xFF3F38DD), fontWeight = FontWeight.SemiBold)
                }
                Button(
                    onClick = { /* Handle invite */ },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5669FF)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Invite", color = Color.White)
                }
            }
        }
    }
    // Khoảng trống để bù lại phần Card bị dịch lên
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
fun BuyTicketBottomBar(price: String) {
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
            // Nút "BUY TICKET" gọi từ file chung
            GradientButton(
                text = "BUY TICKET",
                onClick = { /* Handle buy ticket */ }
            )
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun EventDetailsScreenPreview() {
    EventingTheme {
        EventDetailsScreen()
    }
}