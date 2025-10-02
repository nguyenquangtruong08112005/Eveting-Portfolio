package com.tdtuer.eventing.ui.screens.home

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items // Keep this import
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
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
import com.tdtuer.eventing.R // Ensure R class is available
import com.tdtuer.eventing.ui.components.FacePile
import com.tdtuer.eventing.ui.theme.EventingTheme
// Event and Category data classes are now in HomeViewModel.kt

class HomeActivity : ComponentActivity() {
    private val viewModel: HomeViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                HomeScreen(viewModel = viewModel)
            }
        }
    }
}

@Composable
fun HomeScreen(viewModel: HomeViewModel) {
    val upcomingEvents by viewModel.upcomingEvents
    val nearbyEvents by viewModel.nearbyEvents // Assuming you have this in ViewModel

    Scaffold(
        bottomBar = { AppBottomBar(onItemClick = { itemName -> viewModel.onBottomBarItemClick(itemName) }) },
        floatingActionButton = { AppFab(onClick = { viewModel.onFabClick() }) },
        floatingActionButtonPosition = FabPosition.Center
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(Color(0xFFF7F7F7))
        ) {
            item { HomeHeader(viewModel = viewModel) }
            item { EventSection("Upcoming Events", upcomingEvents, viewModel) }
            item { InviteBanner(onInviteClick = { viewModel.onInviteFriendsClick() }) }
            item { EventSection("Nearby You", nearbyEvents, viewModel) }
        }
    }
}

@Composable
fun HomeHeader(viewModel: HomeViewModel) {
    val categories by viewModel.categories
    val selectedCategoryName = viewModel.selectedCategoryName

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
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = { viewModel.onHomeHeaderMenuClick() }) {
                Icon(Icons.Default.Menu, contentDescription = "Menu", tint = Color.White)
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Current Location", color = Color.White.copy(alpha = 0.8f), fontSize = 12.sp)
                Text("New York, USA", color = Color.White, fontWeight = FontWeight.Medium) // This could come from ViewModel
            }
            IconButton(onClick = { viewModel.onHomeHeaderNotificationsClick() }){
                 Icon(Icons.Default.Notifications, contentDescription = "Notifications", tint = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(50))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(Icons.Default.Search, contentDescription = "Search", tint = Color.White)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Search...", color = Color.White.copy(alpha = 0.8f)) // Search text could be ViewModel state
            Spacer(modifier = Modifier.weight(1f))
            Button(
                onClick = { viewModel.onSearchFilterClick() },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5D65E9))
            ) {
                Icon(Icons.Default.FilterList, contentDescription = "Filters", tint = Color.White)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            items(categories) { category ->
                CategoryChip(
                    category = category,
                    isSelected = category.name == selectedCategoryName,
                    onClick = { viewModel.onCategorySelected(category.name) }
                )
            }
        }
    }
}

@Composable
fun CategoryChip(category: Category, isSelected: Boolean, onClick: () -> Unit) {
    val iconColor = if (isSelected && category.name == "Music") Color.Black // Specific case for Music icon being black on white background
                    else if (isSelected) category.selectedTextColor // Use defined selected text color for icon
                    else Color.White.copy(alpha = 0.8f) // Default unselected icon color

    val textColor = if (isSelected) category.selectedTextColor else Color.White
    val containerColor = if (isSelected) category.color else Color.Transparent
    val border = if (!isSelected) BorderStroke(1.dp, Color.White.copy(alpha = 0.5f)) else null

    Button(
        onClick = onClick,
        shape = RoundedCornerShape(50),
        colors = ButtonDefaults.buttonColors(containerColor = containerColor),
        border = border,
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
    ) {
        // Invoke the icon factory, which is a @Composable lambda
        // We need to provide the tint within the Icon composable itself if dynamic
        // The iconFactory in ViewModel should be: { Icon(vector, tint = determinedColor) }
        // For simplicity, let's assume iconFactory handles its own tint for selected state, or we adjust icon tint here:
        // For this example, I'm modifying the iconFactory in ViewModel to be more flexible, or tinting here.
        // The iconFactory in ViewModel produces an Icon. We might need to adjust its tint based on selection.
        // A simpler way: The Category data class defines the icon, and we tint it here.
        // Let's assume iconFactory = { IconToDisplay(tint = if(isSelected)... else ...) }
        // For now, let's just call the factory. The tinting logic is now more robust in the ViewModel's Category setup.
        category.iconFactory() 
        Spacer(modifier = Modifier.width(8.dp))
        Text(category.name, color = textColor)
    }
}

@Composable
fun EventSection(title: String, events: List<Event>, viewModel: HomeViewModel) {
    Column(modifier = Modifier.padding(vertical = 24.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(title, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            TextButton(onClick = { viewModel.onSeeAllClick(title) }) {
                Text("See All")
                Icon(Icons.AutoMirrored.Filled.ArrowForwardIos, contentDescription = null, modifier = Modifier.size(14.dp))
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(events) { event ->
                EventCard(event = event, onBookmarkClick = { viewModel.onEventBookmarkClick(event) })
            }
        }
    }
}

@Composable
fun EventCard(event: Event, onBookmarkClick: () -> Unit) {
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
                IconButton(
                    onClick = onBookmarkClick, 
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                ) {
                    Icon(
                        Icons.Default.BookmarkBorder, // Icon could be dynamic based on bookmarked state from ViewModel
                        contentDescription = "Bookmark",
                        tint = Color.White,
                         modifier = Modifier
                            .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                            .padding(4.dp)
                    )
                }
            }
            Column(modifier = Modifier.padding(16.dp)) {
                Text(event.title, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
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
fun InviteBanner(onInviteClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box {
            Image(
                painter = painterResource(id = R.drawable.banner_svgrepo_com), // Ensure this resource exists
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
                    onClick = onInviteClick,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00F8FF))
                ) {
                    Text("INVITE", color = Color.Black)
                }
            }
        }
    }
}

@Composable
fun AppBottomBar(onItemClick: (String) -> Unit) {
    BottomAppBar(
        containerColor = Color.White,
        actions = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                // In a real app, selection state would come from ViewModel/Navigation
                NavigationBarItem(selected = true, onClick = { onItemClick("Explore") }, icon = { Icon(Icons.Default.Explore, contentDescription = "Explore") }, label = { Text("Explore") })
                NavigationBarItem(selected = false, onClick = { onItemClick("Events") }, icon = { Icon(Icons.Default.CalendarToday, contentDescription = "Events") }, label = { Text("Events") })
                Spacer(modifier = Modifier.width(40.dp)) // Spacer for FAB
                NavigationBarItem(selected = false, onClick = { onItemClick("Map") }, icon = { Icon(Icons.Default.Map, contentDescription = "Map") }, label = { Text("Map") })
                NavigationBarItem(selected = false, onClick = { onItemClick("Profile") }, icon = { Icon(Icons.Default.Person, contentDescription = "Profile") }, label = { Text("Profile") })
            }
        }
    )
}

@Composable
fun AppFab(onClick: () -> Unit) {
    FloatingActionButton(
        onClick = onClick,
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
        HomeScreen(viewModel = HomeViewModel()) // Use ViewModel for preview
    }
}
