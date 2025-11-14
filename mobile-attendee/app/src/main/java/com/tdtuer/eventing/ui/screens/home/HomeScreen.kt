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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
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
import com.tdtuer.eventing.ui.screens.events.AllEventsScreen
import com.tdtuer.eventing.ui.screens.schedule.CalendarScreen

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun HomeScreen(
    modifier: Modifier = Modifier, // <-- Thêm modifier
    navController: NavController, // Đây là mainNavController
    onMenuClick: () -> Unit = {}
) {
    // 1. Tạo một NavController nội bộ cho Bottom Bar
    val bottomNavController = rememberNavController()

    Scaffold(
        modifier = modifier, // <-- Áp dụng modifier (cho Drawer)
        bottomBar = {
            // 2. Truyền bottomNavController vào BottomBar
            AppBottomBar(
                bottomNavController = bottomNavController,
                onItemClick = { route ->
                    bottomNavController.navigate(route) {
                        // Pop up về start destination để tránh back stack lớn
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
    NavHost(
        navController = bottomNavController,
        startDestination = Screen.Home.route, // Bắt đầu ở tab Home
        modifier = modifier
    ) {
        // Tab 1: Home (Explore)
        composable(Screen.Home.route) {
            ExploreScreen(
                mainNavController = mainNavController,
                onMenuClick = onMenuClick,
                viewModel = hiltViewModel<HomeViewModel>() // HomeViewModel giờ thuộc về tab này
            )
        }

        // Tab 2: Events
        composable(Screen.Events.route) {
            // (Bạn cần import AllEventsScreen và viewModel của nó)
            AllEventsScreen(
                viewModel = hiltViewModel()
            )
        }

        // Tab 3: Map
        composable(Screen.Map.route) {
            // (Bạn cần import MapViewScreen và viewModel của nó)
            MapViewScreen(viewModel = hiltViewModel())
        }

        // Tab 4: Profile
        composable(Screen.Profile.route) {
            // (Bạn cần import MyProfileScreen và viewModel của nó)
            MyProfileScreen(viewModel = hiltViewModel())
        }
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun ExploreScreen(
    mainNavController: NavController,
    onMenuClick: () -> Unit,
    viewModel: HomeViewModel // Nhận ViewModel từ BottomNavGraph
) {
    val upcomingEvents by viewModel.upcomingEvents
    val nearbyEvents by viewModel.nearbyEvents

    // (Code xin quyền và LaunchedEffect cho NavEvent giữ nguyên)
    val locationPermissionsState = rememberMultiplePermissionsState(
        permissions = listOf(
            Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION
        )
    )

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

    // Đây là LazyColumn cũ của bạn
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
                })
        }
        item {
            EventSection(
                "Upcoming Events",
                upcomingEvents,
                viewModel,
                mainNavController
            )
        } // <-- Thêm mainNavController
        item { InviteBanner(onInviteClick = { viewModel.onInviteFriendsClick() }) }

        if (nearbyEvents.isNotEmpty()) {
            item {
                EventSection(
                    "Nearby You",
                    nearbyEvents,
                    viewModel,
                    mainNavController
                )
            } // <-- Thêm mainNavController
        }
    }
}

@Composable
fun HomeHeader(
    viewModel: HomeViewModel, onMenuClick: () -> Unit,
    onNotificationsClick: () -> Unit = {}
) {
    val categories by viewModel.categories
    val selectedCategoryName = viewModel.selectedCategoryName
    val currentLocation by viewModel.currentLocationDisplay

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
                    ) // This could come from ViewModel
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
fun EventSection(
    name: String,
    events: List<EventCardUiModel>,
    viewModel: HomeViewModel,
    mainNavController: NavController // <-- Thêm tham số này
) {
    Column(modifier = Modifier.padding(vertical = 24.dp)) {
        // ... (Phần Row "See All" giữ nguyên)
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
                    event = event,
                    onBookmarkClick = { viewModel.onEventBookmarkClick(event) },
                    onCardClick = { // <-- Thêm hành động click
                        mainNavController.navigate(
                            Screen.EventDetails.createRoute(event.id)
                        )
                    }
                )
            }
        }
    }
}

@Composable
fun EventCard(
    event: EventCardUiModel,
    onBookmarkClick: () -> Unit,
    onCardClick: () -> Unit
) {
    val density = LocalDensity.current

    // --- Cấu hình cho hiệu ứng vé ---
    val cornerRadius = 16.dp
    val cutoutRadius = 12.dp
    val junctionY = 150.dp // Chiều cao của Box chứa ảnh

    // 1. "phần lõm là màu nền"
    val cutoutColor = AppTheme.colorScheme.background

    // 2. "height của dash dày hơn"
    val dashStrokeWidth = 10f
    val dashColor = AppTheme.colorScheme.outline.copy(alpha = 0.7f)
    val dashWidth = 10f
    val dashGap = 10f
    val pathEffect = PathEffect.dashPathEffect(floatArrayOf(dashWidth, dashGap), 0f)

    // 3. Cấu hình Inset Shadow (Bóng mờ cho vết lõm)
    val shadowRadius = cutoutRadius // Lớn hơn vết lõm 4.dp
    val shadowColor = Color.Black.copy(alpha = 0f) // Màu đen mờ
    // --- Kết thúc cấu hình ---

    // Khởi tạo TicketShape
    val ticketShape = remember(cornerRadius, cutoutRadius, junctionY) {
        TicketShape(cornerRadius, cutoutRadius, junctionY)
    }

    // Sử dụng Box để xếp chồng Card và Canvas
    Box(
        modifier = Modifier
            .width(300.dp)
            .clickable(onClick = onCardClick)
    ) {

        // LỚP 1: CARD (NỘI DUNG CHÍNH, BỊ CẮT XÉN)
        Card(
//            modifier = Modifier.matchParentSize(),
            shape = ticketShape, // <-- ÁP DỤNG SHAPE CẮT XÉN
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
        ) {
            // Column này và mọi thứ bên trong nó sẽ bị cắt (clip)
            // bởi `ticketShape`
            Column {
                Box(modifier = Modifier.height(junctionY)) {
                    AsyncImage(
                        model = event.imageUrl,
                        contentDescription = event.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                        placeholder = painterResource(id = R.drawable.ic_launcher_background)
                    )
                    // ... (Code Box ngày tháng không đổi) ...
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
                    // ... (Code IconButton bookmark không đổi) ...
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
        // *** THAY ĐỔI 2: LỚP PHỦ (BÊN TRÊN) ***
        // Canvas này sẽ vẽ "đè lên" Column nội dung
        Canvas(
            modifier = Modifier.matchParentSize()
        ) {
            val cutoutRadiusPx = with(density) { cutoutRadius.toPx() }
            val junctionYPx = with(density) { junctionY.toPx() }
//                // 1. Vẽ "lỗ cắt" bên trái (đè lên AsyncImage)
//                //    với màu nền của màn hình
//                drawCircle(
//                    color = cutoutColor,
//                    radius = cutoutRadiusPx,
//                    center = Offset(x = 0f, y = junctionYPx),
//                )
//
//                // 2. Vẽ "lỗ cắt" bên phải (đè lên AsyncImage)
//                //    với màu nền của màn hình
//                drawCircle(
//                    color = cutoutColor,
//                    radius = cutoutRadiusPx,
//                    center = Offset(x = size.width, y = junctionYPx)
//                )

            // 3. Vẽ đường răng cưa (đè lên AsyncImage)
            //    với độ dày 3f
            drawLine(
                color = dashColor,
                start = Offset(x = cutoutRadiusPx, y = junctionYPx),
                end = Offset(x = size.width - cutoutRadiusPx, y = junctionYPx),
                strokeWidth = dashStrokeWidth, // <-- Đã dày hơn
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
fun AppBottomBar(
    bottomNavController: NavHostController, // <-- Nhận bottomNavController
    onItemClick: (String) -> Unit
) {
    // Lấy trạng thái back stack hiện tại để biết item nào đang được chọn
    val navBackStackEntry by bottomNavController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val items = listOf(
        Screen.Home,
        Screen.Events,
        Screen.Map,
        Screen.Profile
    )
    val icons = mapOf(
        Screen.Home.route to Icons.Default.Explore,
        Screen.Events.route to Icons.Default.CalendarToday,
        Screen.Map.route to Icons.Default.Map,
        Screen.Profile.route to Icons.Default.Person
    )
    val labels = mapOf(
        Screen.Home.route to "Explore",
        Screen.Events.route to "Events",
        Screen.Map.route to "Map",
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
                    // Bỏ qua Spacer, chỉ thêm 4 item
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
// HomeScreen(
// viewModel = HomeViewModel(),
// navController = null
// ) // Preview needs a NavController now
    }
}