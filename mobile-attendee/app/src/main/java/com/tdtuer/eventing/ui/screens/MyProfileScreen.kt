package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme

class MyProfile : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                MyProfileScreen()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun MyProfileScreen() {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile") },
                navigationIcon = {
                    IconButton(onClick = { /* Handle back press */ }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                    titleContentColor = Color.Black
                )
            )
        },
        containerColor = Color.White
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))

            // Phần ảnh đại diện và tên
            ProfileHeader() // <-- ĐÃ SỬA

            Spacer(modifier = Modifier.height(24.dp))

            // Phần thống kê Following/Followers
            StatsSection(following = 350, followers = 346)

            Spacer(modifier = Modifier.height(24.dp))

            // Nút Edit Profile
            OutlinedButton(
                onClick = { /* Handle edit profile click */ },
                modifier = Modifier.fillMaxWidth(0.6f)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Edit, contentDescription = "Edit Icon", tint = Color(0xFF5669FF))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Edit Profile", color = Color(0xFF5669FF))
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Phần About Me
            AboutMeSection()

            Spacer(modifier = Modifier.height(24.dp))

            // Phần Interest
            InterestSection()
        }
    }
}

@Composable
fun ProfileHeader() {
    // CẢI TIẾN: Bọc trong Column để là một component thống nhất
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Image(
            painter = painterResource(id = R.drawable.default_pfp),
            contentDescription = "Profile Picture",
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "Ashfak Sayem",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun StatsSection(following: Int, followers: Int) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = following.toString(), fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(text = "Following", color = Color.Gray)
        }
        Divider(
            modifier = Modifier
                .height(30.dp)
                .width(1.dp)
                .padding(horizontal = 24.dp)
        )
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = followers.toString(), fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(text = "Followers", color = Color.Gray)
        }
    }
}

@Composable
fun AboutMeSection() {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start
    ) {
        Text(text = "About Me", fontSize = 18.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Enjoy your favorite dishe and a lovely your friends and family and have a great time. Food from local food trucks will be available for purchase. Read More",
            color = Color.Gray,
            lineHeight = 22.sp
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun InterestSection() {
    val interests = listOf("Games Online", "Concert", "Music", "Art", "Movie", "Others")
    val colors = listOf(
        Color(0xFF6A5AE0), Color(0xFFF0635A), Color(0xFFF59762),
        Color(0xFF8436E0), Color(0xFF29D697), Color(0xFF46CDFB)
    )

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(text = "Interest", fontSize = 18.sp, fontWeight = FontWeight.Bold)
            TextButton(onClick = { /* Handle change interest */ }) {
                Text(text = "CHANGE", color = Color(0xFF5669FF), textDecoration = TextDecoration.Underline)
            }
        }
        Spacer(modifier = Modifier.height(8.dp))

        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            interests.forEachIndexed { index, interest ->
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = colors[index % colors.size].copy(alpha = 0.1f)
                ) {
                    Text(
                        text = interest,
                        color = colors[index % colors.size],
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}


@Preview(showBackground = true, showSystemUi = true)
@Composable
fun MyProfileScreenPreview() {
    EventingTheme {
        MyProfileScreen()
    }
}