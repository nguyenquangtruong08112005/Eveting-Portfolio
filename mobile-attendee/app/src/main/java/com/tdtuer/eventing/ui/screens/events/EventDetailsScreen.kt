package com.tdtuer.eventing.ui.screens.events

// (Import TicketShape nếu bạn vẫn dùng, nếu không thì xóa dòng này)
// import TicketShape
import android.annotation.SuppressLint
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Share // <-- Import icon Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import coil.compose.AsyncImage
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.helpers.formatDisplayPrice
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import com.tdtuer.eventing.helpers.formatTimestampToYear
import com.tdtuer.eventing.ui.components.EventDetailRow
import com.tdtuer.eventing.ui.components.FacePile
import com.tdtuer.eventing.ui.components.GradientButton
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme
// *** THÊM IMPORT NÀY ĐỂ SỬA LỖI ***
import com.tdtuer.eventing.data.network.model.featuredProfilesDto

@Composable
fun EventDetailsScreen(
    viewModel: EventDetailsViewModel = hiltViewModel(),
    navController: NavHostController
) {
    val uiState by viewModel.uiState.collectAsState()

    // 1. Quản lý các trạng thái UI
    Box(modifier = Modifier.fillMaxSize()) {
        when {
            uiState.isLoading -> {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            }

            uiState.error != null -> {
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(16.dp)
                )
            }

            uiState.event != null -> {
                EventDetailsContent(
                    event = uiState.event!!,
                    viewModel = viewModel,
                    navController = navController
                )
            }
        }
    }
}

// 2. Composable nội dung chính (Scaffold)
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailsContent(
    event: Event, // <-- Nhận Domain Model
    viewModel: EventDetailsViewModel,
    navController: NavHostController
) {
    // 1. Ép kiểu `event.featuredProfiles` (là List<Any>) về List<featuredProfilesDto>
    val profiles = (event.featuredProfiles as? List<*>)
        ?.filterIsInstance<featuredProfilesDto>() // Lọc ra các item đúng kiểu DTO
        ?: emptyList()

    // 2. Truy cập thuộc tính trực tiếp (ví dụ: it.profileType)
    val attendeeAvatars = profiles
        .filter { it.profileType == "attendee" } // <-- Dùng .profileType
        .mapNotNull { it.imageUrl } // <-- Dùng .imageUrl
        .take(3)

    // 3. Truy cập thuộc tính trực tiếp
    val organizer = profiles
        .firstOrNull { it.profileType == "organizer" } // <-- Dùng .profileType

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Event Details",
                        color = Color.White, // Chữ trắng
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) { // Thêm hành động
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White // Icon trắng
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { /* TODO: Xử lý logic share */ }) { // Thêm nút Share
                        Icon(
                            Icons.Default.Share,
                            contentDescription = "Share",
                            tint = Color.White // Icon trắng
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AppTheme.colorScheme.primary
                )
            )
        },
        bottomBar = {
            BuyTicketBottomBar(
                price = formatDisplayPrice(event.minPrice),
                onBuyClick = { /* TODO: Xử lý logic mua vé */ })
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                // Xóa padding(innerPadding) để nội dung cuộn bên dưới TopAppBar
                .verticalScroll(rememberScrollState())
                .background(Color(0xFFF7F7F7))
        ) {
            // Header giờ không cần onBackClick
            EventDetailsHeader(
                bannerImageUrl = event.bannerUrl,
                facePileAvatarUrls = attendeeAvatars,
                goingCountText = "${event.viewCount}+ Going",
                onBookmarkClick = { viewModel.onBookmarkClick() },
                onInviteClick = { viewModel.onInviteClick() }
            )

            Column(modifier = Modifier.padding(horizontal = 24.dp)) {
                Spacer(modifier = Modifier.height(30.dp)) // Tăng khoảng cách do Card "Going"

                Text(
                    text = event.name,
                    fontSize = 32.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 36.sp
                )

                Spacer(modifier = Modifier.height(24.dp))

                EventDetailRow(
                    icon = Icons.Default.CalendarToday,
                    title = "${formatTimestampToDay(event.date)} ${formatTimestampToMonth(event.date)}, ${
                        formatTimestampToYear(
                            event.date
                        )
                    }",
                    subtitle = "Thứ Ba, 16:00 - 21:00" // TODO: Lấy thời gian thực từ model
                )
                Spacer(modifier = Modifier.height(16.dp))

                EventDetailRow(
                    icon = Icons.Default.LocationOn,
                    title = event.venueName,
                    subtitle = event.venueDetails["address"].toString()
                )
                Spacer(modifier = Modifier.height(16.dp))

//                OrganizerRow(
//                    // *** SỬA LỖI CLASSCASTEXCEPTION ***
//                    avatarUrl = organizer?.imageUrl ?: "", // <-- Dùng .imageUrl
//                    name = organizer?.name ?: "Nhà tổ chức", // <-- Dùng .name
//                    role = "Organizer",
//                    onFollowClick = { viewModel.onFollowOrganizerClick() }
//                )

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "About Event",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = event.description,
                    color = Color.Gray,
                    fontSize = 16.sp,
                    lineHeight = 24.sp
                )
                Spacer(modifier = Modifier.height(24.dp)) // Thêm khoảng đệm cho BottomBar
            }
        }
    }
}

// 8. Cập nhật EventDetailsHeader
@Composable
fun EventDetailsHeader(
    bannerImageUrl: String,
    facePileAvatarUrls: List<String>,
    goingCountText: String,
    // onBackClick đã được chuyển lên TopAppBar
    onBookmarkClick: () -> Unit,
    onInviteClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(260.dp)
        // Xóa .clip() để TopAppBar không bị cắt
    ) {
        AsyncImage(
            model = bannerImageUrl,
            contentDescription = "Event Banner",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
            placeholder = painterResource(id = R.drawable.banner_svgrepo_com)
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Black.copy(alpha = 0.5f), Color.Transparent),
                        startY = 0f,
                        endY = 300f // Tăng vùng gradient
                    )
                )
        )

        // (Row TopAppBar cũ đã bị xóa)

        // *** KHÔI PHỤC CARD "GOING" ***
//        Card(
//            modifier = Modifier
//                .align(Alignment.BottomCenter)
//                .offset(y = 30.dp) // Đẩy Card xuống
//                .fillMaxWidth()
//                .padding(horizontal = 24.dp),
//            shape = RoundedCornerShape(16.dp),
//            colors = CardDefaults.cardColors(containerColor = Color.White),
//            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
//        ) {
//            Row(
//                modifier = Modifier
//                    .fillMaxWidth()
//                    .padding(16.dp),
//                verticalAlignment = Alignment.CenterVertically,
//                horizontalArrangement = Arrangement.SpaceBetween
//            ) {
//                Row(verticalAlignment = Alignment.CenterVertically) {
////                    FacePile(avatarUrls = facePileAvatarUrls) // <-- Đã sửa
//                    Spacer(modifier = Modifier.width(8.dp))
//                    Text(goingCountText, color = Color(0xFF3F38DD), fontWeight = FontWeight.SemiBold)
//                }
//                Button(
//                    onClick = onInviteClick,
//                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5669FF)),
//                    shape = RoundedCornerShape(12.dp)
//                ) {
//                    Text("Invite", color = Color.White)
//                }
//            }
//        }
    }
    // Spacer này quan trọng để tạo khoảng trống cho Card "Going"
//    Spacer(modifier = Modifier.height(30.dp))
}

// 9. Cập nhật OrganizerRow (Không đổi)
@Composable
fun OrganizerRow(
    avatarUrl: String,
    name: String,
    role: String,
    onFollowClick: () -> Unit
) {
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
                Text(role, fontSize = 14.sp, color = Color.Gray)
            }
        }
        Button(
            onClick = onFollowClick,
            colors = ButtonDefaults.buttonColors(containerColor = AppTheme.colorScheme.primary.copy(alpha = 0.8f)),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text("Follow", color = Color.White)
        }
    }
}

// 10. BuyTicketBottomBar (Không đổi)
@Composable
fun BuyTicketBottomBar(price: String, onBuyClick: () -> Unit) {
    BottomAppBar(
        containerColor = AppTheme.colorScheme.onSurface,
        modifier = Modifier.fillMaxWidth(),
        contentPadding = PaddingValues(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            Column {
//                Text("Start at", color = Color.Gray, fontSize = 14.sp)
                Text(
                    text = price,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
//            Spacer(modifier = Modifier.weight(1f))
            Button(
                onClick = onBuyClick,
                colors = ButtonDefaults.buttonColors(containerColor = AppTheme.colorScheme.primary),
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