// eventing.zip/ui/screens/location/MapViewScreen.kt
package com.tdtuer.eventing.ui.screens.location

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import coil.compose.AsyncImage
import com.mapbox.geojson.Point
import com.mapbox.maps.ViewAnnotationAnchor
import com.mapbox.maps.ViewAnnotationAnchorConfig
// *** (FIX 1) IMPORT THÊM CÁI NÀY ***
import com.mapbox.maps.extension.compose.MapboxMap
import com.mapbox.maps.extension.compose.animation.viewport.rememberMapViewportState
import com.mapbox.maps.extension.compose.annotation.ViewAnnotation
import com.mapbox.maps.viewannotation.geometry
import com.mapbox.maps.viewannotation.viewAnnotationOptions
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.helpers.formatDisplayPrice
import com.tdtuer.eventing.ui.screens.mapview.CategoryItem
import com.tdtuer.eventing.ui.screens.mapview.MapViewModel
import com.tdtuer.eventing.ui.theme.EventingTheme
import kotlinx.coroutines.delay

@Composable
fun MapViewScreen(viewModel: MapViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsState()

    val mapViewportState = rememberMapViewportState {
        setCameraOptions {
            center(uiState.initialCameraPosition)
            zoom(11.0)
            pitch(0.0)
            bearing(0.0)
        }
    }

    LaunchedEffect(uiState.initialCameraPosition) {
        mapViewportState.flyTo(
            com.mapbox.maps.CameraOptions.Builder()
                .center(uiState.initialCameraPosition)
                .zoom(12.0)
                .build()
        )
    }

    // Logic gọi API thông minh (Debounce)
    LaunchedEffect(mapViewportState.cameraState) {
        delay(1000)
        val cameraState = mapViewportState.cameraState
        if (cameraState != null) {
            val center = cameraState.center
            val zoom = cameraState.zoom
            val estimatedRadiusKm = (40000 / Math.pow(2.0, zoom)) / 2
            viewModel.fetchEventsSmart(center, estimatedRadiusKm)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        MapboxMap(
            Modifier.fillMaxSize(),
            mapViewportState = mapViewportState,
        ) {
            // Render Card sự kiện lên Map
            if (uiState.nearbyEventsResult is Result.Success) {
                val events = (uiState.nearbyEventsResult as Result.Success).data
                val coordinateCounts = mutableMapOf<String, Int>()

                events.forEach { event ->
                    val point = parseLocationToPoint(event.coordinates)
                    if (point != null) {
                        ViewAnnotation(
                            options = viewAnnotationOptions {
                                geometry(point)
                                allowOverlap(true)
                                // *** (FIX 2) SỬ DỤNG ĐÚNG CẤU TRÚC CONFIG ***
                                variableAnchors(
                                    listOf(
                                        ViewAnnotationAnchorConfig.Builder()
                                            .anchor(ViewAnnotationAnchor.BOTTOM)
                                            .build()
                                    )
                                )
                            }
                        ) {
                            MapEventCard(event = event)
                        }
                    }
                }
            }
        }

        if (uiState.nearbyEventsResult is Result.Loading) {
            CircularProgressIndicator(
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 100.dp)
                    .size(30.dp),
                color = Color(0xFF5669FF)
            )
        }

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

        FloatingActionButton(
            onClick = {
                mapViewportState.flyTo(
                    com.mapbox.maps.CameraOptions.Builder()
                        .center(uiState.initialCameraPosition)
                        .zoom(12.0)
                        .build()
                )
            },
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
                .padding(bottom = 80.dp),
            containerColor = Color.White,
            shape = CircleShape
        ) {
            Icon(Icons.Default.MyLocation, contentDescription = "My Location", tint = Color(0xFF5669FF))
        }
    }
}

@Composable
fun MapEventCard(event: Event) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.shadow(8.dp, RoundedCornerShape(12.dp))
    ) {
        Card(
            modifier = Modifier
                .width(160.dp)
                .height(110.dp)
                .clickable { /* TODO: Navigate to detail */ },
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column {
                Box(modifier = Modifier.height(70.dp)) {
                    AsyncImage(
                        model = event.imageUrl,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                        placeholder = painterResource(id = R.drawable.ic_launcher_background)
                    )
                    Surface(
                        color = Color.White.copy(alpha = 0.9f),
                        shape = RoundedCornerShape(4.dp),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp)
                    ) {
                        Text(
                            text = formatDisplayPrice(event.minPrice).replace("Starts at ", ""),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF5669FF),
                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                        )
                    }
                }

                Text(
                    text = event.name,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    color = Color.Black
                )
            }
        }

        Icon(
            painter = painterResource(id = R.drawable.ic_launcher_foreground),
            contentDescription = null,
            modifier = Modifier
                .size(16.dp)
                .offset(y = (-4).dp),
            tint = Color.White
        )
    }
}

private fun parseLocationToPoint(locationString: String): Point? {
    Log.d("MapViewScreen", "parseLocationToPoint: $locationString")
    return try {
        val parts = locationString.split(",")
        val lat = parts[0].substringAfter("Lat:").trim().toDouble()
        val lon = parts[1].substringAfter("Lon:").trim().toDouble()
        Point.fromLngLat(lon, lat)
    } catch (e: Exception) {
        null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MapSearchBar(query: String, onQueryChange: (String) -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 16.dp, top = 48.dp),
        shape = MaterialTheme.shapes.extraLarge,
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        TextField(
            value = query,
            onValueChange = onQueryChange,
            placeholder = { Text("Tìm kiếm...", color = Color.Gray, fontSize = 14.sp) },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = Color.Gray) },
            trailingIcon = {
                IconButton(onClick = { }) {
                    Icon(Icons.Default.FilterList, contentDescription = "Filter", tint = Color(0xFF5669FF))
                }
            },
            colors = TextFieldDefaults.colors(
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                disabledIndicatorColor = Color.Transparent,
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent
            ),
            singleLine = true
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryFilters(categories: List<CategoryItem>, selectedCategory: String, onCategorySelected: (String) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(categories) { category ->
            val isSelected = category.name == selectedCategory
            FilterChip(
                selected = isSelected,
                onClick = { onCategorySelected(category.name) },
                label = { Text(category.name) },
                leadingIcon = {
                    Icon(
                        painterResource(id = category.iconRes),
                        contentDescription = category.name,
                        modifier = Modifier.size(18.dp)
                    )
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = Color(0xFF5669FF),
                    selectedLabelColor = Color.White,
                    selectedLeadingIconColor = Color.White
                ),
                border = FilterChipDefaults.filterChipBorder(
                    enabled = true,
                    selected = isSelected,
                    borderColor = Color.Transparent
                )
            )
        }
    }
}