package com.tdtuer.eventing.ui.screens.events

import android.annotation.SuppressLint
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.tdtuer.eventing.helpers.formatDisplayPrice
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
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailsScreen(
    viewModel: EventDetailsViewModel = hiltViewModel(),
    navController: NavHostController
) {
    val uiState by viewModel.uiState.collectAsState()
    var showShareSheet by remember { mutableStateOf(false) }
    val shareSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    if (showShareSheet && uiState.event != null) {
        ModalBottomSheet(
            onDismissRequest = { showShareSheet = false },
            sheetState = shareSheetState,
            containerColor = AppTheme.colorScheme.surface,
            contentWindowInsets = { WindowInsets.navigationBars }
        ) {
            ShareBottomSheetContent(
                viewModel = hiltViewModel<ShareViewModel>(),
                event = uiState.event!!,
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
                        painter = painterResource(id = R.drawable.error),
                        contentDescription = "Error",
                        modifier = Modifier.size(120.dp)
                    )
                    Text(
                        text = uiState.error!!,
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }

            uiState.event != null -> {
                EventDetailsContent(
                    event = uiState.event!!,
                    recommendations = uiState.recommendations,
                    viewModel = viewModel,
                    navController = navController,
                    onShareClick = { showShareSheet = true },
                    weather = uiState.weather,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailsContent(
    event: Event,
    recommendations: List<Event>,
    weather: Weather?,
    viewModel: EventDetailsViewModel,
    navController: NavHostController,
    onShareClick: () -> Unit
) {
    // Lọc danh sách Featured Profiles
    val profiles = (event.featuredProfiles as? List<*>)
        ?.filterIsInstance<FeaturedProfileDto>() ?: emptyList()

    // Tách Organizer và Guest/Artist
    val organizer = profiles.firstOrNull { it.profileType == "organizer" }
    val featuredGuests = profiles.filter { it.profileType != "organizer" }

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
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
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
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .background(AppTheme.colorScheme.surface),
            contentPadding = PaddingValues(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            val horizontalListPadding = Modifier.padding(horizontal = 16.dp)

            // --- 1. BANNER ---
            item { EventMediaSection(bannerUrl = event.bannerUrl, videoUrl = event.videoUrl) }

            // --- 2. INFO ---
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

            // --- 3. DESCRIPTION ---
            if (event.description.isNotBlank()) {
                item {
                    EventDescriptionSectionCard(
                        description = event.description,
                        modifier = horizontalListPadding
                    )
                }
            }

            // --- 4. TICKET INFO ---
            if (event.ticketTypes.isNotEmpty()) {
                item {
                    EventTicketInfoSectionCard(
                        ticketTypes = event.ticketTypes,
                        modifier = horizontalListPadding
                    )
                }
            }

            // --- 5. FEATURED PROFILES (KHÁCH MỜI/NGHỆ SĨ) ---
            // ĐÂY LÀ LỐI VÀO CHÍNH
            if (featuredGuests.isNotEmpty()) {
                item {
                    EventFeaturedProfilesSectionCard(
                        profiles = featuredGuests,
                        modifier = horizontalListPadding,
                        onProfileClick = { profileId ->
                            // Điều hướng sang màn hình FeaturedProfile
                            navController.navigate(Screen.FeaturedProfile.createRoute(profileId))
                        }
                    )
                }
            }

            // --- 6. ORGANIZER ---
            if (organizer != null) {
                item {
                    EventOrganizerSectionCard(
                        avatarUrl = organizer.imageUrl ?: "",
                        name = organizer.name ?: "Organizer",
                        onFollowClick = { viewModel.onFollowOrganizerClick() },
                        // Nếu organizer cũng có profileId riêng và bạn muốn cho xem profile họ:
                        // onProfileClick = { navController.navigate(Screen.FeaturedProfile.createRoute(organizer.id ?: "")) }
                        modifier = horizontalListPadding
                    )
                }
            }

            // --- 7. SPONSORS ---
            if (event.sponsors.isNotEmpty()) {
                item {
                    EventSponsorsSectionCard(
                        sponsors = event.sponsors,
                        modifier = horizontalListPadding
                    )
                }
            }

            // --- 8. YOU MAY ALSO LIKE ---
            if (recommendations.isNotEmpty()) {
                item {
                    EventSuggestionsSectionCard(
                        suggestions = recommendations,
                        onEventClick = { suggestedEvent ->
                            navController.navigate(Screen.EventDetails.createRoute(suggestedEvent.id))
                        }
                    )
                }
            }

            // --- SEE MORE BUTTON ---
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    OutlinedButton(
                        onClick = { navController.navigate(Screen.Events.route) },
                        border = RequestConstants.BorderPrimary,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = AppTheme.colorScheme.primary)
                    ) {
                        Text("See more events", fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
        GradientHeader()
    }
}

// ... (Các Composable cũ giữ nguyên: EventMediaSection, EventInfoSection, EventDescriptionSectionCard) ...

@Composable
fun EventMediaSection(bannerUrl: String, videoUrl: String?) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
            .offset(y = (-8).dp)
    ) {
        AsyncImage(
            model = bannerUrl,
            contentDescription = "Event Banner",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            placeholder = painterResource(id = R.drawable.ic_launcher_background) // Placeholder tạm
        )
    }
}

@Composable
fun EventInfoSection(
    name: String,
    date: Long,
    weather: Weather?,
    venueName: String,
    address: String
) {
    Column(modifier = Modifier
        .fillMaxWidth()
        .padding(24.dp)) {
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
                formatTimestampToYear(date)
            }",
            subtitle = "Tuesday, 4:00PM - 9:00PM"
        )
        Spacer(modifier = Modifier.height(16.dp))
        EventDetailRow(icon = Icons.Default.LocationOn, title = venueName, subtitle = address)
        if (weather != null) {
            Spacer(modifier = Modifier.height(16.dp))
            WeatherInfoCard(weather = weather)
        }
    }
}

@Composable
fun EventDescriptionSectionCard(description: String, modifier: Modifier) {
    var isExpanded by remember { mutableStateOf(false) }
    val maxLines = if (isExpanded) 100 else 5
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier
            .padding(24.dp)
            .animateContentSize(animationSpec = tween(300))) {
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

// --- CẬP NHẬT: TICKET INFO CARD VỚI DESCRIPTION ---
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
                // Lấy description từ Map (nếu có)
                val description = details["description"] as? String ?: ""

                TicketTypeRow(name = name, price = price, description = description)
                Divider(modifier = Modifier.padding(vertical = 8.dp))
            }
        }
    }
}

@Composable
fun EventFeaturedProfilesSectionCard(
    profiles: List<FeaturedProfileDto>,
    modifier: Modifier,
    onProfileClick: (String) -> Unit // <-- Callback khi click vào profile
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            SectionHeader("Invited participants")
            Spacer(modifier = Modifier.height(16.dp))

            LazyRow(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                items(profiles) { profile ->
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .width(80.dp)
                            .clickable { // <-- GẮN SỰ KIỆN CLICK Ở ĐÂY
                                profile.id?.let { onProfileClick(it) }
                            }
                    ) {
                        AsyncImage(
                            model = profile.imageUrl ?: R.drawable.default_pfp,
                            contentDescription = null,
                            modifier = Modifier
                                .size(60.dp)
                                .clip(CircleShape),
                            contentScale = ContentScale.Crop,
                            placeholder = painterResource(R.drawable.default_pfp),
                            error = painterResource(R.drawable.default_pfp)
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = profile.name ?: "Unknown",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = profile.profileType?.replaceFirstChar { it.uppercase() }
                                ?: "Artist",
                            fontSize = 10.sp,
                            color = Color.Gray
                        )
                    }
                }
            }
        }
    }
}


// ... (EventOrganizerSectionCard, EventSponsorsSectionCard giữ nguyên) ...

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
                        Text(
                            name,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Medium
                        ); Text("Organizer", fontSize = 14.sp, color = Color.Gray)
                    }
                }
                Button(
                    onClick = onFollowClick,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = AppTheme.colorScheme.primary.copy(alpha = 0.8f)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) { Text("Follow", color = Color.White) }
            }
        }
    }
}

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

@Composable
fun EventSuggestionsSectionCard(
    suggestions: List<Event>,
    onEventClick: (Event) -> Unit
) {
    Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)) {
        SectionHeader("You may also like")
        Spacer(modifier = Modifier.height(16.dp))

        // Grid Logic bên trong LazyColumn (Sử dụng Chunked)
        val chunkedEvents = suggestions.chunked(2)

        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            chunkedEvents.forEach { rowItems ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    rowItems.forEach { event ->
                        Box(modifier = Modifier.weight(1f)) {
                            SuggestedEventCard(event = event, onClick = { onEventClick(event) })
                        }
                    }
                    if (rowItems.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
fun SuggestedEventCard(event: Event, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column {
            AsyncImage(
                model = event.imageUrl.ifEmpty { event.bannerUrl },
                contentDescription = event.name,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)),
                contentScale = ContentScale.Crop,
                placeholder = painterResource(id = R.drawable.ic_launcher_background),
                error = painterResource(id = R.drawable.ic_launcher_background)
            )

            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = event.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp,
                    color = Color.Black
                )
                Spacer(modifier = Modifier.height(4.dp))
                val dateStr =
                    "${formatTimestampToDay(event.date)} ${formatTimestampToMonth(event.date)}"
                Text(
                    text = dateStr,
                    fontSize = 12.sp,
                    color = AppTheme.colorScheme.primary,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = event.venueName.ifEmpty { event.city },
                    fontSize = 11.sp,
                    color = Color.Gray,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text = title,
        fontSize = 20.sp,
        fontWeight = FontWeight.Bold
    )
}

// --- CẬP NHẬT: TICKET TYPE ROW VỚI DESCRIPTION ---
@Composable
fun TicketTypeRow(name: String, price: Double, description: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
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
            )
        }
        // Hiển thị description nếu có
        if (description.isNotBlank()) {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = description,
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray,
                lineHeight = 16.sp
            )
        }
    }
}

@Composable
fun BuyTicketBottomBar(
    priceValue: String,
    priceLabel: String,
    onBuyClick: () -> Unit
) {
    BottomAppBar(
        containerColor = AppTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 12.dp),
        tonalElevation = 8.dp
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(text = priceLabel, color = Color.Gray, fontSize = 14.sp)
                if (priceValue.isNotEmpty()) {
                    Text(
                        text = priceValue,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = AppTheme.extendedColors.textPrimary
                    )
                }
            }

            Button(
                onClick = onBuyClick,
                colors = ButtonDefaults.buttonColors(containerColor = AppTheme.colorScheme.primary),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 32.dp, vertical = 14.dp)
            ) {
                Text("Buy Now", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}

object RequestConstants {
    val BorderPrimary = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF6200EE))
}