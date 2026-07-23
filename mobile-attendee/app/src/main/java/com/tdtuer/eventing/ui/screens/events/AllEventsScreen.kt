// eventing.zip/ui/screens/events/AllEventsScreen.kt (ĐÃ CẬP NHẬT)
package com.tdtuer.eventing.ui.screens.events

import android.annotation.SuppressLint
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FilterAlt
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage // <-- (YÊU CẦU 4) Import AsyncImage
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.FilterParams
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToHour
import com.tdtuer.eventing.helpers.formatTimestampToMinute
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.formatTimestampToYear
import com.tdtuer.eventing.ui.components.GradientHeader
import com.tdtuer.eventing.ui.screens.home.FilterBottomSheet
import com.tdtuer.eventing.ui.screens.home.GlobalSearchState
import com.tdtuer.eventing.ui.screens.home.SharedSearchViewModel
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme
import com.tdtuer.eventing.ui.navigation.Screen // Import Screen routes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AllEventsScreen(
    viewModel: AllEventsViewModel = hiltViewModel(),
    sharedViewModel: SharedSearchViewModel,
    mainNavController: NavController, // <--- THÊM THAM SỐ NÀY
    bottomNavController: NavHostController // <-- Thêm NavController
) {
    val searchState by sharedViewModel.uiState.collectAsState()

    // Lấy state từ AllEventsViewModel (API thật)
    val allEvents by viewModel.events
    val isLoading by viewModel.isLoading
    val error by viewModel.error

    // (YÊU CẦU 1) State để mở Filter Sheet
    var showFilterSheet by rememberSaveable { mutableStateOf(false) }

    if (showFilterSheet) {
        FilterBottomSheet(
            currentFilters = searchState.activeFilters,
            onDismiss = { showFilterSheet = false },
            onApplyFilters = { params ->
                showFilterSheet = false
                sharedViewModel.applyFilters(params)
                // Không cần điều hướng, vì chúng ta đã ở màn hình Events
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Events",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = AppTheme.typography.headlineSmall.fontSize
                    )
                },
                // (YÊU CẦU 2) Xóa nút back
                navigationIcon = {
                    IconButton(onClick = { bottomNavController.popBackStack() }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                }, actions = {
                    // (YÊU CẦU 1) Khôi phục nút Search
                    IconButton(onClick = { showFilterSheet = true }) {
                        Icon(
                            Icons.Default.FilterAlt,
                            contentDescription = "Search/Filter",
                            tint = Color.White
                        )
                    }
                    IconButton(onClick = { viewModel.onMoreOptionsClick() }) {
                        Icon(
                            Icons.Default.MoreVert,
                            contentDescription = "More",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppTheme.colorScheme.primary)
            )
        },
        containerColor = AppTheme.colorScheme.surface
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding)) {

            val isActive = searchState.searchQuery.isNotBlank() ||
                    searchState.activeFilters != FilterParams()

            AnimatedVisibility(visible = isActive) {
                ActiveFiltersRow(
                    searchState = searchState,
                    onClear = { sharedViewModel.clearSearchAndFilters() }
                )
            }

            // Hiển thị kết quả tìm kiếm (nếu có)
            when (val result = searchState.searchResults) {
                is Result.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }

                is Result.Failure -> {
                    Text(
                        text = "Search Error: ${result.exception.message}",
                        modifier = Modifier
                            .padding(24.dp)
                            .fillMaxWidth(),
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center
                    )
                }

                is Result.Success -> {
                    val eventsToShow = if (isActive) {
                        // Map kết quả search (Domain) sang UI
                        result.data.map { mapDomainEventToListItem(it) }
                    } else {
                        // Dùng danh sách "All Events" từ API
                        allEvents
                    }

                    // Hiển thị Loading/Error của "All Events" (chỉ khi không search)
                    if (!isActive && isLoading) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    } else if (!isActive && error != null) {
                        Text(
                            text = "Lỗi tải danh sách: $error",
                            modifier = Modifier
                                .padding(24.dp)
                                .fillMaxWidth(),
                            color = MaterialTheme.colorScheme.error,
                            textAlign = TextAlign.Center
                        )
                    }
                    // Hiển thị danh sách
                    else if (eventsToShow.isEmpty()) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Text(
                                "No Events Found",
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "Try adjusting your search or filter criteria.",
                                style = MaterialTheme.typography.bodyLarge,
                                color = Color.Gray,
                                textAlign = TextAlign.Center
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            items(eventsToShow) { event ->
                                EventListCard(
                                    event = event,
                                    onItemClick = {
                                        mainNavController.navigate(Screen.EventDetails.createRoute(eventId = event.id))                                    }
                                )
                            }
                        }
                    }
                }
            }
        }

//        GradientHeader()
    }
}

// (YÊU CẦU 4) Cập nhật EventListCard để dùng AsyncImage
@Composable
fun EventListCard(event: EventListItem, onItemClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onItemClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Sử dụng AsyncImage để tải imageUrl (String)
            AsyncImage(
                model = event.imageUrl,
                contentDescription = event.title,
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop,
                // Thêm ảnh placeholder
                placeholder = painterResource(id = R.drawable.ic_launcher_background)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = event.dateTime,
                    color = AppTheme.colorScheme.secondary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = event.title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black,
                    lineHeight = 22.sp,
                    maxLines = 2, // Cho phép 2 dòng
                    overflow = TextOverflow.Ellipsis
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = "Location",
                        tint = Color.Gray,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = event.location,
                        color = Color.Gray,
                        fontSize = 13.sp,
                        maxLines = 1, // Chỉ 1 dòng
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

// (YÊU CẦU 4) Cập nhật hàm map
private fun mapDomainEventToListItem(event: Event): EventListItem {
    val dateString = "${formatTimestampToDay(event.date)} ${formatTimestampToMonth(event.date)}, ${
        formatTimestampToYear(event.date)
    }"
    val timeString = "${formatTimestampToHour(event.date)}:${formatTimestampToMinute(event.date)}"

    return EventListItem(
        id = event.id,
        title = event.name,
        dateTime = "$dateString ⋅ $timeString",
        location = event.location.ifEmpty { "${event.venueName}, ${event.city}" },
        imageUrl = event.imageUrl // <-- Dùng imageUrl
    )
}

// ... (ActiveFiltersRow và countActiveFilters giữ nguyên như trước)
@Composable
private fun ActiveFiltersRow(searchState: GlobalSearchState, onClear: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            .padding(horizontal = 24.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        val query = searchState.searchQuery
        val filterCount = countActiveFilters(searchState.activeFilters, query)

        val text = when {
            query.isNotBlank() && filterCount > 0 -> "\"$query\" + $filterCount filters"
            query.isNotBlank() -> "Searching for: \"$query\""
            filterCount > 0 -> "$filterCount filters active"
            else -> ""
        }

        Text(
            text = text,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )

        TextButton(onClick = onClear) {
            Text("Clear")
        }
    }
}

private fun countActiveFilters(params: FilterParams, query: String): Int {
    var count = 0
    if (params.query != null && params.query != query) count++
    if (params.categories.isNotEmpty()) count++
    if (params.datePreset != null || params.customDateRange != null) count++
    if (params.location != null) count++
    if (params.priceRange != null) count++
    // (Đã xóa artistName)
    return count
}

// --- Preview ---
@SuppressLint("UnusedMaterial3ScaffoldPaddingParameter")
@Preview(showBackground = true, showSystemUi = true)
@Composable
fun AllEventsScreenPreview() {
    EventingTheme {
        val sharedViewModel: SharedSearchViewModel = hiltViewModel()
        AllEventsScreen(
            viewModel = hiltViewModel(),
            sharedViewModel = sharedViewModel,
            bottomNavController = rememberNavController(),
            mainNavController = rememberNavController()
        )
    }
}