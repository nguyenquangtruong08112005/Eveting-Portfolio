package com.tdtuer.eventing_organizer.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.LocalOffer
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.tdtuer.eventing_organizer.data.network.model.DashboardStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.helpers.AppUtils
import com.tdtuer.eventing_organizer.helpers.formatTimestampToDay
import com.tdtuer.eventing_organizer.helpers.formatTimestampToMonth
import com.tdtuer.eventing_organizer.ui.navigation.Screen
import com.tdtuer.eventing_organizer.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrganizerDashboardScreen(
    navController: NavController,
    viewModel: OrganizerDashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    // State cho Pull to Refresh
    val pullRefreshState = rememberPullToRefreshState()

    // State cho LazyColumn để detect scroll bottom
    val listState = rememberLazyListState()

    // Logic Load More khi cuộn xuống đáy
    // Sử dụng derivedStateOf để tối ưu performance, chỉ recompose khi giá trị boolean thay đổi
    val shouldLoadMore by remember {
        derivedStateOf {
            val layoutInfo = listState.layoutInfo
            val totalItems = layoutInfo.totalItemsCount
            if (totalItems == 0) return@derivedStateOf false

            val lastVisibleItemIndex = (layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) + 1
            // Load khi còn 2 item nữa là hết danh sách
            lastVisibleItemIndex > (totalItems - 2)
        }
    }

    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore && !uiState.isLoadingMore && !uiState.isRefreshing && !uiState.isLoading) {
            viewModel.onLoadMore()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { navController.navigate(Screen.Scanner.route) }) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan QR")
                    }
                    IconButton(onClick = { navController.navigate(Screen.Profile.route) }) {
                        Icon(Icons.Default.AccountCircle, contentDescription = "Profile")
                    }
                    IconButton(onClick = { navController.navigate(Screen.Settings.route) }) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                    IconButton(onClick = { navController.navigate(Screen.PromotionManagement.route) }) {
                        Icon(Icons.Default.LocalOffer, contentDescription = "Promotions")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppTheme.colorScheme.background)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigate(Screen.CreateEvent.route) },
                containerColor = AppTheme.colorScheme.primary
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create Event", tint = Color.White)
            }
        },
        containerColor = AppTheme.colorScheme.background
    ) { padding ->

        // PullToRefreshBox bao bọc nội dung
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.onRefresh() },
            state = pullRefreshState,
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            if (uiState.isLoading && uiState.myEvents.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // 1. Thống kê (Stats Cards)
                    item {
                        uiState.stats?.let { stats ->
                            StatsSection(stats)
                        }
                    }

                    // 2. Tiêu đề danh sách
                    item {
                        Text(
                            "Sự kiện của tôi",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    // 3. Danh sách sự kiện
                    if (uiState.myEvents.isEmpty() && !uiState.isLoading) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("Chưa có sự kiện nào. Hãy tạo ngay!", color = Color.Gray)
                            }
                        }
                    } else {
                        items(uiState.myEvents) { event ->
                            OrganizerEventCard(
                                event = event,
                                onClick = {
                                    navController.navigate(Screen.EventManagement.createRoute(event.id))
                                }
                            )
                        }
                    }

                    // 4. Loading Indicator khi đang load more
                    if (uiState.isLoadingMore) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            }
                        }
                    }

                    // Spacer dưới cùng để không bị FAB che
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }
}

@Composable
fun StatsSection(stats: DashboardStatsResponse) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatsCard(
            title = "Revenue",
            value = AppUtils.formatPrice(stats.totalRevenue),
            modifier = Modifier.weight(1f),
            color = Color(0xFF4CAF50)
        )
        StatsCard(
            title = "Tickets Sold",
            value = stats.totalTicketsSold.toString(),
            modifier = Modifier.weight(1f),
            color = Color(0xFF2196F3)
        )
    }
    Spacer(modifier = Modifier.height(12.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatsCard(
            title = "Total Events",
            value = stats.totalEvents.toString(),
            modifier = Modifier.weight(1f),
            color = Color(0xFFFF9800)
        )
        StatsCard(
            title = "Upcoming",
            value = stats.upcomingEvents.toString(),
            modifier = Modifier.weight(1f),
            color = Color(0xFF9C27B0)
        )
    }
}

@Composable
fun StatsCard(title: String, value: String, modifier: Modifier = Modifier, color: Color) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text(text = title, style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
fun OrganizerEventCard(event: MyEventDto, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .background(AppTheme.colorScheme.primary.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                    .padding(8.dp)
            ) {
                Text(
                    formatTimestampToDay(event.date),
                    fontWeight = FontWeight.Bold,
                    color = AppTheme.colorScheme.primary,
                    fontSize = 18.sp
                )
                Text(
                    formatTimestampToMonth(event.date),
                    color = AppTheme.colorScheme.primary,
                    fontSize = 12.sp
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    event.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))

                val (statusColor, statusText) = when (event.status.lowercase()) {
                    "active" -> Color(0xFF4CAF50) to "Published"
                    "pending" -> Color(0xFFFF9800) to "Pending Review"
                    "rejected" -> Color(0xFFF44336) to "Rejected"
                    else -> Color.Gray to event.status
                }

                Text(
                    text = "• $statusText",
                    color = statusColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}