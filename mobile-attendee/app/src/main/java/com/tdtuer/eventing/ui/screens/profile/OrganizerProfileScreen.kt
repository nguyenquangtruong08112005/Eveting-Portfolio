package com.tdtuer.eventing.ui.screens.profile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items // Keep this import
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
// R class import is still needed for resources used directly in UI if not from ViewModel
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme
// EventItem data class is now in OrganizerProfileViewModel.kt

class OrganizerProfileActivity : ComponentActivity() {
    private val viewModel: OrganizerProfileViewModel by viewModels() // Use ViewModel delegate

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                OrganizerProfileScreen(viewModel = viewModel) // Pass ViewModel
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrganizerProfileScreen(viewModel: OrganizerProfileViewModel) { // Accept ViewModel
    val profileDetails by viewModel.profileDetails // Observe data from ViewModel
    val selectedTabIndex by rememberUpdatedState(newValue = viewModel.selectedTabIndex)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Organizer Profile- ${if (selectedTabIndex == 0) "About" else "Event"}") },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackNavigationClick() }) { // Delegate
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onMoreOptionsClick() }) { // Delegate
                        Icon(Icons.Default.MoreVert, contentDescription = "More Options")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    titleContentColor = Color.Black
                )
            )
        },
        containerColor = Color.White
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState()) 
        ) {
            OrganizerProfileHeader(
                profilePictureRes = profileDetails.profilePictureRes,
                userName = profileDetails.userName,
                followingCount = profileDetails.followingCount,
                followersCount = profileDetails.followersCount,
                onFollowClick = { viewModel.onFollowClick() }, // Delegate
                onMessagesClick = { viewModel.onMessagesClick() } // Delegate
            )

            OrganizerTabBar(
                selectedTabIndex = selectedTabIndex,
                tabs = viewModel.tabs,
                onTabSelected = { viewModel.onTabSelected(it) } // Delegate
            )

            when (selectedTabIndex) {
                0 -> AboutContent(aboutText = profileDetails.aboutContent)
                1 -> EventContent(events = profileDetails.events)
            }
        }
    }
}

@Composable
fun OrganizerProfileHeader(
    profilePictureRes: Int,
    userName: String,
    followingCount: Int,
    followersCount: Int,
    onFollowClick: () -> Unit,
    onMessagesClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Image(
            painter = painterResource(id = profilePictureRes), // From ViewModel
            contentDescription = "Profile Picture",
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = userName, // From ViewModel
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(16.dp))

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = followingCount.toString(), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text(text = "Following", color = Color.Gray)
            }
            Divider(
                modifier = Modifier
                    .height(30.dp)
                    .width(1.dp)
                    .padding(horizontal = 24.dp),
                color = Color.LightGray
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = followersCount.toString(), fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text(text = "Followers", color = Color.Gray)
            }
        }
        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                onClick = onFollowClick,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5669FF)),
                modifier = Modifier.weight(1f).padding(end = 8.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = "Follow Icon", tint = Color.White)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Follow", color = Color.White)
            }
            OutlinedButton(
                onClick = onMessagesClick,
                border = ButtonDefaults.outlinedButtonBorder.copy(brush = SolidColor(Color(0xFF5669FF))),
                modifier = Modifier.weight(1f).padding(start = 8.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                // Consider making this icon also configurable via ViewModel if it changes
                Icon(painterResource(id = R.drawable.default_pfp), modifier = Modifier.height(20.dp), contentDescription = "Message Icon", tint = Color(0xFF5669FF))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Messages", color = Color(0xFF5669FF))
            }
        }
    }
}

@Composable
fun OrganizerTabBar(selectedTabIndex: Int, tabs: List<String>, onTabSelected: (Int) -> Unit) {
    TabRow(
        selectedTabIndex = selectedTabIndex,
        containerColor = Color.White,
        contentColor = Color.Black,
        indicator = { tabPositions ->
            TabRowDefaults.Indicator(
                Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                color = Color(0xFF5669FF),
                height = 2.dp
            )
        }
    ) {
        tabs.forEachIndexed { index, title ->
            Tab(
                selected = selectedTabIndex == index,
                onClick = { onTabSelected(index) },
                text = {
                    Text(
                        text = title,
                        color = if (selectedTabIndex == index) Color(0xFF5669FF) else Color.Gray,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                selectedContentColor = Color(0xFF5669FF),
                unselectedContentColor = Color.Gray
            )
        }
    }
}

@Composable
fun AboutContent(aboutText: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = aboutText, // From ViewModel
            color = Color.Gray,
            lineHeight = 22.sp,
            fontSize = 14.sp
        )
    }
}

@Composable
fun EventContent(events: List<EventItem>) {
    // Note: If EventContent becomes too complex or needs its own scrolling independent of the main screen,
    // consider not using the parent Column's verticalScroll for the whole screen.
    // For now, this LazyColumn will be part of the overall scrollable content.
    // If a fixed height or separate scroll is needed, adjust modifiers.
    LazyColumn(
        modifier = Modifier
            .fillMaxWidth() // Takes available width
            .heightIn(max = 500.dp) // Example: constrain height if needed, or use weight if inside a Column with fixed height
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        // Pass `userScrollEnabled = false` if the parent Column handles scrolling and LazyColumn is just for item layout.
        // However, if LazyColumn has many items, it should scroll itself. This might conflict with parent `verticalScroll`.
        // For simplicity with current setup, let's assume content is not excessively long or verticalScroll handles it.
    ) {
        items(events, key = { it.id }) { event ->
            EventCard(event = event)
        }
    }
}

@Composable
fun EventCard(event: EventItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF7F7F7))
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
                    .size(60.dp)
                    .clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "${event.date} ${event.time}",
                    color = Color(0xFF5669FF),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = event.title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
            }
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun OrganizerProfileScreenPreview() {
    EventingTheme {
        // For preview, create a new instance of the ViewModel
        OrganizerProfileScreen(viewModel = OrganizerProfileViewModel())
    }
}
