package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material3.*
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.R // Quan trọng: Thay R.drawable.profile_placeholder bằng ảnh của bạn
import com.tdtuer.eventing.ui.screens.ui.theme.EventingTheme

class OrganizerProfileActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                OrganizerProfileScreen()
            }
        }
    }
}

data class EventItem(
    val id: Int,
    val date: String,
    val time: String,
    val title: String,
    val imageRes: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrganizerProfileScreen() {
    var selectedTabIndex by remember { mutableStateOf(0) } // 0 cho About, 1 cho Event

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Organizer Profile- ${if (selectedTabIndex == 0) "About" else "Event"}") },
                navigationIcon = {
                    IconButton(onClick = { /* Handle back press */ }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Handle more options */ }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More Options")
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
                .verticalScroll(rememberScrollState()) // Cho phép cuộn nếu nội dung dài
        ) {
            // Phần Header (Ảnh đại diện, tên, stats, nút Follow/Messages)
            OrganizerProfileHeader()

            // Tab Bar
            OrganizerTabBar(
                selectedTabIndex = selectedTabIndex,
                onTabSelected = { index -> selectedTabIndex = index }
            )

            // Nội dung của Tab
            when (selectedTabIndex) {
                0 -> AboutContent()
                1 -> EventContent()
            }
        }
    }
}

@Composable
fun OrganizerProfileHeader() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Image(
            painter = painterResource(id = R.drawable.default_pfp), // Thay bằng ảnh của bạn
            contentDescription = "Profile Picture",
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape),
            contentScale = ContentScale.Crop
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "David Silbia",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(16.dp))

        // Stats Following/Followers
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = "350", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text(text = "Following", color = Color.Gray)
            }
            Divider(
                modifier = Modifier
                    .height(30.dp)
                    .width(1.dp)
                    .padding(horizontal = 24.dp),
                color = Color.LightGray
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(text = "346", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Text(text = "Followers", color = Color.Gray)
            }
        }
        Spacer(modifier = Modifier.height(24.dp))

        // Buttons Follow / Messages
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            Button(
                onClick = { /* Handle Follow click */ },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5669FF)),
                modifier = Modifier.weight(1f).padding(end = 8.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = "Follow Icon", tint = Color.White)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Follow", color = Color.White)
            }
            OutlinedButton(
                onClick = { /* Handle Messages click */ },
                border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF5669FF))),
                modifier = Modifier.weight(1f).padding(start = 8.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(painterResource(id = R.drawable.default_pfp), modifier = Modifier.height(20.dp), contentDescription = "Message Icon", tint = Color(0xFF5669FF)) // Thay bằng icon message của bạn
                Spacer(modifier = Modifier.width(8.dp))
                Text("Messages", color = Color(0xFF5669FF))
            }
        }
    }
}

@Composable
fun OrganizerTabBar(selectedTabIndex: Int, onTabSelected: (Int) -> Unit) {
    val tabs = listOf("ABOUT", "EVENT")
    TabRow(
        selectedTabIndex = selectedTabIndex,
        containerColor = Color.White,
        contentColor = Color.Black,
        indicator = { tabPositions ->
            TabRowDefaults.Indicator(
                Modifier.tabIndicatorOffset(tabPositions[selectedTabIndex]),
                color = Color(0xFF5669FF), // Màu xanh tím cho indicator
                height = 2.dp
            )
        }
    ) {
        tabs.forEachIndexed { index, title ->
            Tab(
                selected = selectedTabIndex == index,
                onClick = { onTabSelected(index) },
                text = {
                    Text(
                        text = title,
                        color = if (selectedTabIndex == index) Color(0xFF5669FF) else Color.Gray,
                        fontWeight = FontWeight.SemiBold
                    )
                },
                selectedContentColor = Color(0xFF5669FF), // Màu chữ khi được chọn
                unselectedContentColor = Color.Gray // Màu chữ khi không được chọn
            )
        }
    }
}

@Composable
fun AboutContent() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.Start
    ) {
        Text(
            text = "Enjoy your favorite dishe and a lovely your friends and family and have a great time. Food from local food trucks will be available for purchase. Read More",
            color = Color.Gray,
            lineHeight = 22.sp,
            fontSize = 14.sp
        )
    }
}

@Composable
fun EventContent() {
    val events = remember {
        listOf(
            EventItem(
                id = 1,
                date = "1ST MAY",
                time = "SAT -2:00 PM",
                title = "A virtual evening of smooth jazz",
                imageRes = R.drawable.default_pfp // Thay bằng ảnh sự kiện của bạn
            ),
            EventItem(
                id = 2,
                date = "1ST MAY",
                time = "SAT -2:00 PM",
                title = "Jo malone london's mother's day",
                imageRes = R.drawable.default_pfp // Thay bằng ảnh sự kiện của bạn
            ),
            EventItem(
                id = 3,
                date = "1ST MAY",
                time = "SAT -2:00 PM",
                title = "Women's leadership conference",
                imageRes = R.drawable.default_pfp // Thay bằng ảnh sự kiện của bạn
            )
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        items(events) { event ->
            EventCard(event = event)
        }
    }
}

@Composable
fun EventCard(event: EventItem) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF7F7F7)) // Màu nền nhạt
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = painterResource(id = event.imageRes),
                contentDescription = event.title,
                modifier = Modifier
                    .size(60.dp)
                    .clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(
                    text = "${event.date} ${event.time}",
                    color = Color(0xFF5669FF), // Màu xanh tím cho ngày giờ
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = event.title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )
            }
        }
    }
}

// Icon tin nhắn custom (nếu bạn không có icon vector asset)
// Để sử dụng, bạn cần tạo file XML vector asset trong res/drawable
// Ví dụ: ic_message.xml
/*
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M20,2H4C2.9,2 2,2.9 2,4v18l4,-4h14c1.1,0 2,-0.9 2,-2V4C22,2.9 21.1,2 20,2z" />
</vector>
*/
// Hoặc thay bằng một icon có sẵn trong Material Icons nếu phù hợp.
// Hiện tại tôi sẽ sử dụng một icon mặc định giả định, bạn cần thay thế nó.
@Composable
fun Icon_Message(tint: Color = Color.Unspecified) {
    Icon(
        painter = painterResource(id = R.drawable.default_pfp), // Cần thay bằng icon message thực tế của bạn
        contentDescription = "Message Icon",
        tint = tint
    )
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun OrganizerProfileScreenPreview() {
    EventingTheme {
        OrganizerProfileScreen()
    }
}