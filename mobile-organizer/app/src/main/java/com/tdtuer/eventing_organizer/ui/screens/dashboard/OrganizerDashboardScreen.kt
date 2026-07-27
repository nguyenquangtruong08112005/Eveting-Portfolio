package com.tdtuer.eventing_organizer.ui.screens.dashboard

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.tdtuer.eventing_organizer.data.network.model.DashboardStatsResponse
import com.tdtuer.eventing_organizer.data.network.model.MyEventDto
import com.tdtuer.eventing_organizer.data.network.model.PayoutSummaryResponse
import com.tdtuer.eventing_organizer.helpers.AppUtils
import com.tdtuer.eventing_organizer.helpers.formatTimestampToDay
import com.tdtuer.eventing_organizer.helpers.formatTimestampToMonth
import com.tdtuer.eventing_organizer.ui.navigation.Graph
import com.tdtuer.eventing_organizer.ui.navigation.Screen
import com.tdtuer.eventing_organizer.ui.theme.AppTheme
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrganizerDashboardScreen(
    navController: NavController,
    viewModel: OrganizerDashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var eventToCancel by remember { mutableStateOf<MyEventDto?>(null) }

    LaunchedEffect(uiState.successMessage, uiState.error) {
        uiState.successMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearMessage()
        }
        uiState.error?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearMessage()
        }
    }

    if (eventToCancel != null) {
        AlertDialog(
            onDismissRequest = { eventToCancel = null },
            title = { Text("Hủy sự kiện") },
            text = { Text("Bạn có chắc chắn muốn hủy sự kiện \"${eventToCancel?.name}\" không? Hành động này không thể hoàn tác.") },
            confirmButton = {
                Button(
                    onClick = {
                        eventToCancel?.let { viewModel.cancelEvent(it.id) }
                        eventToCancel = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Red)
                ) {
                    Text("Xác nhận", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { eventToCancel = null }
                ) {
                    Text("Hủy")
                }
            }
        )
    }

    // State cho Menu Bottom Sheet
    var showMenuSheet by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState()

    // State cho Pull to Refresh & List
    val pullRefreshState = rememberPullToRefreshState()
    val listState = rememberLazyListState()

    // Logic Load More
    val shouldLoadMore by remember {
        derivedStateOf {
            val layoutInfo = listState.layoutInfo
            val totalItems = layoutInfo.totalItemsCount
            if (totalItems == 0) return@derivedStateOf false
            val lastVisibleItemIndex = (layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) + 1
            lastVisibleItemIndex > (totalItems - 2)
        }
    }

    LaunchedEffect(shouldLoadMore) {
        if (shouldLoadMore && !uiState.isLoadingMore && !uiState.isRefreshing && !uiState.isLoading) {
            viewModel.onLoadMore()
        }
    }

    if (showMenuSheet) {
        ModalBottomSheet(
            onDismissRequest = { showMenuSheet = false },
            sheetState = sheetState,
            containerColor = Color.White
        ) {
            OrganizerMenuSheetContent(
                onProfileClick = {
                    showMenuSheet = false
                    navController.navigate(Screen.Profile.route)
                },
                onSettingsClick = {
                    showMenuSheet = false
                    navController.navigate(Screen.Settings.route)
                },
                onLogoutClick = {
                    showMenuSheet = false
                    viewModel.onSignOut {
                        navController.navigate(Graph.AUTHENTICATION) {
                            popUpTo(Graph.MAIN_APP) { inclusive = true }
                        }
                    }
                }
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppTheme.colorScheme.background)
            )
        },
        bottomBar = {
            OrganizerBottomBar(
                currentTab = "Home", // Tab hiện tại là Home
                onNavigateToHome = { /* Đang ở Home, có thể scroll to top */ },
                onNavigateToPromotions = { navController.navigate(Screen.PromotionManagement.route) },
                onNavigateToScanner = { navController.navigate(Screen.Scanner.route) },
                onOpenMenu = { showMenuSheet = true }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { navController.navigate(Screen.CreateEvent.route) },
                containerColor = AppTheme.colorScheme.primary,
                modifier = Modifier.offset(y = (-10).dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create Event", tint = Color.White)
            }
        },
        containerColor = AppTheme.colorScheme.background
    ) { padding ->
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
                    item { uiState.stats?.let { stats -> StatsSection(stats) } }
                    item { FinanceSummaryCard(uiState.payoutSummary, uiState.payoutError) }
                    item {
                        Text(
                            "Sự kiện của tôi",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }

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
                                    navController.navigate(
                                        Screen.EventManagement.createRoute(
                                            event.id
                                        )
                                    )
                                },
                                onCancelClick = {
                                    eventToCancel = event
                                }
                            )
                        }
                    }

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
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }
}

@Composable
fun OrganizerBottomBar(
    currentTab: String, // "Home", "Voucher", "Scan", "Menu"
    onNavigateToHome: () -> Unit,
    onNavigateToPromotions: () -> Unit,
    onNavigateToScanner: () -> Unit,
    onOpenMenu: () -> Unit
) {
    NavigationBar(
        containerColor = Color.White,
        tonalElevation = 8.dp
    ) {
        NavigationBarItem(
            selected = currentTab == "Home",
            onClick = onNavigateToHome,
            icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
            label = { Text("Home") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AppTheme.colorScheme.primary,
                selectedTextColor = AppTheme.colorScheme.primary,
                indicatorColor = AppTheme.colorScheme.primary.copy(alpha = 0.1f)
            )
        )

        NavigationBarItem(
            selected = currentTab == "Voucher",
            onClick = onNavigateToPromotions,
            icon = { Icon(Icons.Default.LocalOffer, contentDescription = "Promos") },
            label = { Text("Voucher") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AppTheme.colorScheme.primary,
                selectedTextColor = AppTheme.colorScheme.primary,
                indicatorColor = AppTheme.colorScheme.primary.copy(alpha = 0.1f)
            )
        )

        NavigationBarItem(
            selected = false, // Scanner là hành động, không phải tab trạng thái (hoặc có thể đổi nếu muốn)
            onClick = onNavigateToScanner,
            icon = { Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan") },
            label = { Text("Scan") }
        )

        NavigationBarItem(
            selected = currentTab == "Menu",
            onClick = onOpenMenu,
            icon = { Icon(Icons.Default.Menu, contentDescription = "Menu") },
            label = { Text("Menu") },
            colors = NavigationBarItemDefaults.colors(
                selectedIconColor = AppTheme.colorScheme.primary,
                selectedTextColor = AppTheme.colorScheme.primary,
                indicatorColor = AppTheme.colorScheme.primary.copy(alpha = 0.1f)
            )
        )
    }
}

@Composable
fun OrganizerMenuSheetContent(
    onProfileClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onLogoutClick: () -> Unit
) {
    Column(modifier = Modifier
        .padding(16.dp)
        .navigationBarsPadding()) {
        Text(
            "Menu",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )
        MenuItemRow(
            icon = Icons.Default.AccountCircle,
            text = "Hồ sơ tổ chức",
            onClick = onProfileClick
        )
        MenuItemRow(icon = Icons.Default.Settings, text = "Cài đặt", onClick = onSettingsClick)
        HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
        MenuItemRow(
            icon = Icons.AutoMirrored.Filled.Logout,
            text = "Đăng xuất",
            onClick = onLogoutClick,
            color = Color.Red
        )
    }
}

// ... (Giữ nguyên MenuItemRow, StatsSection, StatsCard, OrganizerEventCard)
@Composable
fun MenuItemRow(icon: ImageVector, text: String, onClick: () -> Unit, color: Color = Color.Black) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(24.dp))
        Spacer(Modifier.width(16.dp))
        Text(text, fontSize = 16.sp, color = color, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun FinanceSummaryCard(summary: PayoutSummaryResponse?, isError: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Tổng quan tài chính",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))
            if (summary == null) {
                Text(
                    if (isError) "Thông tin tài chính chưa khả dụng" else "Đang tải...",
                    color = Color.Gray,
                    style = MaterialTheme.typography.bodySmall
                )
            } else {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    FinanceAmountCard("Đủ điều kiện", summary.eligibleNetAmount, Color(0xFF4CAF50), Modifier.weight(1f))
                    FinanceAmountCard("Chờ duyệt", summary.pendingApprovalAmount, Color(0xFFFF9800), Modifier.weight(1f))
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    FinanceAmountCard("Đang xử lý", summary.processingAmount, Color(0xFF2196F3), Modifier.weight(1f))
                    FinanceAmountCard("Đã nhận", summary.completedAmount, Color(0xFF9C27B0), Modifier.weight(1f))
                }
                if (summary.nextScheduledPayoutAt != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    val formattedDate = try {
                        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                        parser.timeZone = java.util.TimeZone.getTimeZone("UTC")
                        val formatter = SimpleDateFormat("dd/MM/yyyy", Locale("vi", "VN"))
                        formatter.timeZone = java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh")
                        formatter.format(parser.parse(summary.nextScheduledPayoutAt)!!)
                    } catch (e: Exception) {
                        null
                    }
                    if (formattedDate != null) {
                        Text(
                            "Thanh toán tiếp theo: $formattedDate",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FinanceAmountCard(title: String, amount: Double, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF8F9FA)),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(text = title, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = AppUtils.formatPrice(amount),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
        }
    }
}

@Composable
fun StatsSection(stats: DashboardStatsResponse) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        StatsCard(
            title = "Doanh thu",
            value = AppUtils.formatPrice(stats.totalRevenue),
            modifier = Modifier.weight(1f),
            color = Color(0xFF4CAF50)
        )
        StatsCard(
            title = "Vé đã bán",
            value = stats.totalTicketsSold.toString(),
            modifier = Modifier.weight(1f),
            color = Color(0xFF2196F3)
        )
    }
    Spacer(modifier = Modifier.height(12.dp))
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        StatsCard(
            title = "Tổng sự kiện",
            value = stats.totalEvents.toString(),
            modifier = Modifier.weight(1f),
            color = Color(0xFFFF9800)
        )
        StatsCard(
            title = "Sắp diễn ra",
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
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.Center) {
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
fun OrganizerEventCard(
    event: MyEventDto,
    onClick: () -> Unit,
    onCancelClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .background(
                        AppTheme.colorScheme.primary.copy(alpha = 0.1f),
                        RoundedCornerShape(8.dp)
                    )
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

            val statusLower = event.status.lowercase()
            if (statusLower == "active" || statusLower == "pending") {
                IconButton(
                    onClick = onCancelClick,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Cancel,
                        contentDescription = "Hủy sự kiện",
                        tint = Color.Red
                    )
                }
            }
        }
    }
}