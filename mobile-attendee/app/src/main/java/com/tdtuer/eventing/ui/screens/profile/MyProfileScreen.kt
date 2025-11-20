package com.tdtuer.eventing.ui.screens.profile

import android.widget.Toast
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.navigation.Screen
import com.tdtuer.eventing.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyProfileScreen(
    viewModel: MyProfileViewModel = hiltViewModel(),
    navController: NavController? = null
) {
    val profileData by viewModel.profileData
    val selectedTab by viewModel.selectedTabIndex
    val isLoading by viewModel.isLoading
    val scrollState = rememberScrollState()

    // Refresh data khi quay lại màn hình (ví dụ sau khi Edit)
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.loadUserProfile()
    }

    Scaffold(
        containerColor = AppTheme.colorScheme.background
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {

            // 1. ẢNH BÌA (Cover Photo) - Nằm dưới cùng
            AsyncImage(
                model = profileData.coverPhotoUrl.ifEmpty { R.drawable.group_34057 },
                contentDescription = "Cover Photo",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp), // Chiều cao ảnh bìa
                contentScale = ContentScale.Crop
            )

            // 2. NỘI DUNG CHÍNH (Scrollable)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
            ) {
                // Spacer trong suốt để lộ ảnh bìa phía trên
                Spacer(modifier = Modifier.height(160.dp))

                // Phần Card Profile - Bắt đầu từ đây nền sẽ là màu trắng/background
                Box(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Background Card (Chứa thông tin text)
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 50.dp) // Đẩy card xuống để chừa chỗ cho Avatar nổi
                            .heightIn(min = 600.dp), // Đảm bảo chiều cao tối thiểu
                        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                        color = AppTheme.colorScheme.background,
                        shadowElevation = 0.dp
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(top = 60.dp, start = 24.dp, end = 24.dp, bottom = 100.dp)
                        ) {
                            // Tên & Email
                            Text(
                                text = profileData.userName,
                                style = MaterialTheme.typography.headlineMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 24.sp
                                ),
                                color = AppTheme.colorScheme.onBackground
                            )

                            // Nếu là Organizer thì hiện Email hoặc Title, nếu không hiện Email mờ
                            Text(
                                text = profileData.email,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.Gray,
                                modifier = Modifier.padding(top = 4.dp)
                            )

                            Spacer(modifier = Modifier.height(24.dp))

                            // Stats Section (Chỉ hiện nếu là Organizer hoặc có follower)
                            if (profileData.isOrganizer) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly
                                ) {
                                    StatItem(profileData.followingCount.toString(), "Following")
                                    VerticalDivider(Modifier.height(30.dp))
                                    StatItem(profileData.followersCount.toString(), "Followers")
                                }
                                Spacer(modifier = Modifier.height(24.dp))
                            }

                            // Action Buttons
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Button(
                                    onClick = { navController?.navigate(Screen.EditProfile.route) },
                                    modifier = Modifier.weight(1f).height(50.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = AppTheme.colorScheme.primary)
                                ) {
                                    Icon(Icons.Default.Edit, null, modifier = Modifier.size(18.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Edit Profile")
                                }

                                // Nút Settings (Đã thêm chức năng)
                                OutlinedButton(
                                    onClick = {
                                        // Điều hướng đến màn hình Settings
                                        navController?.navigate(Screen.Settings.route)
                                    },
                                    modifier = Modifier.height(50.dp).width(50.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    contentPadding = PaddingValues(0.dp),
                                    border = BorderStroke(1.dp, AppTheme.colorScheme.outline)
                                ) {
                                    Icon(Icons.Default.Settings, contentDescription = "Settings", tint = Color.Gray)
                                }
                            }

                            Spacer(modifier = Modifier.height(30.dp))

                            // TAB ROW
                            ProfileTabs(
                                selectedIndex = selectedTab,
                                onTabSelected = viewModel::onTabSelected
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            // TAB CONTENT
                            when(selectedTab) {
                                0 -> AboutSection(profileData.aboutMe)
                                1 -> JoinedEventsSection(
                                    profileData.joinedEvents,
                                    navController = navController
                                )
                                2 -> InterestsSection(profileData.interests) {
                                    navController?.navigate(Screen.EditProfile.route)
                                }
                            }
                        }
                    }

                    // AVATAR "NỔI" (Floating)
                    // Đặt ở cuối Box để vẽ đè lên Surface (z-index cao hơn)
                    // Căn giữa theo chiều ngang, dính sát mép trên của Box
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .size(110.dp) // Kích thước viền ngoài
                            .clip(CircleShape)
                            .background(AppTheme.colorScheme.background) // Viền cùng màu nền
                            .padding(4.dp) // Độ dày viền
                    ) {
                        AsyncImage(
                            model = profileData.profilePictureUrl,
                            contentDescription = "Avatar",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(CircleShape),
                            contentScale = ContentScale.Crop,
                            placeholder = painterResource(R.drawable.default_pfp),
                            error = painterResource(R.drawable.default_pfp)
                        )
                    }
                }
            }

            // 3. TOP BAR (Overlay trong suốt)
            TopBarOverlay(navController)

            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = AppTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
fun TopBarOverlay(navController: NavController?) {
    var showMenu by remember { mutableStateOf(false) } // State cho menu 3 chấm
    val context = LocalContext.current

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (navController != null && navController.previousBackStackEntry != null) {
            IconButton(
                onClick = { navController.popBackStack() },
                modifier = Modifier
                    .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                    .size(40.dp)
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
            }
        } else {
            Spacer(modifier = Modifier.size(40.dp))
        }

        Text("Profile", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)

        // Nút 3 Chấm (More Options)
        Box {
            IconButton(
                onClick = { showMenu = true }, // Mở menu
                modifier = Modifier
                    .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                    .size(40.dp)
            ) {
                Icon(Icons.Default.MoreVert, contentDescription = "More", tint = Color.White)
            }

            // Dropdown Menu
            DropdownMenu(
                expanded = showMenu,
                onDismissRequest = { showMenu = false },
                modifier = Modifier.background(Color.White)
            ) {
                DropdownMenuItem(
                    text = { Text("Share Profile") },
                    onClick = {
                        showMenu = false
                        Toast.makeText(context, "Share feature coming soon!", Toast.LENGTH_SHORT).show()
                        // TODO: Implement ShareUtils.shareText(...)
                    },
                    leadingIcon = {
                        Icon(Icons.Default.Share, contentDescription = null)
                    }
                )
                // Bạn có thể thêm các item khác như "Report", "Copy Link" tại đây
            }
        }
    }
}

@Composable
fun StatItem(count: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = count, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = AppTheme.colorScheme.onBackground)
        Text(text = label, color = Color.Gray, fontSize = 14.sp)
    }
}

@Composable
fun ProfileTabs(selectedIndex: Int, onTabSelected: (Int) -> Unit) {
    val tabs = listOf("About", "Events", "Interests")

    TabRow(
        selectedTabIndex = selectedIndex,
        containerColor = Color.Transparent,
        contentColor = AppTheme.colorScheme.primary,
        indicator = { tabPositions ->
            TabRowDefaults.SecondaryIndicator(
                modifier = Modifier.tabIndicatorOffset(tabPositions[selectedIndex]),
                height = 3.dp,
                color = AppTheme.colorScheme.primary
            )
        },
        divider = { HorizontalDivider(color = Color.LightGray.copy(alpha = 0.3f)) }
    ) {
        tabs.forEachIndexed { index, title ->
            Tab(
                selected = selectedIndex == index,
                onClick = { onTabSelected(index) },
                text = {
                    Text(
                        text = title.uppercase(),
                        fontWeight = if (selectedIndex == index) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 14.sp,
                        color = if (selectedIndex == index) AppTheme.colorScheme.primary else Color.Gray
                    )
                }
            )
        }
    }
}

// --- Tab Content Components ---

@Composable
fun AboutSection(about: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = about,
            style = MaterialTheme.typography.bodyLarge,
            color = Color.Gray,
            lineHeight = 24.sp
        )
        // TODO: Thêm nút "Read More" nếu text quá dài
    }
}

@Composable
fun JoinedEventsSection(events: List<JoinedEventItem>, navController: NavController?) {
    if (events.isEmpty()) {
        Box(modifier = Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
            Text("No events joined yet.", color = Color.Gray)
        }
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            events.forEach { event ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(2.dp),
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            // Sự kiện trong profile luôn là quá khứ (theo logic Joined Events)
                            navController?.navigate(Screen.PostEvent.createRoute(event.id))
                        }
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        AsyncImage(
                            model = event.imageUrl,
                            contentDescription = null,
                            modifier = Modifier.size(70.dp).clip(RoundedCornerShape(12.dp)).background(Color.LightGray),
                            contentScale = ContentScale.Crop,
                            placeholder = painterResource(R.drawable.ic_launcher_background)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(
                                text = event.date.uppercase(),
                                color = AppTheme.colorScheme.primary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = event.title,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun InterestsSection(interests: List<ProfileInterest>, onEditClick: () -> Unit) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Your Interests", fontWeight = FontWeight.Bold)
            TextButton(onClick = onEditClick) {
                Text("CHANGE", color = AppTheme.colorScheme.primary, fontSize = 12.sp)
            }
        }

        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            interests.forEach { interest ->
                SuggestionChip(
                    onClick = {},
                    label = { Text(interest.name, fontWeight = FontWeight.Medium) },
                    colors = SuggestionChipDefaults.suggestionChipColors(
                        containerColor = interest.backgroundColor,
                        labelColor = interest.color
                    ),
                    border = null,
                    shape = RoundedCornerShape(50)
                )
            }
        }
    }
}