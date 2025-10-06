package com.tdtuer.eventing.ui.screens.mapview

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.MyLocation
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your map and icon images to drawables
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapViewScreen(viewModel: MapViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val scaffoldState = rememberBottomSheetScaffoldState()

    BottomSheetScaffold(
        scaffoldState = scaffoldState,
        sheetPeekHeight = 128.dp,
        sheetContent = {
            Column {
                // Drag Handle
                Box(
                    modifier = Modifier
                        .padding(vertical = 8.dp)
                        .width(40.dp)
                        .height(4.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.outlineVariant)
                        .align(Alignment.CenterHorizontally)
                )
                // Horizontally scrolling event cards
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(uiState.bottomSheetEvents) { event ->
                        EventCard(event = event)
                    }
                }
            }
        }
    ) { contentPadding ->
        // Main content: Map and overlays
        Box(
            modifier = Modifier
                .padding(contentPadding)
                .fillMaxSize()
        ) {
            // NOTE: Placeholder for the real Google Map
            Image(
                painter = painterResource(id = R.drawable.group_34057),
                contentDescription = "Map Background",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )

            // UI Overlays on top of the map
            Column {
                MapSearchBar(
                    query = uiState.searchQuery,
                    onQueryChange = viewModel::onSearchQueryChange
                )
                CategoryFilters(
                    categories = uiState.categories,
                    selectedCategory = uiState.selectedCategory,
                    onCategorySelected = viewModel::onCategorySelected
                )
            }

            // Map Markers (simulated positions)
            uiState.mapEvents.forEach { event ->
                MapMarker(
                    event = event,
                    modifier = Modifier.offset(x = event.position.first, y = event.position.second)
                )
            }

            // Floating Action Button for current location
            FloatingActionButton(
                onClick = { /* Handle recenter */ },
                shape = CircleShape,
                containerColor = MaterialTheme.colorScheme.surface,
                modifier = Modifier
                    .align(Alignment.CenterEnd)
                    .padding(16.dp)
            ) {
                Icon(Icons.Default.MyLocation, contentDescription = "My Location")
            }
        }
    }
}

// --- Custom Composables for this screen ---

@Composable
private fun MapSearchBar(query: String, onQueryChange: (String) -> Unit) {
    /* ... (Implementation for the search bar at the top) ... */
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = MaterialTheme.shapes.extraLarge,
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        TextField(
            value = query,
            onValueChange = onQueryChange,
            placeholder = { Text("Find for food or restaurant...") },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back") },
            trailingIcon = {
                Row {
                    Icon(Icons.Default.Search, contentDescription = "Search", modifier = Modifier.padding(horizontal = 8.dp))
                    VerticalDivider(modifier = Modifier.height(32.dp).align(Alignment.CenterVertically))
                    Icon(Icons.Default.FilterList, contentDescription = "Filter", modifier = Modifier.padding(horizontal = 8.dp))
                }
            },
            colors = TextFieldDefaults.colors(
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent
            )
        )
    }
}

@Composable
private fun CategoryFilters(categories: List<CategoryItem>, selectedCategory: String, onCategorySelected: (String) -> Unit) {
    /* ... (Implementation for the horizontal list of filter chips) ... */
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(categories) { category ->
            FilterChip(
                selected = category.name == selectedCategory,
                onClick = { onCategorySelected(category.name) },
                label = { Text(category.name) },
                leadingIcon = { Icon(painterResource(id = category.iconRes), contentDescription = category.name, modifier = Modifier.size(18.dp)) }
            )
        }
    }
}

@Composable
private fun MapMarker(event: MapEvent, modifier: Modifier = Modifier) {
    /* ... (Implementation for the custom map markers showing ticket price) ... */
    Card(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(event.price, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(event.title, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun EventCard(event: BottomSheetEvent, modifier: Modifier = Modifier) {
    /* ... (Implementation for the cards inside the bottom sheet) ... */
    Card(
        modifier = modifier.width(250.dp),
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column {
            Image(
                painter = painterResource(id = event.imageRes),
                contentDescription = event.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(100.dp),
                contentScale = ContentScale.Crop
            )
            Column(modifier = Modifier.padding(12.dp)) {
                Text(event.title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(painterResource(id = R.drawable.default_pfp), contentDescription = "Members", modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(event.attendees, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.weight(1f))
                    Button(onClick = { /*TODO*/ }, contentPadding = PaddingValues(horizontal = 16.dp)) {
                        Text("JOIN NOW")
                    }
                }
            }
        }
    }
}

@Preview(showSystemUi = true)
@Composable
fun MapViewScreenPreview() {
    EventingTheme {
        MapViewScreen(viewModel = viewModel())
    }
}