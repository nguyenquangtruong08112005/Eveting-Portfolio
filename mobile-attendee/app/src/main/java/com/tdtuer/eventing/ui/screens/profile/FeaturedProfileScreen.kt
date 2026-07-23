package com.tdtuer.eventing.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.PersonRemove
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.AppTheme

@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun FeaturedProfileScreen(
    viewModel: FeaturedProfileViewModel = hiltViewModel(),
    navController: NavController
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(
                        onClick = { navController.popBackStack() },
                        modifier = Modifier
                            .background(Color.Black.copy(alpha = 0.3f), CircleShape)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Transparent)
            )
        },
        containerColor = AppTheme.colorScheme.background
    ) { innerPadding ->
        Box(modifier = Modifier.fillMaxSize()) {

            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else if (uiState.profile != null) {
                val profile = uiState.profile!!

                // 1. Cover Photo (Nền)
                AsyncImage(
                    model = profile.imageUrl ?: R.drawable.group_34057,
                    contentDescription = "Cover",
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(280.dp),
                    contentScale = ContentScale.Crop,
                    placeholder = painterResource(R.drawable.group_34057)
                )

                // 2. Content (Scrollable)
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                ) {
                    // Spacer đẩy nội dung xuống để lộ Cover
                    Spacer(modifier = Modifier.height(220.dp))

                    // --- CARD PROFILE (BOX CHỨA AVATAR + SURFACE) ---
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.TopCenter // Căn giữa các phần tử con
                    ) {
                        // A. CARD NỀN (Surface) - Đẩy xuống 50dp để chừa chỗ cho nửa trên Avatar
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 50.dp) // <--- QUAN TRỌNG
                                .heightIn(min = 500.dp), // Đảm bảo chiều cao tối thiểu
                            shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                            color = AppTheme.colorScheme.background,
                            shadowElevation = 0.dp
                        ) {
                            Column(
                                modifier = Modifier.padding(top = 60.dp, start = 24.dp, end = 24.dp, bottom = 24.dp), // Padding top lớn để tránh Avatar
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                // Tên & Info
                                Text(
                                    text = profile.name ?: "Unknown",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = profile.profileType?.uppercase() ?: "ARTIST",
                                    color = AppTheme.colorScheme.primary,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium
                                )

                                Spacer(Modifier.height(16.dp))

                                // Stats & Action
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(
                                            text = "${profile.followerCount ?: 0}",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 20.sp
                                        )
                                        Text("Followers", color = Color.Gray, fontSize = 12.sp)
                                    }

                                    Spacer(Modifier.width(32.dp))

                                    Button(
                                        onClick = { viewModel.toggleFollow() },
                                        enabled = !uiState.isFollowProcessing,
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = if (uiState.isFollowing)
                                                AppTheme.colorScheme.surfaceVariant
                                            else AppTheme.colorScheme.primary,
                                            contentColor = if (uiState.isFollowing)
                                                AppTheme.colorScheme.onSurfaceVariant
                                            else Color.White
                                        ),
                                        shape = RoundedCornerShape(12.dp),
                                        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 10.dp)
                                    ) {
                                        Icon(
                                            imageVector = if (uiState.isFollowing) Icons.Default.PersonRemove else Icons.Default.PersonAdd,
                                            contentDescription = null,
                                            modifier = Modifier.size(18.dp)
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        Text(if (uiState.isFollowing) "Unfollow" else "Follow")
                                    }
                                }

                                Spacer(Modifier.height(24.dp))

                                // About Section
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    Text("About", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        text = profile.bio ?: "No biography available.",
                                        color = Color.Gray,
                                        lineHeight = 24.sp
                                    )

                                    Spacer(Modifier.height(24.dp))

                                    // Genres / Interests
                                    if (!profile.genres.isNullOrEmpty()) {
                                        Text("Genres", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                                        Spacer(Modifier.height(8.dp))
                                        FlowRow(
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            profile.genres.forEach { genre ->
                                                SuggestionChip(
                                                    onClick = {},
                                                    label = { Text(genre) }
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // B. AVATAR (Nằm ngoài Surface, cùng cấp trong Box -> Nổi lên trên)
                        AsyncImage(
                            model = profile.imageUrl ?: R.drawable.default_pfp,
                            contentDescription = "Avatar",
                            modifier = Modifier
                                .size(100.dp)
                                .clip(CircleShape)
                                .border(4.dp, AppTheme.colorScheme.background, CircleShape) // Viền cùng màu nền để tách biệt
                                .background(Color.LightGray),
                            contentScale = ContentScale.Crop,
                            placeholder = painterResource(R.drawable.default_pfp),
                            error = painterResource(R.drawable.default_pfp)
                        )
                    }
                }
            } else if (uiState.error != null) {
                Text(
                    text = "Error: ${uiState.error}",
                    modifier = Modifier.align(Alignment.Center),
                    color = Color.Red
                )
            }
        }
    }
}