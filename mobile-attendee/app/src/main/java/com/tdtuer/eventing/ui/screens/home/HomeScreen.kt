package com.tdtuer.eventing.ui.screens.home

import android.Manifest
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing.R // Ensure R class is available
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.ui.navigation.Graph
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme
import kotlinx.coroutines.flow.collectLatest
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun HomeScreen(
    viewModel: HomeViewModel = viewModel(),
    navController: NavController,
    onMenuClick: () -> Unit = {}
) {
    val upcomingEvents by viewModel.upcomingEvents
    val nearbyEvents by viewModel.nearbyEvents // Assuming you have this in ViewModel

    val locationPermissionsState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION
        )
    )

    LaunchedEffect(key1 = locationPermissionsState) @androidx.annotation.RequiresPermission(allOf = [android.Manifest.permission.ACCESS_FINE_LOCATION, android.Manifest.permission.ACCESS_COARSE_LOCATION]) {
// Lấy trạng thái "đã được cấp" của 2 quyền
        val allPermissionsGranted = locationPermissionsState.permissions.all {
            it.status.isGranted
        }

        if (allPermissionsGranted) {
// Nếu đã có quyền (ví dụ: người dùng đã cấp từ lần trước)
// -> Ra lệnh cho ViewModel tải
            viewModel.loadNearbyEventsBasedOnLocation()
        } else {
// Nếu chưa có quyền -> Kích hoạt hộp thoại xin quyền
            locationPermissionsState.launchMultiplePermissionRequest()
        }
    }

// Lắng nghe sự kiện điều hướng từ ViewModel
    LaunchedEffect(Unit) {
        viewModel.navEvent.collectLatest {
            when (it) {
                HomeNavEvent.NavigateToAuth -> {
                    navController.navigate(Graph.AUTHENTICATION) {
                        popUpTo(Graph.MAIN_APP) { inclusive = true }
                    }
                }
            }
        }
    }
    Scaffold(
        bottomBar = {
            AppBottomBar(onItemClick = { itemName ->
                viewModel.onBottomBarItemClick(
                    itemName
                )
            })
        },
// floatingActionButton = { AppFab(onClick = { viewModel.onFabClick() }) },
// floatingActionButtonPosition = FabPosition.Center
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .background(Color(0xFFF7F7F7))
        ) {
            item { HomeHeader(viewModel = viewModel, onMenuClick = onMenuClick) }
            item { EventSection("Upcoming Events", upcomingEvents, viewModel) }
            item { InviteBanner(onInviteClick = { viewModel.onInviteFriendsClick() }) }

            if (nearbyEvents.isNotEmpty()) {
                item { EventSection("Nearby You", nearbyEvents, viewModel) }
            }
        }
    }
}

@Composable
fun HomeHeader(viewModel: HomeViewModel, onMenuClick: () -> Unit) {
    val categories by viewModel.categories
    val selectedCategoryName = viewModel.selectedCategoryName
    val currentLocation by viewModel.currentLocationDisplay

    Column(
        modifier = Modifier
            .fillMaxWidth()
//            .clip(RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp))
            .background(
                brush = AppTheme.extendedColors.buttonLinear
            )
            .padding(top = 12.dp, bottom = 24.dp, start = 24.dp, end = 24.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onMenuClick) {
                Icon(
                    Icons.Default.Menu,
                    contentDescription = "Menu",
                    tint = AppTheme.colorScheme.onPrimary,
                    modifier = Modifier
                        .size(30.dp)
                        .offset(y = (-5).dp)
                )
            }
            if (currentLocation != null) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "Current Location",
                        color = AppTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                        fontSize = 10.sp
                    )
                    Text(
                        currentLocation!!,
                        color = AppTheme.colorScheme.onPrimary,
                        fontWeight = FontWeight.Medium
                    ) // This could come from ViewModel
                }
            } else {
                Spacer(Modifier.width(0.dp))
            }
            IconButton(onClick = { viewModel.onHomeHeaderNotificationsClick() }) {
                Icon(
                    Icons.Default.Notifications,
                    contentDescription = "Notifications",
                    tint = AppTheme.colorScheme.onPrimary,
                    modifier = Modifier
                        .size(30.dp)
                        .offset(y = (-5).dp)
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    AppTheme.colorScheme.onPrimary.copy(alpha = 0.1f), RoundedCornerShape(14.dp)
                )
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                Icons.Default.Search,
                contentDescription = "Search",
                tint = AppTheme.colorScheme.onPrimary,
                modifier = Modifier.size(30.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            VerticalDivider(
                modifier = Modifier.height(24.dp),
                color = AppTheme.colorScheme.onPrimary.copy(alpha = 0.5f)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "Search...",
                color = AppTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                fontSize = AppTheme.typography.bodyLarge.fontSize
            ) // Search text could be ViewModel state
            Spacer(modifier = Modifier.weight(1f))
            Button(
                onClick = { viewModel.onSearchFilterClick() }, colors = ButtonDefaults.buttonColors(
                    containerColor = AppTheme.colorScheme.onPrimary.copy(
                        alpha = 0.0f
                    )
                ), modifier = Modifier
                    .padding(0.dp)
                    .offset(x = 10.dp)
            ) {
                Icon(
                    Icons.Default.FilterAlt,
                    contentDescription = "Filters",
                    tint = AppTheme.colorScheme.onPrimary
                )
            }
        }
    }
}

@Composable
fun CategoryChip(category: Category, isSelected: Boolean, onClick: () -> Unit) {
    val iconColor =
        if (isSelected && category.name == "Music") Color.Black // Specific case for Music icon being black on white background
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
        category.iconFactory()
        Spacer(modifier = Modifier.width(8.dp))
        Text(category.name, color = textColor)
    }
}

@Composable
fun EventSection(name: String, events: List<EventCardUiModel>, viewModel: HomeViewModel) {
    Column(modifier = Modifier.padding(vertical = 24.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(name, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            TextButton(onClick = { viewModel.onSeeAllClick(name) }) {
                Text("See All")
                Icon(
                    Icons.AutoMirrored.Filled.ArrowForwardIos,
                    contentDescription = null,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            items(events) { event ->
                EventCard(
                    event = event, onBookmarkClick = { viewModel.onEventBookmarkClick(event) })
            }
        }
    }
}

@Composable
fun EventCard(event: EventCardUiModel, onBookmarkClick: () -> Unit) {
    Card(
        modifier = Modifier.width(300.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column {
            Box(modifier = Modifier.height(150.dp)) {
                AsyncImage(
                    model = event.imageUrl,
                    contentDescription = event.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                    placeholder = painterResource(id = R.drawable.ic_launcher_background)
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
                        Text(
                            text = event.displayDate,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFF0635A)
                        )
                        Text(
                            text = event.displayMonth, fontSize = 12.sp, color = Color(0xFFF0635A)
                        )
                    }
                }
                IconButton(
                    onClick = onBookmarkClick,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                ) {
// Chọn icon và màu sắc dựa vào trạng thái isFavorite
                    val icon =
                        if (event.isFavorite) Icons.Filled.Bookmark else Icons.Default.BookmarkBorder
                    val iconTint = if (event.isFavorite) Color(0xFFF0635A) else Color.White

                    Icon(
                        imageVector = icon,
                        contentDescription = "Bookmark",
                        tint = iconTint,
                        modifier = Modifier
                            .background(Color.Black.copy(alpha = 0.05f), CircleShape)
                            .padding(4.dp)
                    )
                }
            }
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = event.name,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
// (Bạn có thể thêm icon $ hoặc ticket ở đây)
                    Icon(
                        Icons.Default.ConfirmationNumber,
                        contentDescription = "Price",
                        tint = Color(0xFF3F38DD),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        event.displayPrice, // <-- Dùng giá đã định dạng
                        color = Color(0xFF3F38DD), fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        tint = Color.Gray,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        event.displayLocation,
                        color = Color.Gray,
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
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
            .padding(horizontal = 32.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFE0F7FA)) // Light cyan background
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp) // Set a fixed height
        ) {
            Image(
                painter = painterResource(id = R.drawable.invite),
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .size(250.dp)
                    .offset(x = 20.dp, y = 25.dp) // <-- Thay đổi giá trị x, y ở đây
            )

            Column(
                modifier = Modifier
                    .align(Alignment.CenterStart)

                    .padding(horizontal = 24.dp)
            ) {
                Text(
                    text = "Invite your friends",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Get \$20 for ticket", color = Color.Gray, fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = onInviteClick,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00F8FF)),
                    contentPadding = PaddingValues(horizontal = 24.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "INVITE",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                }
            }
        }
    }
}

@Composable
fun AppBottomBar(onItemClick: (String) -> Unit) {
    BottomAppBar(
        containerColor = Color.White, actions = {
            Row(
                modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround
            ) {
// In a real app, selection state would come from ViewModel/Navigation
                NavigationBarItem(
                    selected = true,
                    onClick = { onItemClick("Explore") },
                    icon = { Icon(Icons.Default.Explore, contentDescription = "Explore") },
                    label = { Text("Explore") })
                NavigationBarItem(
                    selected = false,
                    onClick = { onItemClick("Events") },
                    icon = { Icon(Icons.Default.CalendarToday, contentDescription = "Events") },
                    label = { Text("Events") })
                Spacer(modifier = Modifier.width(40.dp)) // Spacer for FAB
                NavigationBarItem(
                    selected = false,
                    onClick = { onItemClick("Map") },
                    icon = { Icon(Icons.Default.Map, contentDescription = "Map") },
                    label = { Text("Map") })
                NavigationBarItem(
                    selected = false,
                    onClick = { onItemClick("Profile") },
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                    label = { Text("Profile") })
            }
        })
}

@Composable
fun AppFab(onClick: () -> Unit) {
    FloatingActionButton(
        onClick = onClick, shape = CircleShape, containerColor = Color(0xFF5669FF)
    ) {
        Icon(Icons.Default.Add, contentDescription = "Add", tint = Color.White)
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun HomeScreenPreview() {
    EventingTheme {
// HomeScreen(
// viewModel = HomeViewModel(),
// navController = null
// ) // Preview needs a NavController now
    }
}