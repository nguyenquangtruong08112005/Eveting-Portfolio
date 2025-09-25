package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
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
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.screens.ui.theme.EventingTheme
import androidx.compose.foundation.clickable

// --- Data Model cho một kết quả tìm kiếm ---
data class SearchResultEvent(
    val title: String,
    val dateTime: String,
    val imageRes: Int
)

// --- Activity ---
class SearchActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                SearchScreen()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen() {
    val searchResults = remember {
        listOf(
            SearchResultEvent("A virtual evening of smooth jazz", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
            SearchResultEvent("Jo malone london’s mother’s day", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
            SearchResultEvent("Women's leadership conference", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
            SearchResultEvent("International kids safe parents night out", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
            SearchResultEvent("International gala music festival", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Search", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { /* Handle back navigation */ }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFFF7F7F7))
            )
        },
        containerColor = Color(0xFFF7F7F7) // Màu nền xám nhạt
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding)) {
            // Thanh tìm kiếm và bộ lọc
            SearchBar()

            // Danh sách kết quả
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(searchResults) { event ->
                    SearchResultCard(event = event)
                }
            }
        }
    }
}

@Composable
fun SearchBar() {
    var searchText by remember { mutableStateOf("") }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Ô nhập liệu
        OutlinedTextField(
            value = searchText,
            onValueChange = { searchText = it },
            modifier = Modifier.weight(1f),
            placeholder = { Text("Search...") },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = "Search Icon")
            },
            singleLine = true,
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Color.White,
                unfocusedContainerColor = Color.White,
                focusedBorderColor = Color.LightGray,
                unfocusedBorderColor = Color.Transparent,
            ),
            shape = RoundedCornerShape(50) // Bo tròn tối đa
        )

        // Nút Filters
        Button(
            onClick = { /* Handle filter click */ },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF5669FF)),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Icon(Icons.Default.FilterList, contentDescription = "Filters")
            Spacer(modifier = Modifier.width(8.dp))
            Text("Filters")
        }
    }
}

@Composable
fun SearchResultCard(event: SearchResultEvent) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { /* Handle click on event */ },
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
            Image(
                painter = painterResource(id = event.imageRes),
                contentDescription = event.title,
                modifier = Modifier
                    .size(70.dp)
                    .clip(RoundedCornerShape(12.dp)),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = event.dateTime,
                    color = Color(0xFF5669FF), // Màu xanh tím
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = event.title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black,
                    lineHeight = 22.sp
                )
            }
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun SearchScreenPreview() {
    EventingTheme {
        SearchScreen()
    }
}