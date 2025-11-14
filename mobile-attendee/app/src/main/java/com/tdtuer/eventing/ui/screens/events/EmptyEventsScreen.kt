package com.tdtuer.eventing.ui.screens.events

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.components.GradientButton
import com.tdtuer.eventing.ui.theme.EventingTheme

class EmptyEventsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                EmptyEventsScreen()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmptyEventsScreen() {
    var selectedTabIndex by remember { mutableStateOf(0) }
    val tabs = listOf("UPCOMING", "PAST EVENTS")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Events", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { /* Handle back navigation */ }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { /* Handle more options */ }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        bottomBar = {
            // Đặt nút vào bottomBar để nó luôn ở dưới cùng
            Box(modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)) {
                GradientButton(
                    text = "EXPLORE EVENTS",
                    onClick = { /* Handle explore */ },
                    icon = Icons.AutoMirrored.Default.ArrowForward
                )
            }
        },
        containerColor = Color.White
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Thanh Tab
            EventsTabRow(
                selectedTabIndex = selectedTabIndex,
                tabs = tabs,
                onTabSelected = { selectedTabIndex = it }
            )

            // Nội dung khi danh sách trống
            // weight(1f) và Arrangement.Center để đẩy nội dung vào giữa không gian còn lại
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                EmptyStateContent()
            }
        }
    }
}

@Composable
fun EventsTabRow(selectedTabIndex: Int, tabs: List<String>, onTabSelected: (Int) -> Unit) {
    Surface(
        shape = RoundedCornerShape(50),
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp),
        color = Color(0xFFF0F0F0) // Màu nền của cả thanh tab
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(4.dp)
        ) {
            tabs.forEachIndexed { index, title ->
                val isSelected = index == selectedTabIndex
                Button(
                    onClick = { onTabSelected(index) },
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    shape = RoundedCornerShape(50),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isSelected) Color.White else Color.Transparent,
                        contentColor = if (isSelected) Color(0xFF5669FF) else Color.Gray
                    ),
                    elevation = if (isSelected) ButtonDefaults.buttonElevation(defaultElevation = 2.dp) else null
                ) {
                    Text(title, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}


@Composable
fun EmptyStateContent() {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Image(
            painter = painterResource(id = R.drawable.banner_svgrepo_com),
            contentDescription = "Empty Calendar",
            modifier = Modifier.size(150.dp)
        )
        Text(
            text = "No Upcoming Event",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Lorem ipsum dolor sit amet, consectetur",
            color = Color.Gray,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = 24.dp)
        )
    }
}


@Preview(showBackground = true, showSystemUi = true)
@Composable
fun EmptyEventsScreenPreview() {
    EventingTheme {
        EmptyEventsScreen()
    }
}