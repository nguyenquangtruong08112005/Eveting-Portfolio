// eventing.zip/ui/screens/home/HomeScreen.kt (ĐÃ CẬP NHẬT)
package com.tdtuer.eventing.ui.screens.home

import TicketShape
import android.Manifest
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import coil.compose.AsyncImage
import com.tdtuer.eventing.R // Ensure R class is available
import com.tdtuer.eventing.ui.navigation.Graph
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme
import kotlinx.coroutines.flow.collectLatest
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.tdtuer.eventing.ui.screens.location.MapViewScreen
import com.tdtuer.eventing.ui.screens.profile.MyProfileScreen
import com.tdtuer.eventing.ui.navigation.Screen
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import com.tdtuer.eventing.ui.screens.events.AllEventsScreen
import com.tdtuer.eventing.ui.screens.ticket.MyTicketScreen

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun HomeScreen(
    modifier: Modifier = Modifier,
    navController: NavController,
    onMenuClick: () -> Unit = {},
    // 1. Thêm callback để báo route hiện tại ra ngoài
    onCurrentRouteChanged: (String) -> Unit = {}
) {
    val bottomNavController = rememberNavController()

    // 2. Lắng nghe sự thay đổi của Route
    val navBackStackEntry by bottomNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // 3. Báo cáo ra ngoài mỗi khi route thay đổi
    LaunchedEffect(currentRoute) {
        onCurrentRouteChanged(currentRoute ?: Screen.Home.route)
    }

    Scaffold(
        modifier = modifier, // <-- Áp dụng modifier (cho Drawer)
        bottomBar = {
            // 2. Truyền bottomNavController vào BottomBar
            AppBottomBar(
                bottomNavController = bottomNavController,
                onItemClick = { route ->
                    bottomNavController.navigate(route) {
                        popUpTo(bottomNavController.graph.startDestinationId) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            )
        },
    ) { innerPadding ->
        // 3. Tạo NavHost lồng nhau
        BottomNavGraph(
            modifier = Modifier.padding(innerPadding),
            mainNavController = navController, // Dùng để đi đến các màn hình chi tiết
            bottomNavController = bottomNavController, // Dùng để quản lý các tab
            onMenuClick = onMenuClick // Truyền onMenuClick vào tab "Home" (ExploreScreen)
        )
    }
}

@Composable
fun BottomNavGraph(
    modifier: Modifier = Modifier,
    mainNavController: NavController,
    bottomNavController: NavHostController,
    onMenuClick: () -> Unit
) {
    val sharedViewModel: SharedSearchViewModel = hiltViewModel()

    NavHost(
        navController = bottomNavController,
        startDestination = Screen.Home.route, // Bắt đầu ở tab Home
        modifier = modifier
    ) {
        // Tab 1: Home (Explore)
        composable(Screen.Home.route) {
            ExploreScreen(
                mainNavController = mainNavController,
                bottomNavController = bottomNavController,
                onMenuClick = onMenuClick,
                viewModel = hiltViewModel<HomeViewModel>(),
                sharedViewModel = sharedViewModel
            )
        }

//      Tab 2: Events
        composable(Screen.Events.route) {
            AllEventsScreen( // (YÊU CẦU 5) Truyền bottomNavController
                viewModel = hiltViewModel(),
                sharedViewModel = sharedViewModel,
                bottomNavController = bottomNavController,
                mainNavController = mainNavController
            )
        }

        // Tab 3: Map
        composable(Screen.Map.route) {
            MapViewScreen(
                viewModel = hiltViewModel(),
                navController = mainNavController
            )
        }

        composable(Screen.MyTickets.route) {
            MyTicketScreen(
                viewModel = hiltViewModel(),
                navController = mainNavController
            )
        }


// Tab 4: Profile
        composable(Screen.Profile.route) {
            MyProfileScreen(
                viewModel = hiltViewModel(),
                navController = mainNavController
            )
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun ExploreScreen(
    mainNavController: NavController,
    onMenuClick: () -> Unit,
    viewModel: HomeViewModel,
    bottomNavController: NavHostController,
    sharedViewModel: SharedSearchViewModel
) {
    val upcomingEvents by viewModel.upcomingEvents
    val nearbyEvents by viewModel.nearbyEvents

    val locationPermissionsState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION
        )
    )

    var showFilterSheet by rememberSaveable { mutableStateOf(false) }

    if (showFilterSheet) {
        FilterBottomSheet(
            onDismiss = { showFilterSheet = false },
            onApplyFilters = { params ->
                showFilterSheet = false
                sharedViewModel.applyFilters(params)
                bottomNavController.navigate(Screen.Events.route) {
                    popUpTo(bottomNavController.graph.startDestinationId) {
                        saveState = true
                    }
                    launchSingleTop = true
                    restoreState = true
                }
            }
        )
    }

    LaunchedEffect(key1 = locationPermissionsState) {
        val allPermissionsGranted = locationPermissionsState.permissions.all {
            it.status.isGranted
        }
        if (allPermissionsGranted) {
            viewModel.loadNearbyEventsBasedOnLocation()
        } else {
            locationPermissionsState.launchMultiplePermissionRequest()
        }
    }

    LaunchedEffect(Unit) {
        viewModel.navEvent.collectLatest {
            when (it) {
                HomeNavEvent.NavigateToAuth -> {
                    mainNavController.navigate(Graph.AUTHENTICATION) {
                        popUpTo(Graph.MAIN_APP) { inclusive = true }
                    }
                }
            }
        }
    }

    // (YÊU CẦU 5) Lambda điều hướng cho "See All"
    val onSeeAllClickLambda = {
        sharedViewModel.clearSearchAndFilters() // Xóa filter
        bottomNavController.navigate(Screen.Events.route) { // Điều hướng
            popUpTo(bottomNavController.graph.startDestinationId) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colorScheme.background)
    ) {
        item {
            HomeHeader(
                viewModel = viewModel,
                onMenuClick = onMenuClick,
                onNotificationsClick = {
                    mainNavController.navigate(Screen.Notifications.route)
                },
                bottomNavController = bottomNavController,
                sharedViewModel = sharedViewModel,
                onFilterClick = { showFilterSheet = true }
            )
        }
        item {
            EventSection( // (YÊU CẦU 5) Truyền lambda
                "Upcoming Events",
                upcomingEvents,
                mainNavController,
                onSeeAllClick = onSeeAllClickLambda,
                onBookmarkClick = { event -> viewModel.onEventBookmarkClick(event) }
            )
        }
        item { InviteBanner(onInviteClick = { viewModel.onInviteFriendsClick() }) }

        if (nearbyEvents.isNotEmpty()) {
            item {
                EventSection( // (YÊU CẦU 5) Truyền lambda
                    "Nearby You",
                    nearbyEvents,
                    mainNavController,
                    onSeeAllClick = onSeeAllClickLambda,
                    onBookmarkClick = { event -> viewModel.onEventBookmarkClick(event) }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class) // Cần cho OutlinedTextField
@Composable
fun HomeHeader(
    viewModel: HomeViewModel, onMenuClick: () -> Unit,
    onNotificationsClick: () -> Unit = {},
    sharedViewModel: SharedSearchViewModel,
    bottomNavController: NavHostController,
    onFilterClick: () -> Unit
) {
    val currentLocation by viewModel.currentLocationDisplay
    val searchState by sharedViewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp))
            .background(
                brush = AppTheme.extendedColors.orangeLinear
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
                    )
                }
            } else {
                Spacer(Modifier.width(0.dp))
            }
            IconButton(onClick = { onNotificationsClick() }) {
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

        OutlinedTextField(
            value = searchState.searchQuery,
            onValueChange = { sharedViewModel.onSearchQueryChanged(it) },
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    AppTheme.colorScheme.onPrimary.copy(alpha = 0.1f),
                    RoundedCornerShape(14.dp)
                ),
            placeholder = {
                Text(
                    "Search event, artist...",
                    color = AppTheme.colorScheme.onPrimary.copy(alpha = 0.8f)
                )
            },
            leadingIcon = {
                Icon(
                    Icons.Default.Search,
                    contentDescription = "Search",
                    tint = AppTheme.colorScheme.onPrimary,
                    modifier = Modifier.size(30.dp)
                )
            },
            trailingIcon = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    VerticalDivider(
                        modifier = Modifier.height(24.dp),
                        color = AppTheme.colorScheme.onPrimary.copy(alpha = 0.5f)
                    )
                    IconButton(onClick = onFilterClick) {
                        Icon(
                            Icons.Default.FilterAlt,
                            contentDescription = "Filters",
                            tint = AppTheme.colorScheme.onPrimary
                        )
                    }
                }
            },
            colors = TextFieldDefaults.colors(
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                disabledIndicatorColor = Color.Transparent,
                cursorColor = AppTheme.colorScheme.onPrimary,
                focusedTextColor = AppTheme.colorScheme.onPrimary,
                unfocusedTextColor = AppTheme.colorScheme.onPrimary,
            ),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(
                onSearch = {
                    focusManager.clearFocus()
                    sharedViewModel.executeSearchFromQuery()

                    bottomNavController.navigate(Screen.Events.route) {
                        popUpTo(bottomNavController.graph.startDestinationId) {
                            saveState = true
                        }
                        launchSingleTop = true
                        restoreState = true
                    }
                }
            ),
            singleLine = true,
            shape = RoundedCornerShape(14.dp)
        )
    }
}

// ... (CategoryChip giữ nguyên) ...

// (YÊU CẦU 5) Cập nhật chữ ký (signature) của EventSection
@Composable
fun EventSection(
    name: String,
    events: List<EventCardUiModel>,
    mainNavController: NavController,
    onSeeAllClick: () -> Unit, // <-- THAY ĐỔI
    onBookmarkClick: (EventCardUiModel) -> Unit // <-- THÊM
) {
    Column(modifier = Modifier.padding(vertical = 24.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(name, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            TextButton(onClick = onSeeAllClick) { // <-- THAY ĐỔI
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
                    event = event,
                    onBookmarkClick = { onBookmarkClick(event) }, // <-- THAY ĐỔI
                    onCardClick = {
                        mainNavController.navigate(
                            Screen.EventDetails.createRoute(event.id)
                        )
                    }
                )
            }
        }
    }
}

// ... (EventCard, InviteBanner, AppBottomBar, AppFab, Preview giữ nguyên) ...
// (Lưu ý: Đảm bảo các composable này vẫn còn trong file của bạn)

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
fun EventCard(
    event: EventCardUiModel,
    onBookmarkClick: () -> Unit,
    onCardClick: () -> Unit
) {
    val density = LocalDensity.current

    val cornerRadius = 16.dp
    val cutoutRadius = 12.dp
    val junctionY = 150.dp

    val cutoutColor = AppTheme.colorScheme.background

    val dashStrokeWidth = 10f
    val dashColor = AppTheme.colorScheme.outline.copy(alpha = 0.7f)
    val dashWidth = 10f
    val dashGap = 10f
    val pathEffect = PathEffect.dashPathEffect(floatArrayOf(dashWidth, dashGap), 0f)

    val ticketShape = remember(cornerRadius, cutoutRadius, junctionY) {
        TicketShape(cornerRadius, cutoutRadius, junctionY)
    }

    Box(
        modifier = Modifier
            .width(300.dp)
            .clickable(onClick = onCardClick)
    ) {
        Card(
            shape = ticketShape,
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {
            Column {
                Box(modifier = Modifier.height(junctionY)) {
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
                                text = event.displayMonth,
                                fontSize = 12.sp,
                                color = Color(0xFFF0635A)
                            )
                        }
                    }
                    IconButton(
                        onClick = onBookmarkClick,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                    ) {
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
                        Icon(
                            Icons.Default.ConfirmationNumber,
                            contentDescription = "Price",
                            tint = AppTheme.colorScheme.secondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            event.displayPrice,
                            color = AppTheme.colorScheme.secondary, fontWeight = FontWeight.SemiBold
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
        Canvas(
            modifier = Modifier.matchParentSize()
        ) {
            val cutoutRadiusPx = with(density) { cutoutRadius.toPx() }
            val junctionYPx = with(density) { junctionY.toPx() }
            drawLine(
                color = dashColor,
                start = Offset(x = cutoutRadiusPx, y = junctionYPx),
                end = Offset(x = size.width - cutoutRadiusPx, y = junctionYPx),
                strokeWidth = dashStrokeWidth,
                pathEffect = pathEffect
            )
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
        colors = CardDefaults.cardColors(containerColor = Color(0xFFE0F7FA))
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp)
        ) {
            Image(
                painter = painterResource(id = R.drawable.invite),
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .size(250.dp)
                    .offset(x = 20.dp, y = 25.dp)
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
fun AppBottomBar(
    bottomNavController: NavHostController,
    onItemClick: (String) -> Unit
) {
    val navBackStackEntry by bottomNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val items = listOf(
        Screen.Home,
        Screen.Map,
        Screen.MyTickets,
        Screen.Profile
    )
    val icons = mapOf(
        Screen.Home.route to Icons.Default.Explore,
        Screen.Map.route to Icons.Default.Map,
        Screen.MyTickets.route to Icons.Default.ConfirmationNumber,
        Screen.Profile.route to Icons.Default.Person
    )
    val labels = mapOf(
        Screen.Home.route to "Explore",
        Screen.Map.route to "Map",
        Screen.MyTickets.route to "Tickets",
        Screen.Profile.route to "Profile"
    )

    BottomAppBar(
        containerColor = Color.White,
        actions = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                items.forEach { screen ->
                    NavigationBarItem(
                        selected = currentRoute == screen.route,
                        onClick = { onItemClick(screen.route) },
                        icon = {
                            Icon(
                                icons[screen.route]!!,
                                contentDescription = labels[screen.route]
                            )
                        },
                        label = { Text(labels[screen.route]!!) }
                    )
                }
            }
        }
    )
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
        // Previewing HomeScreen now requires a NavController
        // HomeScreen(navController = rememberNavController())
    }
}