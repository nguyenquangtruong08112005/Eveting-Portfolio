package com.tdtuer.eventing.ui.screens.postevent

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarOutline
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing.R
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.formatTimestampToYear
import com.tdtuer.eventing.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostEventScreen(
    viewModel: PostEventViewModel = hiltViewModel(),
    navController: NavController
) {
    val uiState by viewModel.uiState.collectAsState()

    val snackbarHostState = remember { SnackbarHostState() }

    // Lắng nghe lỗi và hiển thị Snackbar
    LaunchedEffect(uiState.error) {
        uiState.error?.let { errorMsg ->
            snackbarHostState.showSnackbar(errorMsg)
        }
    }

    // Media Picker
    val mediaLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        uri?.let { viewModel.onMediaSelected(it) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Event Memories", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppTheme.colorScheme.background)
            )
        },
        containerColor = AppTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { innerPadding ->
        // Dùng LazyColumn cho toàn bộ màn hình để scroll được cả phần Header
        LazyColumn(
            modifier = Modifier.padding(innerPadding).fillMaxSize(),
            contentPadding = PaddingValues(bottom = 16.dp)
        ) {
            // 1. Event Info Section (Header)
            item {
                uiState.event?.let { event ->
                    PostEventHeader(
                        event = event,
                        organizer = uiState.organizer
                    )
                }
            }

            // 2. Tabs
            item {
                TabRow(
                    selectedTabIndex = uiState.activeTab,
                    containerColor = AppTheme.colorScheme.surface,
                    contentColor = AppTheme.colorScheme.primary
                ) {
                    Tab(selected = uiState.activeTab == 0, onClick = { viewModel.onTabSelected(0) }, text = { Text("Reviews") })
                    Tab(selected = uiState.activeTab == 1, onClick = { viewModel.onTabSelected(1) }, text = { Text("Gallery") })
                }
            }

            // 3. Tab Content
            when (uiState.activeTab) {
                0 -> {
                    // Phần Write Review
                    item {
                        WriteReviewSection(
                            rating = uiState.userRating,
                            reviewText = uiState.userReview,
                            onRatingChange = viewModel::onRatingChange,
                            onReviewChange = viewModel::onReviewChange,
                            onSubmit = viewModel::onSubmitReview
                        )
                    }
                    // Danh sách Reviews
                    items(uiState.reviews) { review ->
                        ReviewItemCard(review)
                    }
                }
                1 -> {
                    // Phần Gallery (Do đang trong LazyColumn nên không thể dùng LazyVerticalGrid trực tiếp ở đây dễ dàng nếu không set height cố định)
                    // Cách giải quyết: Dùng FlowRow hoặc custom grid items.
                    // Đơn giản nhất cho demo: hiển thị danh sách ảnh.
                    item {
                        GallerySection(
                            mediaList = uiState.sharedMedia,
                            isUploading = uiState.isUploading,
                            onAddMediaClick = {
                                mediaLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun PostEventHeader(event: Event, organizer: FeaturedProfileDto?) {
    Column(modifier = Modifier.fillMaxWidth()) {
        // Banner Image
        AsyncImage(
            model = event.bannerUrl.ifEmpty { event.imageUrl },
            contentDescription = "Event Banner",
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp),
            contentScale = ContentScale.Crop,
            placeholder = painterResource(R.drawable.ic_launcher_background)
        )

        Column(modifier = Modifier.padding(16.dp)) {
            // Event Name & Date
            Text(
                text = event.name,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            val dateStr = "${formatTimestampToDay(event.date)} ${formatTimestampToMonth(event.date)} ${formatTimestampToYear(event.date)}"
            Text(
                text = dateStr,
                style = MaterialTheme.typography.bodyMedium,
                color = AppTheme.colorScheme.primary,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Organizer Row
            organizer?.let { org ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(
                        model = org.imageUrl,
                        contentDescription = "Organizer",
                        modifier = Modifier.size(40.dp).clip(CircleShape),
                        placeholder = painterResource(R.drawable.default_pfp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(text = "Organized by", fontSize = 12.sp, color = Color.Gray)
                        Text(text = org.name ?: "Unknown", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }
            }

            // Sponsors Row (nếu có)
            if (event.sponsors.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Text("Sponsors", fontSize = 12.sp, color = Color.Gray)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(event.sponsors) { sponsor ->
                        SuggestionChip(
                            onClick = {},
                            label = { Text(sponsor, fontSize = 12.sp) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun WriteReviewSection(
    rating: Int,
    reviewText: String,
    onRatingChange: (Int) -> Unit,
    onReviewChange: (String) -> Unit,
    onSubmit: () -> Unit
) {
    Card(
        modifier = Modifier.padding(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Write a Review", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(modifier = Modifier.height(8.dp))

            // Rating Stars
            Row(horizontalArrangement = Arrangement.Center, modifier = Modifier.fillMaxWidth()) {
                repeat(5) { index ->
                    val starIcon = if (index < rating) Icons.Filled.Star else Icons.Outlined.StarOutline
                    val starColor = if (index < rating) Color(0xFFFFC107) else Color.Gray
                    Icon(
                        imageVector = starIcon,
                        contentDescription = null,
                        tint = starColor,
                        modifier = Modifier
                            .size(40.dp)
                            .clickable { onRatingChange(index + 1) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = reviewText,
                onValueChange = onReviewChange,
                placeholder = { Text("Share your experience...") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AppTheme.colorScheme.primary
                )
            )
            Spacer(modifier = Modifier.height(12.dp))
            Button(
                onClick = onSubmit,
                modifier = Modifier.align(Alignment.End),
                colors = ButtonDefaults.buttonColors(containerColor = AppTheme.colorScheme.primary)
            ) {
                Text("Submit", color = Color.White)
            }
        }
    }
}

// Sử dụng FlowRow hoặc custom layout thay vì LazyVerticalGrid lồng trong LazyColumn
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GallerySection(
    mediaList: List<MediaItem>,
    isUploading: Boolean,
    onAddMediaClick: () -> Unit
) {
    Column(modifier = Modifier.padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("${mediaList.size} Photos/Videos", fontWeight = FontWeight.Bold)
            Button(
                onClick = onAddMediaClick,
                colors = ButtonDefaults.buttonColors(containerColor = AppTheme.colorScheme.secondaryContainer, contentColor = AppTheme.colorScheme.onSecondaryContainer),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
            ) {
                if (isUploading) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.AddAPhoto, null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add")
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
            maxItemsInEachRow = 3
        ) {
            // Tính toán kích thước ảnh dựa trên màn hình chia 3
            // Ở đây dùng size cố định hoặc weight giả lập
            mediaList.forEach { media ->
                AsyncImage(
                    model = media.url,
                    contentDescription = null,
                    modifier = Modifier
                        .size(110.dp) // Kích thước vuông
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.LightGray),
                    contentScale = ContentScale.Crop
                )
            }
        }
    }
}

// ... ReviewItemCard giữ nguyên
@Composable
fun ReviewItemCard(review: ReviewItem) {
    Card(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(modifier = Modifier.padding(16.dp)) {
            AsyncImage(
                model = review.avatarUrl.ifEmpty { R.drawable.default_pfp },
                contentDescription = null,
                modifier = Modifier.size(40.dp).clip(CircleShape),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(review.userName, fontWeight = FontWeight.Bold)
                Row {
                    repeat(5) { index ->
                        val color = if (index < review.rating) Color(0xFFFFC107) else Color.LightGray
                        Icon(Icons.Filled.Star, null, tint = color, modifier = Modifier.size(14.dp))
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(review.comment, fontSize = 14.sp, color = Color.Gray)
            }
        }
    }
}