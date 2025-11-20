package com.tdtuer.eventing.ui.screens.ticket

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.MyTicketUiModel
import com.tdtuer.eventing.ui.navigation.Screen
import com.tdtuer.eventing.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyTicketScreen(
    viewModel: MyTicketViewModel = hiltViewModel(),
    navController: NavController
) {
    val selectedStatusTab by viewModel.selectedStatusTab.collectAsState()
    val selectedTimeTab by viewModel.selectedTimeTab.collectAsState()
    val tickets by viewModel.displayedTickets.collectAsState()

    val isLoading by viewModel.isLoading.collectAsState()
    val isRefreshing by viewModel.isRefreshing.collectAsState()
    val isLoadingMore by viewModel.isLoadingMore.collectAsState()

    // Lấy màu cam gradient từ Theme
    val orangeGradient = AppTheme.extendedColors.orangeLinear

    val listState = rememberLazyListState()
    val pullRefreshState = rememberPullToRefreshState()

    // Logic Load More
    val shouldLoadMore = remember {
        derivedStateOf {
            val layoutInfo = listState.layoutInfo
            val totalItems = layoutInfo.totalItemsCount
            val lastVisibleItemIndex = (layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0) + 1
            totalItems > 5 && lastVisibleItemIndex > (totalItems - 3)
        }
    }

    LaunchedEffect(shouldLoadMore.value) {
        if (shouldLoadMore.value && !isLoadingMore && !isLoading && !isRefreshing) {
            viewModel.onLoadMore()
        }
    }

    Scaffold(
        topBar = {
            // --- HEADER GRADIENT MỚI ---
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(
                        RoundedCornerShape(
                            bottomStart = 24.dp,
                            bottomEnd = 24.dp
                        )
                    ) // Bo góc giống Explore
                    .background(brush = orangeGradient) // Dùng Gradient Cam
            ) {
                // Header Row
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 48.dp, bottom = 16.dp, start = 24.dp, end = 24.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "My Tickets",
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // ROW 1: Status Filter Chips
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        FilterPill(
                            "All",
                            0,
                            selectedStatusTab,
                            AppTheme.colorScheme.primary,
                            viewModel::onStatusTabSelected
                        )
                    }
                    item {
                        FilterPill(
                            "Success",
                            1,
                            selectedStatusTab,
                            AppTheme.colorScheme.primary,
                            viewModel::onStatusTabSelected
                        )
                    }
                    item {
                        FilterPill(
                            "Pending",
                            2,
                            selectedStatusTab,
                            AppTheme.colorScheme.primary,
                            viewModel::onStatusTabSelected
                        )
                    }
                    item {
                        FilterPill(
                            "Cancelled",
                            3,
                            selectedStatusTab,
                            AppTheme.colorScheme.primary,
                            viewModel::onStatusTabSelected
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // ROW 2: Time Tabs
                Row(modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)) {
                    TimeTabButton(
                        "Upcoming",
                        0,
                        selectedTimeTab,
                        Modifier.weight(1f),
                        viewModel::onTimeTabSelected
                    )
                    TimeTabButton(
                        "Past Events",
                        1,
                        selectedTimeTab,
                        Modifier.weight(1f),
                        viewModel::onTimeTabSelected
                    )
                }
                Spacer(modifier = Modifier.height(12.dp)) // Padding bottom trong header
            }
        },
        containerColor = AppTheme.colorScheme.background
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = isRefreshing,
            onRefresh = { viewModel.onRefresh() },
            state = pullRefreshState,
            modifier = Modifier
                .padding(padding)
                .fillMaxSize(),
            indicator = {
                PullToRefreshDefaults.Indicator(
                    modifier = Modifier.align(Alignment.TopCenter),
                    isRefreshing = isRefreshing,
                    containerColor = Color.White,
                    color = AppTheme.colorScheme.primary,
                    state = pullRefreshState
                )
            }
        ) {
            if (isLoading && tickets.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AppTheme.colorScheme.primary)
                }
            } else if (tickets.isEmpty()) {
                EmptyTicketState(
                    modifier = Modifier.align(Alignment.Center),
                    AppTheme.colorScheme.primary
                )
            } else {
                LazyColumn(
                    state = listState,
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(tickets) { ticket ->
                        TicketCard(ticket = ticket) {
                            // Logic kiểm tra: Nếu sự kiện đã qua -> PostEvent, chưa qua -> Ticket Detail
                            val currentTime = System.currentTimeMillis()
                            if (ticket.eventTimestamp < currentTime) {
                                navController.navigate(Screen.PostEvent.createRoute(ticket.eventId)) // Lưu ý: Cần dùng eventId thật, ở đây dùng tạm eventName hoặc sửa UiModel để có eventId
                                // TODO: Đảm bảo MyTicketUiModel có trường 'eventId' riêng, không dùng 'ticketId'
                            } else {
                                navController.navigate(Screen.Ticket.createRoute(ticket.ticketId))
                            }
                        }
                    }

                    if (isLoadingMore) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = AppTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

// ... (Các composable con FilterPill, TimeTabButton, TicketCard, EmptyTicketState giữ nguyên)

@Composable
fun FilterPill(
    text: String,
    index: Int,
    selectedIndex: Int,
    activeColor: Color,
    onClick: (Int) -> Unit
) {
    val isSelected = index == selectedIndex
    // Logic màu: Nếu chọn -> Nền trắng, chữ Cam. Nếu không -> Nền trắng mờ, chữ trắng.
    val backgroundColor = if (isSelected) Color.White else Color.White.copy(alpha = 0.2f)
    val textColor = if (isSelected) activeColor else Color.White

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(backgroundColor)
            .clickable { onClick(index) }
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            text = text,
            color = textColor,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp
        )
    }
}

@Composable
fun TimeTabButton(
    text: String,
    index: Int,
    selectedIndex: Int,
    modifier: Modifier,
    onClick: (Int) -> Unit
) {
    val isSelected = index == selectedIndex
    Column(
        modifier = modifier.clickable { onClick(index) },
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = text,
            color = if (isSelected) Color.White else Color.White.copy(alpha = 0.6f),
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
            modifier = Modifier.padding(bottom = 8.dp)
        )
        if (isSelected) {
            Box(
                modifier = Modifier
                    .width(40.dp)
                    .height(3.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(Color.White)
            )
        } else {
            Spacer(modifier = Modifier.height(3.dp))
        }
    }
}

@Composable
fun TicketCard(ticket: MyTicketUiModel, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Row(modifier = Modifier.padding(12.dp)) {
            AsyncImage(
                model = ticket.eventImageUrl,
                contentDescription = null,
                modifier = Modifier
                    .size(90.dp)
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop,
                placeholder = painterResource(R.drawable.ic_launcher_background)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    ticket.fullDate,
                    color = AppTheme.colorScheme.primary.copy(alpha = 0.8f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    ticket.eventName,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(ticket.location, fontSize = 12.sp, color = Color.Gray, maxLines = 1)
                Spacer(modifier = Modifier.height(8.dp))

                // Row chứa Status và Ticket Type
                Row(verticalAlignment = Alignment.CenterVertically) {
                    // Badge Trạng thái
                    Surface(
                        color = Color(ticket.status.color).copy(alpha = 0.1f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = ticket.status.label,
                            color = Color(ticket.status.color),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }

                    // Dấu chấm ngăn cách (nếu cần) hoặc khoảng cách
                    Spacer(modifier = Modifier.width(8.dp))

                    // --- THÔNG TIN HẠNG VÉ (MỚI) ---
                    Text(
                        text = "• ${ticket.ticketType}", // Ví dụ: "• VIP"
                        fontSize = 12.sp,
                        color = Color.Gray,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

@Composable
fun EmptyTicketState(modifier: Modifier, primaryColor: Color) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Image(
            painter = painterResource(id = R.drawable.group_34057),
            contentDescription = null,
            modifier = Modifier
                .size(150.dp)
                .alpha(0.5f)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "No tickets found",
            color = Color.Gray,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = { /* Navigate */ },
            colors = ButtonDefaults.buttonColors(containerColor = primaryColor)
        ) {
            Text("Buy Ticket Now")
        }
    }
}