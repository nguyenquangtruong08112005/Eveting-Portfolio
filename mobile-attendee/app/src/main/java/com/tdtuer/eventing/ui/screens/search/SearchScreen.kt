package com.tdtuer.eventing.ui.screens.search

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items // Keep this import
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
// R class import is still needed for resources used directly in UI if any
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme
// SearchResultEvent data class is now in SearchViewModel.kt

// --- Activity ---
class SearchActivity : ComponentActivity() {
    private val viewModel: SearchViewModel by viewModels() // Use ViewModel delegate

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                SearchScreen(viewModel = viewModel) // Pass ViewModel
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(viewModel: SearchViewModel) { // Accept ViewModel
    val searchResults by viewModel.searchResults // Observe from ViewModel

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Search", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackNavigationClick() }) { // Delegate to ViewModel
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFFF7F7F7))
            )
        },
        containerColor = Color(0xFFF7F7F7) // Màu nền xám nhạt
    ) { innerPadding ->
        Column(modifier = Modifier.padding(innerPadding)) {
            SearchBar( // Pass searchText and onSearchTextChanged from/to ViewModel
                searchText = viewModel.searchText,
                onSearchTextChanged = { viewModel.onSearchTextChanged(it) },
                onFilterClick = { viewModel.onFilterClick() } // Delegate to ViewModel
            )

            LazyColumn(
                contentPadding = PaddingValues(horizontal = 24.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(searchResults, key = { it.title + it.dateTime }) { event -> // Add a unique key
                    SearchResultCard(
                        event = event,
                        onClick = { viewModel.onSearchResultClick(event) } // Delegate to ViewModel
                    )
                }
            }
        }
    }
}

@Composable
fun SearchBar(
    searchText: String, // From ViewModel
    onSearchTextChanged: (String) -> Unit, // To ViewModel
    onFilterClick: () -> Unit // To ViewModel
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        OutlinedTextField(
            value = searchText,
            onValueChange = onSearchTextChanged,
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

        Button(
            onClick = onFilterClick,
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
fun SearchResultCard(event: SearchResultEvent, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick), // Use passed onClick lambda
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
                painter = painterResource(id = event.imageRes), // From SearchResultEvent data
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
        // For preview, create a new instance of the ViewModel
        SearchScreen(viewModel = SearchViewModel())
    }
}
