package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
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
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme

// --- Data Model cho một sự kiện trong danh sách ---
data class EventListItem(
    val title: String,
    val dateTime: String,
    val location: String,
    val imageRes: Int
)

// --- Activity ---
class AllEventsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                AllEventsScreen()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AllEventsScreen() {
    val events = remember {
        listOf(
            EventListItem("Jo Malone London's Mother's Day Presents", "Wed, Apr 28 ⋅ 5:30 PM", "Radius Gallery ⋅ Santa Cruz, CA", R.drawable.banner_svgrepo_com),
            EventListItem("A Virtual Evening of Smooth Jazz", "Sat, May 1 ⋅ 2:00 PM", "Lot 13 ⋅ Oakland, CA", R.drawable.banner_svgrepo_com),
            EventListItem("Women's Leadership Conference 2021", "Sat, Apr 24 ⋅ 1:30 PM", "53 Bush St ⋅ San Francisco, CA", R.drawable.banner_svgrepo_com),
            EventListItem("International Kids Safe Parents Night Out", "Fri, Apr 23 ⋅ 6:00 PM", "Lot 13 ⋅ Oakland, CA", R.drawable.banner_svgrepo_com),
            EventListItem("Collectivity Plays the Music of Jimi", "Mon, Jun 21 ⋅ 10:00 PM", "Longboard Margarita Bar", R.drawable.banner_svgrepo_com),
            EventListItem("International Gala Music Festival", "Sun, Apr 25 ⋅ 10:15 AM", "36 Guild Street London, UK", R.drawable.banner_svgrepo_com),
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Events", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { /* Handle back */ }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Handle search */ }) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                    IconButton(onClick = { /* Handle more options */ }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFFF7F7F7))
            )
        },
        containerColor = Color(0xFFF7F7F7)
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(events) { event ->
                EventListCard(event = event)
            }
        }
    }
}

@Composable
fun EventListCard(event: EventListItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* Handle click to event details */ },
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = painterResource(id = event.imageRes),
                contentDescription = event.title,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = event.dateTime,
                    color = Color(0xFF5669FF), // Màu xanh tím
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = event.title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black,
                    lineHeight = 22.sp
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = "Location",
                        tint = Color.Gray,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = event.location,
                        color = Color.Gray,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun AllEventsScreenPreview() {
    EventingTheme {
        AllEventsScreen()
    }
}