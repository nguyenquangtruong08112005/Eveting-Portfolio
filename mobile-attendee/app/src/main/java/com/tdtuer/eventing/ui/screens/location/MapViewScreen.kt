// eventing.zip/ui/screens/location/MapViewScreen.kt
package com.tdtuer.eventing.ui.screens.location

import android.util.Log
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.Layers // Icon cho nút chọn style
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
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.mapbox.geojson.Point
import com.mapbox.maps.CameraOptions
import com.mapbox.maps.Style
import com.mapbox.maps.ViewAnnotationAnchor
import com.mapbox.maps.ViewAnnotationAnchorConfig
import com.mapbox.maps.extension.compose.MapboxMap
import com.mapbox.maps.extension.compose.animation.viewport.rememberMapViewportState
import com.mapbox.maps.extension.compose.annotation.ViewAnnotation
import com.mapbox.maps.extension.compose.style.MapStyle
import com.mapbox.maps.viewannotation.geometry
import com.mapbox.maps.viewannotation.viewAnnotationOptions
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.helpers.formatDisplayPrice
import com.tdtuer.eventing.ui.navigation.Screen
import com.tdtuer.eventing.ui.screens.mapview.CategoryItem
import com.tdtuer.eventing.ui.screens.mapview.MapViewModel
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme
import kotlinx.coroutines.delay
import kotlin.math.pow

@Composable
fun MapViewScreen(
    viewModel: MapViewModel = hiltViewModel(),
    navController: NavController
) {
    val uiState by viewModel.uiState.collectAsState()

    // State lưu trữ kiểu bản đồ hiện tại
    var currentMapStyle by remember { mutableStateOf(Style.MAPBOX_STREETS) }

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
            CameraOptions.Builder()
                .center(uiState.initialCameraPosition)
                .zoom(12.0)
                .build()
        )
    }

    LaunchedEffect(mapViewportState.cameraState) {
        delay(1000)
        val cameraState = mapViewportState.cameraState
        if (cameraState != null) {
            val center = cameraState.center
            val zoom = cameraState.zoom
            val estimatedRadiusKm = (40000 / 2.0.pow(zoom)) / 2
            viewModel.fetchEventsSmart(center, estimatedRadiusKm)
        }
    }

    val navigateToDetail = { eventId: String ->
        navController.navigate(Screen.EventDetails.createRoute(eventId))
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // 1. Mapbox Map với Dynamic Style
        MapboxMap(
            Modifier.fillMaxSize(),
            mapViewportState = mapViewportState,
            style = { MapStyle(style = currentMapStyle) } // <-- Cập nhật style tại đây
        ) {
            if (uiState.nearbyEventsResult is Result.Success) {
                val events = (uiState.nearbyEventsResult as Result.Success).data

                val groupedEvents = remember(events) {
                    // Gom nhóm theo tọa độ để tránh chồng lấn
                    // Lưu ý: Sử dụng thuộc tính 'coordinates' như bạn đã chỉnh sửa trong Event model
                    events.groupBy { it.coordinates } // Nếu bạn đã đổi tên field thành coordinates thì sửa ở đây
                }

                groupedEvents.forEach { (coordinateString, eventList) ->
                    val point = parseLocationToPoint(coordinateString)
                    if (point != null) {
                        ViewAnnotation(
                            options = viewAnnotationOptions {
                                geometry(point)
                                allowOverlap(true)
                                variableAnchors(
                                    listOf(
                                        ViewAnnotationAnchorConfig.Builder()
                                            .anchor(ViewAnnotationAnchor.BOTTOM)
                                            .build()
                                    )
                                )
                            }
                        ) {
                            if (eventList.size == 1) {
                                MapEventCard(
                                    event = eventList.first(),
                                    onEventClick = navigateToDetail
                                )
                            } else {
                                MultiEventCarousel(
                                    events = eventList,
                                    onEventClick = navigateToDetail
                                )
                            }
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

        // 2. Các thành phần giao diện phía trên
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

        // 3. Các nút điều khiển (Layer & Location)
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
                .padding(bottom = 80.dp), // Tránh Bottom Navigation Bar
            verticalArrangement = Arrangement.spacedBy(16.dp), // Khoảng cách giữa các nút
            horizontalAlignment = Alignment.End
        ) {
            // Nút chọn kiểu bản đồ
            MapStyleSelector(
                currentStyle = currentMapStyle,
                onStyleSelected = { newStyle -> currentMapStyle = newStyle }
            )

            // Nút vị trí của tôi
            FloatingActionButton(
                onClick = {
                    mapViewportState.flyTo(
                        CameraOptions.Builder()
                            .center(uiState.initialCameraPosition)
                            .zoom(12.0)
                            .build()
                    )
                },
                containerColor = Color.White,
                shape = CircleShape
            ) {
                Icon(
                    Icons.Default.MyLocation,
                    contentDescription = "My Location",
                    tint = AppTheme.colorScheme.primary
                )
            }
        }
    }
}

// --- Composable chọn kiểu bản đồ ---
@Composable
fun MapStyleSelector(
    currentStyle: String,
    onStyleSelected: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Box {
        FloatingActionButton(
            onClick = { expanded = true },
            containerColor = Color.White,
            shape = CircleShape
        ) {
            Icon(
                Icons.Default.Layers,
                contentDescription = "Map Style",
                tint = AppTheme.colorScheme.primary
            )
        }

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.background(Color.White)
        ) {
            val styles = listOf(
                "Streets" to Style.MAPBOX_STREETS,
                "Traffic Day" to Style.TRAFFIC_DAY,
                "Traffic Night" to Style.TRAFFIC_NIGHT,
                "Satellite" to Style.SATELLITE_STREETS,
                "Outdoors" to Style.OUTDOORS,
                "Dark" to Style.DARK,
                "Light" to Style.LIGHT
            )

            styles.forEach { (name, styleUrl) ->
                DropdownMenuItem(
                    text = {
                        Text(
                            name,
                            fontWeight = if (currentStyle == styleUrl) FontWeight.Bold else FontWeight.Normal
                        )
                    },
                    onClick = {
                        onStyleSelected(styleUrl)
                        expanded = false
                    },
                    trailingIcon = {
                        if (currentStyle == styleUrl) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                tint = Color(0xFF5669FF)
                            )
                        }
                    }
                )
            }
        }
    }
}


@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MultiEventCarousel(
    events: List<Event>,
    onEventClick: (String) -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { events.size })

    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Surface(
            color = Color.Black.copy(alpha = 0.7f),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.padding(bottom = 4.dp)
        ) {
            Text(
                text = "${pagerState.currentPage + 1}/${events.size}",
                color = Color.White,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
            )
        }

        HorizontalPager(
            state = pagerState,
            modifier = Modifier.width(160.dp)
        ) { page ->
            MapEventCard(
                event = events[page], isCarouselItem = true,
                onEventClick = onEventClick
            )
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

@Composable
fun MapEventCard(event: Event, isCarouselItem: Boolean = false, onEventClick: (String) -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.shadow(8.dp, RoundedCornerShape(12.dp))
    ) {
        Card(
            modifier = Modifier
                .width(160.dp)
                .height(110.dp)
                .clickable { onEventClick(event.id) },
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

        if (!isCarouselItem) {
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
}

private fun parseLocationToPoint(locationString: String): Point? {
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
            leadingIcon = {
                Icon(
                    Icons.Default.Search,
                    contentDescription = "Search",
                    tint = Color.Gray
                )
            },
//            trailingIcon = {
//                IconButton(onClick = { }) {
//                    Icon(Icons.Default.FilterList, contentDescription = "Filter", tint = AppTheme.colorScheme.primary)
//                }
//            },
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
private fun CategoryFilters(
    categories: List<CategoryItem>,
    selectedCategory: String,
    onCategorySelected: (String) -> Unit
) {
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
                    selectedContainerColor = AppTheme.colorScheme.onPrimary,
                    selectedLabelColor = AppTheme.colorScheme.secondary,
                    selectedLeadingIconColor = AppTheme.colorScheme.primary,
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

@Preview(showSystemUi = true)
@Composable
fun MapViewScreenPreview() {
    EventingTheme {
        // Preview
    }
}