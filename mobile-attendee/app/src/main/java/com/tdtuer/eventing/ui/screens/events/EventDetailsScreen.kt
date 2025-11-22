package com.tdtuer.eventing.ui.screens.events

import android.annotation.SuppressLint
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import com.tdtuer.eventing.R
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Weather
import com.tdtuer.eventing.helpers.formatDisplayPrice // <-- ĐÃ IMPORT
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.formatTimestampToYear
import com.tdtuer.eventing.helpers.formatVNCurrency
import com.tdtuer.eventing.ui.components.EventDetailRow
import com.tdtuer.eventing.ui.components.GradientHeader
import com.tdtuer.eventing.ui.components.WeatherInfoCard
import com.tdtuer.eventing.ui.navigation.Screen
import com.tdtuer.eventing.ui.screens.share.ShareBottomSheetContent
import com.tdtuer.eventing.ui.screens.share.ShareViewModel
// import com.tdtuer.eventing.ui.components.FacePile // Không còn dùng
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme

// --- Composable Chính (Quản lý State) ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailsScreen(
    viewModel: EventDetailsViewModel = hiltViewModel(),
    navController: NavHostController
) {
    val uiState by viewModel.uiState.collectAsState()
    var showShareSheet by remember { mutableStateOf(false) }
    val shareSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (showShareSheet && uiState.event != null) { // Kiểm tra event != null
        ModalBottomSheet(
            onDismissRequest = { showShareSheet = false },
            sheetState = shareSheetState,
            containerColor = AppTheme.colorScheme.surface,
            contentWindowInsets = { WindowInsets.navigationBars }
        ) {
            ShareBottomSheetContent(
                viewModel = hiltViewModel<ShareViewModel>(),
                event = uiState.event!!, // <--- TRUYỀN EVENT VÀO ĐÂY
                onCancel = { showShareSheet = false }
            )
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            uiState.isLoading -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }

            uiState.error != null -> {
                Column(
                    modifier = Modifier.align(Alignment.Center),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.error), // <-- THAY THẾ BẰNG ICON CỦA BẠN
                        contentDescription = "No Event Details Found",
                        modifier = Modifier
                            .size(120.dp)
                    )

                    Text(
                        text = uiState.error!!,
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .padding(16.dp)
                    )
                }
            }

            uiState.event != null -> {
                EventDetailsContent(
                    event = uiState.event!!,
                    viewModel = viewModel,
                    navController = navController,
                    onShareClick = { showShareSheet = true },
                    weather = uiState.weather,
                )
            }
        }
    }
}

// --- Composable Nội dung (Scaffold & LazyColumn) ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailsContent(
    event: Event,
    weather: Weather?,
    viewModel: EventDetailsViewModel,
    navController: NavHostController,
    onShareClick: () -> Unit
) {
    // Trích xuất dữ liệu
    val profiles = (event.featuredProfiles as? List<*>)
        ?.filterIsInstance<FeaturedProfileDto>() ?: emptyList()
    val organizer = profiles.firstOrNull { it.profileType == "organizer" }

    LaunchedEffect(Unit) {
        viewModel.navChannel.collect { navEvent ->
            when (navEvent) {
                is EventDetailsViewModel.BuyTicketNavigation.ToBuyTicket -> {
                    navController.navigate(
                        Screen.BookEvent.createRoute(navEvent.eventId, navEvent.ticketData)
                    )
                }
            }
        }
    }

    Scaffold(
        topBar = {
            // TopAppBar trong suốt đè lên ảnh
            TopAppBar(
                title = {
                    Text(
                        "Event Details",
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                },
                actions = {
                    IconButton(onClick = onShareClick) {
                        Icon(Icons.Default.Share, "Share", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.Transparent
                )
            )
        },
        bottomBar = {
            val fullPriceString = formatDisplayPrice(event.minPrice)

            val (priceLabel, priceValue) = if (fullPriceString == "Free") {
                "Free" to ""
            } else {
                "Starts at" to fullPriceString.removePrefix("Starts at ")
            }

            BuyTicketBottomBar(
                priceValue = priceValue,
                priceLabel = priceLabel,
                onBuyClick = { viewModel.onBuyTicketClick() }
            )
        }
    ) { innerPadding -> // innerPadding CÓ TỒN TẠI

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(AppTheme.colorScheme.surface),
            contentPadding = PaddingValues(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp) // Khoảng cách giữa các Card
        ) {
            val horizontalListPadding = Modifier.padding(horizontal = 16.dp)
            // --- PHẦN 1: BANNER (Không phải Card) ---
            item {
                EventMediaSection(
                    bannerUrl = event.bannerUrl,
                    videoUrl = event.videoUrl
                )
            }

            // --- PHẦN 2: TÊN, THỜI GIAN, ĐỊA ĐIỂM (Card 1) ---
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .then(horizontalListPadding),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    EventInfoSection(
                        name = event.name,
                        date = event.date,
                        venueName = event.venueName,
                        address = event.venueDetails["address"]?.toString() ?: event.location,
                        weather = weather
                    )
                }
            }

            // --- PHẦN 3: DESCRIPTION (Card 2) ---
            if (event.description.isNotBlank()) {
                item {
                    EventDescriptionSectionCard(
                        description = event.description, modifier = horizontalListPadding
                    )
                }
            }

            // --- PHẦN 4: THÔNG TIN VÉ (Card 3) ---
            if (event.ticketTypes.isNotEmpty()) {
                item {
                    EventTicketInfoSectionCard(
                        ticketTypes = event.ticketTypes,
                        modifier = horizontalListPadding
                    )
                }
            }

            // --- PHẦN 5: BAN TỔ CHỨC (Card 4) ---
            if (organizer != null) {
                item {
                    EventOrganizerSectionCard(
                        avatarUrl = organizer.imageUrl ?: "",
                        name = organizer.name ?: "Organizer",
                        onFollowClick = { viewModel.onFollowOrganizerClick() },
                        modifier = horizontalListPadding
                    )
                }
            }

            // --- PHẦN 6: SPONSORS (Card 5) ---
            if (event.sponsors.isNotEmpty()) {
                item {
                    EventSponsorsSectionCard(
                        sponsors = event.sponsors,
                        modifier = horizontalListPadding
                    )
                }
            }

            // --- PHẦN 7: CÓ THỂ BẠN CŨNG THÍCH (Card 6) ---
            item {
                EventSuggestionsSectionCard()
            }

            // --- NÚT XEM THÊM SỰ KIỆN (Footer) ---
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp), // Giảm padding
                    contentAlignment = Alignment.Center
                ) {
                    OutlinedButton(onClick = { /* TODO: Navigate to All Events */ }) {
                        Text("See more events")
                    }
                }
            }

            // Spacer dự phòng cho BottomAppBar
            item {
                Spacer(modifier = Modifier.height(80.dp))
            }
        }
        // Lớp phủ gradient
        GradientHeader()
    }
}

// --- PHẦN 1: MEDIA (Banner) ---
@Composable
fun EventMediaSection(bannerUrl: String, videoUrl: String?) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
            // Offset âm để điền vào vùng status bar
            .offset(y = (-8).dp)
    ) {
        AsyncImage(
            model = bannerUrl,
            contentDescription = "Event Banner",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            placeholder = painterResource(id = R.drawable.banner_svgrepo_com)
        )
    }
}

// --- PHẦN 2: THÔNG TIN (Bên trong Card) ---
@Composable
fun EventInfoSection(
    name: String,
    date: Long,
    weather: Weather?,
    venueName: String,
    address: String
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
    ) {
        Text(
            text = name,
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            lineHeight = 36.sp
        )
        Spacer(modifier = Modifier.height(24.dp))
        EventDetailRow(
            icon = Icons.Default.CalendarToday,
            title = "${formatTimestampToDay(date)} ${formatTimestampToMonth(date)}, ${
                formatTimestampToYear(
                    date
                )
            }",
            subtitle = "Tuesday, 4:00PM - 9:00PM" // TODO: Cần thêm logic định dạng giờ
        )
        Spacer(modifier = Modifier.height(16.dp))

        EventDetailRow(
            icon = Icons.Default.LocationOn,
            title = venueName,
            subtitle = address
        )

        if (weather != null) {
            Spacer(modifier = Modifier.height(16.dp))
            WeatherInfoCard(weather = weather)
        }
    }
}

// --- PHẦN 3: DESCRIPTION (Card 2) ---
@Composable
fun EventDescriptionSectionCard(description: String, modifier: Modifier) {
    var isExpanded by remember { mutableStateOf(false) }
    val maxLines = if (isExpanded) 100 else 5

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .animateContentSize(animationSpec = tween(300))
        ) {
            SectionHeader("About Event")
            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = description,
                color = Color.Gray,
                fontSize = 16.sp,
                lineHeight = 24.sp,
                maxLines = maxLines,
                overflow = TextOverflow.Ellipsis
            )

            TextButton(
                onClick = { isExpanded = !isExpanded },
                modifier = Modifier.align(Alignment.End)
            ) {
                Text(if (isExpanded) "Show less" else "Read more")
            }
        }
    }
}

// --- PHẦN 4: THÔNG TIN VÉ (Card 3) ---
@Composable
fun EventTicketInfoSectionCard(ticketTypes: Map<String, Map<String, Any>>, modifier: Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            SectionHeader("Ticket Info")
            Spacer(modifier = Modifier.height(24.dp))

            ticketTypes.forEach { (name, details) ->
                val price = (details["price"] as? Number)?.toDouble() ?: 0.0
                TicketTypeRow(name = name, price = price)
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }
        }
    }
}

// --- PHẦN 5: BAN TỔ CHỨC (Card 4) ---
@Composable
fun EventOrganizerSectionCard(
    avatarUrl: String,
    name: String,
    onFollowClick: () -> Unit,
    modifier: Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            SectionHeader("Organizer")
            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    AsyncImage(
                        model = avatarUrl,
                        contentDescription = "Organizer Avatar",
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape),
                        contentScale = ContentScale.Crop,
                        placeholder = painterResource(id = R.drawable.default_pfp)
                    )
                    Spacer(modifier = Modifier.width(16.dp))
                    Column {
                        Text(name, fontSize = 18.sp, fontWeight = FontWeight.Medium)
                        Text("Organizer", fontSize = 14.sp, color = Color.Gray)
                    }
                }
                Button(
                    onClick = onFollowClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AppTheme.colorScheme.primary.copy(
                            alpha = 0.8f
                        )
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Follow", color = Color.White)
                }
            }
        }
    }
}

// --- PHẦN 6: SPONSORS (Card 5) ---
@Composable
fun EventSponsorsSectionCard(sponsors: List<String>, modifier: Modifier) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            SectionHeader("Sponsors")
            Spacer(modifier = Modifier.height(16.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                items(sponsors) { sponsorName ->
                    Card(
                        modifier = Modifier.size(width = 120.dp, height = 80.dp),
                        elevation = CardDefaults.cardElevation(2.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                sponsorName,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(8.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}

// --- PHẦN 7: CÓ THỂ BẠN CŨNG THÍCH (Card 7) ---
@Composable
fun EventSuggestionsSectionCard() {
    Column(modifier = Modifier.padding(24.dp)) {
        SectionHeader("You might also like")
        Spacer(modifier = Modifier.height(16.dp))
        Text("... (Suggested event list) ...", color = Color.Gray)
    }
}


// --- COMPOSABLE HELPER (Header cho mỗi Card) ---
@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        fontSize = 20.sp,
        fontWeight = FontWeight.Bold
    )
}

// --- COMPOSABLE HELPER (Row cho loại vé) ---
@Composable
fun TicketTypeRow(name: String, price: Double) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(name, style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium)
        Text(
            formatVNCurrency(price),
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Bold
        ) // <-- SỬA: Dùng VNĐ
    }
}


// --- BOTTOM APP BAR (Đã sửa lỗi) ---
@Composable
fun BuyTicketBottomBar(
    priceValue: String,
    priceLabel: String,
    onBuyClick: () -> Unit
) {
    BottomAppBar(
        containerColor = AppTheme.colorScheme.surface, // Nền trắng
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
        tonalElevation = 8.dp // Thêm shadow
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween // Đẩy 2 item ra 2 bên
        ) {
            Column {
                Text(
                    text = priceLabel, // "Starts at" hoặc "Free"
                    color = Color.Gray,
                    fontSize = 14.sp
                )
                if (priceValue.isNotEmpty()) {
                    Text(
                        text = priceValue, // "150.000 ₫"
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = AppTheme.extendedColors.textPrimary
                    )
                }
            }

            Button(
                onClick = onBuyClick,
                colors = ButtonDefaults.buttonColors(
                    containerColor = AppTheme.colorScheme.primary
                ),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 32.dp, vertical = 14.dp)
            ) {
                Text(
                    "Buy Now",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            }
        }
    }
}


@SuppressLint("ViewModelConstructorInComposable")
@Preview(showBackground = true, showSystemUi = true)
@Composable
fun EventDetailsScreenPreview() {
    EventingTheme {
        EventDetailsScreen(
            navController = rememberNavController(),
        )
    }
}