package com.tdtuer.eventing.ui.screens.home

import TicketShape
import android.Manifest
import android.net.Uri
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForwardIos
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberMultiplePermissionsState
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.FilterParams
import com.tdtuer.eventing.ui.navigation.Graph
import com.tdtuer.eventing.ui.navigation.Screen
import com.tdtuer.eventing.ui.screens.events.AllEventsScreen
import com.tdtuer.eventing.ui.screens.location.MapViewScreen
import com.tdtuer.eventing.ui.screens.profile.MyProfileScreen
import com.tdtuer.eventing.ui.screens.ticket.MyTicketScreen
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme
import kotlinx.coroutines.flow.collectLatest
import com.google.accompanist.permissions.rememberPermissionState
import com.google.accompanist.permissions.PermissionStatus
import com.tdtuer.eventing.ui.screens.notifications.NotificationPermissionDialog

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun HomeScreen(
    modifier: Modifier = Modifier,
    navController: NavController,
    onMenuClick: () -> Unit = {},
    onCurrentRouteChanged: (String) -> Unit = {}
) {
    val bottomNavController = rememberNavController()
    val navBackStackEntry by bottomNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    LaunchedEffect(currentRoute) {
        onCurrentRouteChanged(currentRoute ?: Screen.Home.route)
    }

    Scaffold(
        modifier = modifier,
        bottomBar = {
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
        BottomNavGraph(
            modifier = Modifier.padding(innerPadding),
            mainNavController = navController,
            bottomNavController = bottomNavController,
            onMenuClick = onMenuClick
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
        startDestination = Screen.Home.route,
        modifier = modifier
    ) {
        composable(Screen.Home.route) {
            ExploreScreen(
                mainNavController = mainNavController,
                bottomNavController = bottomNavController,
                onMenuClick = onMenuClick,
                viewModel = hiltViewModel<HomeViewModel>(),
                sharedViewModel = sharedViewModel
            )
        }
        composable(Screen.Events.route) {
            AllEventsScreen(
                viewModel = hiltViewModel(),
                sharedViewModel = sharedViewModel,
                bottomNavController = bottomNavController,
                mainNavController = mainNavController
            )
        }
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
        composable(Screen.Profile.route) {
            MyProfileScreen(
                viewModel = hiltViewModel(),
                navController = mainNavController
            )
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class, ExperimentalLayoutApi::class)
@Composable
fun ExploreScreen(
    mainNavController: NavController,
    onMenuClick: () -> Unit,
    viewModel: HomeViewModel,
    bottomNavController: NavHostController,
    sharedViewModel: SharedSearchViewModel
) {
    // State từ ViewModel
    val videoEvents by viewModel.videoEvents
    val trendingEvents by viewModel.trendingEvents
    val forYouEvents by viewModel.forYouEvents
    val nearbyEvents by viewModel.nearbyEvents

    val searchState by sharedViewModel.uiState.collectAsState()
    val locationPermissionsState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION
        )
    )

    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
        val notificationPermissionState = rememberPermissionState(
            permission = Manifest.permission.POST_NOTIFICATIONS
        )

        // State để điều khiển hiển thị dialog giải thích
        var showNotificationDialog by remember { mutableStateOf(false) }

        // Kiểm tra lần đầu: Nếu chưa cấp quyền -> Hiện dialog
        LaunchedEffect(Unit) {
            if (!notificationPermissionState.status.isGranted) {
                showNotificationDialog = true
            }
        }

        if (showNotificationDialog) {
            NotificationPermissionDialog(
                onAllowClicked = {
                    showNotificationDialog = false
                    notificationPermissionState.launchPermissionRequest()
                },
                onDismiss = {
                    showNotificationDialog = false
                }
            )
        }
    }

    var showFilterSheet by rememberSaveable { mutableStateOf(false) }

    if (showFilterSheet) {
        FilterBottomSheet(
            currentFilters = searchState.activeFilters,
            onDismiss = { showFilterSheet = false },
            onApplyFilters = { params ->
                showFilterSheet = false
                sharedViewModel.applyFilters(params)
                bottomNavController.navigate(Screen.Events.route) {
                    popUpTo(bottomNavController.graph.startDestinationId) { saveState = true }
                    launchSingleTop = true
                    restoreState = true
                }
            }
        )
    }

    LaunchedEffect(key1 = locationPermissionsState) {
        val allPermissionsGranted = locationPermissionsState.permissions.all { it.status.isGranted }
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

    val onDestinationClick = { city: String ->
        val params = FilterParams(location = city)
        sharedViewModel.applyFilters(params)
        bottomNavController.navigate(Screen.Events.route) {
            popUpTo(bottomNavController.graph.startDestinationId) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    val navigateToDetail = { id: String ->
        mainNavController.navigate(Screen.EventDetails.createRoute(id))
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(AppTheme.colorScheme.background)
    ) {
        // 1. Header
        item {
            HomeHeader(
                viewModel = viewModel,
                onMenuClick = onMenuClick,
                onNotificationsClick = { mainNavController.navigate(Screen.Notifications.route) },
                bottomNavController = bottomNavController,
                sharedViewModel = sharedViewModel,
                onFilterClick = { showFilterSheet = true }
            )
        }

        // 2. VIDEO SLIDER
        if (videoEvents.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(20.dp))
                SectionTitle("Highlights", showSeeAll = false)
                Spacer(modifier = Modifier.height(12.dp))
                VideoEventSlider(events = videoEvents, onEventClick = navigateToDetail)
            }
        }

        // 3. DESTINATIONS
        item {
            Spacer(modifier = Modifier.height(24.dp))
            SectionTitle("Popular Destinations", showSeeAll = false)
            Spacer(modifier = Modifier.height(12.dp))
            DestinationsRow(viewModel.popularDestinations, onDestinationClick)
        }

        // 4. TRENDING
        if (trendingEvents.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(24.dp))
                SectionTitle("Trending Now 🔥", onSeeAll = {
                    val params = FilterParams(sortBy = "hotScore", sortOrder = "desc")
                    sharedViewModel.applyFilters(params)
                    bottomNavController.navigate(Screen.Events.route)
                })
                Spacer(modifier = Modifier.height(12.dp))
                EventHorizontalList(trendingEvents, navigateToDetail)
            }
        }

        // 5. FOR YOU (Grid)
        if (forYouEvents.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(24.dp))
                SectionTitle("For You ❤️", onSeeAll = {

                }, showSeeAll = false)
                Spacer(modifier = Modifier.height(12.dp))
                // Grid giả lập bằng FlowRow trong LazyColumn
                EventGridSection(forYouEvents, navigateToDetail)
            }
        }

        // 6. NEARBY
        if (nearbyEvents.isNotEmpty()) {
            item {
                Spacer(modifier = Modifier.height(24.dp))
                SectionTitle("Nearby You 📍")
                Spacer(modifier = Modifier.height(12.dp))
                EventHorizontalList(nearbyEvents, navigateToDetail)
            }
        }

        item {
            Spacer(modifier = Modifier.height(24.dp))
            InviteBanner(onInviteClick = { viewModel.onInviteFriendsClick() })
            Spacer(modifier = Modifier.height(100.dp))
        }
    }
}

// --- CÁC UI COMPONENTS (Bổ sung các hàm bị thiếu) ---

@Composable
fun SectionTitle(title: String, showSeeAll: Boolean = true, onSeeAll: () -> Unit = {}) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
            fontSize = 18.sp,
            color = AppTheme.colorScheme.onBackground
        )
        if (showSeeAll) {
            TextButton(onClick = onSeeAll) {
                Text("See All", color = Color.Gray)
                Icon(
                    Icons.AutoMirrored.Filled.ArrowForwardIos,
                    contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = Color.Gray
                )
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun VideoEventSlider(events: List<EventCardUiModel>, onEventClick: (String) -> Unit) {
    val pagerState = rememberPagerState(pageCount = { events.size })

    Column {
        HorizontalPager(
            state = pagerState,
            contentPadding = PaddingValues(horizontal = 24.dp),
            pageSpacing = 16.dp
        ) { page ->
            val event = events[page]

            // Kiểm tra xem slide này có đang được hiển thị chính giữa không
            // pagerState.currentPage == page: Đang active
            // !pagerState.isScrollInProgress: Không đang vuốt dở dang (tùy chọn, để mượt hơn)
            val isPageActive = (pagerState.currentPage == page)

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp)
                    .clickable { onEventClick(event.id) },
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Box(modifier = Modifier.fillMaxSize()) {

                    if (!event.videoUrl.isNullOrBlank()) {
                        // --- TRƯỜNG HỢP CÓ VIDEO ---
                        // (Tùy chọn) Icon Mute/Unmute hoặc label "LIVE"
                        Icon(
                            Icons.AutoMirrored.Filled.VolumeOff,
                            contentDescription = null,
                            tint = Color.White.copy(0.7f),
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(8.dp)
                                .size(24.dp)
                        )

                        AutoLoopVideoPlayer(
                            videoUrl = event.videoUrl,
                            isPlaying = isPageActive, // Chỉ phát khi đang ở trang này
                            modifier = Modifier.fillMaxSize()
                        )

                    } else {
                        // --- TRƯỜNG HỢP KHÔNG CÓ VIDEO (Fallback Image) ---
                        AsyncImage(
                            model = event.imageUrl,
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )

                        // Lớp phủ tối để chữ dễ đọc hơn
                        Box(modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(0.3f)))

                        // Nút Play giả (chỉ để trang trí nếu muốn nhấn mạnh đây là media)
                        // Hoặc có thể ẩn đi nếu chỉ là ảnh thường
                    }

                    // --- THÔNG TIN SỰ KIỆN (Hiển thị đè lên trên) ---
                    // Dùng Gradient đen mờ ở dưới đáy để chữ rõ hơn trên nền video/ảnh
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .height(80.dp)
                            .background(
                                brush = androidx.compose.ui.graphics.Brush.verticalGradient(
                                    colors = listOf(Color.Transparent, Color.Black.copy(0.8f))
                                )
                            )
                    )

                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(16.dp)
                    ) {
                        Text(
                            text = event.name,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = event.displayDate + " " + event.displayMonth,
                            color = Color.White.copy(0.9f),
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DestinationsRow(destinations: List<Destination>, onCityClick: (String) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        items(destinations) { city ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.clickable { onCityClick(city.name) }
            ) {
                AsyncImage(
                    model = city.imageUrl,
                    contentDescription = city.name,
                    modifier = Modifier
                        .size(70.dp)
                        .clip(CircleShape)
                        .border(2.dp, AppTheme.colorScheme.primary, CircleShape),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    city.name,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = AppTheme.colorScheme.onBackground
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun EventGridSection(events: List<EventCardUiModel>, onEventClick: (String) -> Unit) {
    FlowRow(
        modifier = Modifier.padding(horizontal = 24.dp),
        maxItemsInEachRow = 2,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        events.forEach { event ->
            EventGridCard(
                event = event,
                modifier = Modifier.weight(1f),
                onClick = { onEventClick(event.id) }
            )
        }
    }
}

@Composable
fun EventGridCard(event: EventCardUiModel, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column {
            AsyncImage(
                model = event.imageUrl,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp),
                contentScale = ContentScale.Crop
            )
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    event.name,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    event.displayPrice,
                    color = AppTheme.colorScheme.primary,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
fun EventHorizontalList(events: List<EventCardUiModel>, onEventClick: (String) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        items(events) { event ->
            EventCard(
                event = event,
                onBookmarkClick = {},
                onCardClick = { onEventClick(event.id) }
            )
        }
    }
}

// --- CÁC COMPOSABLE CŨ GIỮ NGUYÊN ---

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
    val dashStrokeWidth = 10f
    val dashColor = AppTheme.colorScheme.outline.copy(alpha = 0.7f)
    val dashWidth = 10f
    val dashGap = 10f
    val pathEffect = PathEffect.dashPathEffect(floatArrayOf(dashWidth, dashGap), 0f)
    val ticketShape = remember(cornerRadius, cutoutRadius, junctionY) {
        TicketShape(cornerRadius, cutoutRadius, junctionY)
    }

    Box(modifier = Modifier
        .width(300.dp)
        .clickable(onClick = onCardClick)) {
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
                }
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = event.name,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        color = Color.Black
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
                            color = AppTheme.colorScheme.secondary,
                            fontWeight = FontWeight.SemiBold
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
        Canvas(modifier = Modifier.matchParentSize()) {
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

@OptIn(ExperimentalMaterial3Api::class)
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
            .background(brush = AppTheme.extendedColors.orangeLinear)
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
                    sharedViewModel.onHomeSearchTriggered()
                    bottomNavController.navigate(Screen.Events.route) {
                        popUpTo(bottomNavController.graph.startDestinationId) { saveState = true }
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

@Composable
fun AppBottomBar(bottomNavController: NavHostController, onItemClick: (String) -> Unit) {
    val navBackStackEntry by bottomNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val items = listOf(Screen.Home, Screen.Map, Screen.MyTickets, Screen.Profile)
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

    BottomAppBar(containerColor = Color.White, actions = {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
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
    })
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
        Box(modifier = Modifier
            .fillMaxWidth()
            .height(150.dp)) {
            Image(
                painter = painterResource(id = R.drawable.invite),
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .size(250.dp)
                    .offset(x = 20.dp, y = 25.dp)
            )
            Column(modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(horizontal = 24.dp)) {
                Text(
                    text = "Invite your friends",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = "Get $20 for ticket", color = Color.Gray, fontSize = 14.sp)
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

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
fun AutoLoopVideoPlayer(
    videoUrl: String,
    isPlaying: Boolean, // Biến này để kiểm soát chỉ phát khi slide đang active
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    // Log URL để kiểm tra
    Log.d("VideoPlayer", "Attempting to play video from URL: $videoUrl")

    // 1. Khởi tạo ExoPlayer
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            val mediaItem = MediaItem.fromUri(Uri.parse(videoUrl))
            setMediaItem(mediaItem)
            prepare()
            videoScalingMode = C.VIDEO_SCALING_MODE_SCALE_TO_FIT_WITH_CROPPING // Crop cho đẹp
            repeatMode = Player.REPEAT_MODE_ONE // Tự động Loop
            volume = 0f // Mặc định tắt tiếng (Mute) để không gây phiền, user có thể bật sau
        }
    }

    // 2. Điều khiển Play/Pause dựa trên trạng thái Pager
    LaunchedEffect(isPlaying) {
        if (isPlaying) {
            exoPlayer.play()
        } else {
            exoPlayer.pause()
        }
    }

    // 3. Thêm listener để bắt lỗi và dọn dẹp tài nguyên
    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onPlayerError(error: PlaybackException) {
                super.onPlayerError(error)
                // Log lỗi ra đây để kiểm tra
                Log.e("VideoPlayer", "ExoPlayer Error: ", error)
            }
        }
        exoPlayer.addListener(listener)

        onDispose {
            exoPlayer.removeListener(listener)
            exoPlayer.release()
        }
    }

    // 4. Hiển thị PlayerView
    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                player = exoPlayer
                useController = false // Ẩn các nút điều khiển (Play/Pause/Seekbar)
                resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM // Zoom full khung hình
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            }
        },
        modifier = modifier
    )
}
