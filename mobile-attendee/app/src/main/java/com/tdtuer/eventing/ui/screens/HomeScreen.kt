package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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

// --- Data Models ---
data class Event(
    val title: String,
    val location: String,
    val goingCount: Int,
    val date: String,
    val month: String,
    val imageRes: Int,
    val avatars: List<Int>
)

data class Category(
    val name: String,
    val icon: @Composable () -> Unit,
    val color: Color
)

// --- Activity ---
class HomeActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                HomeScreen()
            }
        }
    }
}

// --- Main Screen Composable ---
@Composable
fun HomeScreen() {
    val upcomingEvents = remember {
        listOf(
            Event("International Band Mu...", "36 Guild Street London, UK", 20, "10", "JUNE", R.drawable.default_pfp, listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp)),
            Event("Jo Malone London's...", "Radius Gallery, Santa Cruz", 20, "10", "JUNE", R.drawable.default_pfp, listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp))
        )
    }

    Scaffold(
        bottomBar = { AppBottomBar() },
        floatingActionButton = { AppFab() },
        floatingActionButtonPosition = FabPosition.Center
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(Color(0xFFF7F7F7))
        ) {
            item { HomeHeader() }
            item { EventSection("Upcoming Events", upcomingEvents) }
            item { InviteBanner() }
            item { EventSection("Nearby You", upcomingEvents) }
        }
    }
}

// --- Helper Composables dành riêng cho HomeScreen ---

@Composable
fun HomeHeader() {
    val categories = listOf(
        Category("Sports", { Icon(Icons.Default.SportsBasketball, contentDescription = null, tint = Color.White) }, Color(0xFFF0635A)),
        Category("Music", { Icon(Icons.Default.MusicNote, contentDescription = null, tint = Color(0xFFF59762)) }, Color.White),
        Category("Food", { Icon(Icons.Default.Fastfood, contentDescription = null, tint = Color.White) }, Color(0xFF29D697))
    )
    var selectedCategory by remember { mutableStateOf("Music") }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp))
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(Color(0xFF5A61E3), Color(0xFF7C82F2))
                )
            )
            .padding(24.dp)
    ) {
        // Top Row: Menu, Location, Notifications
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Icon(Icons.Default.Menu, contentDescription = "Menu", tint = Color.White)
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Current Location", color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp)
                Text("New York, USA", color = Color.White, fontWeight = FontWeight.Medium)
            }
            Icon(Icons.Default.Notifications, contentDescription = "Notifications", tint = Color.White)
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Search Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(50))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Search, contentDescription = "Search", tint = Color.White)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Search...", color = Color.White.copy(alpha = 0.8f))
            Spacer(modifier = Modifier.weight(1f))
            Button(
                onClick = { /* Handle filter */ },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5D65E9))
            ) {
                Icon(Icons.Default.FilterList, contentDescription = "Filters", tint = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Category Chips
        LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            items(categories) { category ->
                CategoryChip(category = category, isSelected = category.name == selectedCategory) {
                    selectedCategory = category.name
                }
            }
        }
    }
}

@Composable
fun CategoryChip(category: Category, isSelected: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(
            containerColor = if (isSelected) category.color else Color.Transparent
        ),
        border = if (!isSelected) BorderStroke(1.dp, Color.White.copy(alpha = 0.5f)) else null,
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
    ) {
        category.icon()
        Spacer(modifier = Modifier.width(8.dp))
        Text(category.name, color = if(isSelected && category.name == "Music") Color.Black else Color.White)
    }
}

@Composable
fun EventSection(title: String, events: List<Event>) {
    Column(modifier = Modifier.padding(vertical = 24.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            TextButton(onClick = { /* See All */ }) {
                Text("See All")
                Icon(Icons.Default.ArrowForwardIos, contentDescription = null, modifier = Modifier.size(14.dp))
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(events) { event ->
                EventCard(event = event)
            }
        }
    }
}

@Composable
fun EventCard(event: Event) {
    Card(
        modifier = Modifier.width(250.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column {
            Box(modifier = Modifier.height(150.dp)) {
                Image(
                    painter = painterResource(id = event.imageRes),
                    contentDescription = event.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
                Box(
                    modifier = Modifier
                        .padding(8.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.White.copy(alpha = 0.8f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                        .align(Alignment.TopStart)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(event.date, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF0635A))
                        Text(event.month, fontSize = 12.sp, color = Color(0xFFF0635A))
                    }
                }
                Icon(
                    Icons.Default.BookmarkBorder,
                    contentDescription = "Bookmark",
                    tint = Color.White,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                        .padding(4.dp)
                )
            }
            Column(modifier = Modifier.padding(16.dp)) {
                Text(event.title, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Gọi FacePile từ file component chung
                    FacePile(avatars = event.avatars)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("+${event.goingCount} Going", color = Color(0xFF3F38DD), fontWeight = FontWeight.SemiBold)
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(event.location, color = Color.Gray, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun InviteBanner() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box {
            Image(
                painter = painterResource(id = R.drawable.banner_svgrepo_com),
                contentDescription = null,
                modifier = Modifier.fillMaxWidth(),
                contentScale = ContentScale.Crop
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Invite your friends", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("Get \$20 for ticket", color = Color.Gray)
                }
                Button(
                    onClick = { /* Invite */ },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00F8FF))
                ) {
                    Text("INVITE", color = Color.Black)
                }
            }
        }
    }
}

@Composable
fun AppBottomBar() {
    BottomAppBar(
        containerColor = Color.White,
        actions = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                NavigationBarItem(selected = true, onClick = {}, icon = { Icon(Icons.Default.Explore, contentDescription = "Explore") }, label = { Text("Explore") })
                NavigationBarItem(selected = false, onClick = {}, icon = { Icon(Icons.Default.CalendarToday, contentDescription = "Events") }, label = { Text("Events") })
                Spacer(modifier = Modifier.width(40.dp)) // Spacer for FAB
                NavigationBarItem(selected = false, onClick = {}, icon = { Icon(Icons.Default.Map, contentDescription = "Map") }, label = { Text("Map") })
                NavigationBarItem(selected = false, onClick = {}, icon = { Icon(Icons.Default.Person, contentDescription = "Profile") }, label = { Text("Profile") })
            }
        }
    )
}

@Composable
fun AppFab() {
    FloatingActionButton(
        onClick = { /* Handle FAB click */ },
        shape = CircleShape,
        containerColor = Color(0xFF5669FF)
    ) {
        Icon(Icons.Default.Add, contentDescription = "Add", tint = Color.White)
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun HomeScreenPreview() {
    EventingTheme {
        HomeScreen()
    }
}