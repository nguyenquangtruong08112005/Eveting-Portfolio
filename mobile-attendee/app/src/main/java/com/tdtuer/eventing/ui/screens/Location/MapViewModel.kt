package com.tdtuer.eventing.ui.screens.mapview

import android.location.Location
import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mapbox.geojson.Point
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.events.FindNearbyEventsUseCase
import com.tdtuer.eventing.domain.usecase.location.GetCurrentLocationUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CategoryItem(val name: String, @DrawableRes val iconRes: Int)

data class MapUiState(
    val searchQuery: String = "",
    val categories: List<CategoryItem> = emptyList(),
    val selectedCategory: String = "All",
    val initialCameraPosition: Point = Point.fromLngLat(106.7009, 10.7769),
    val isLocationLoading: Boolean = true,
    val nearbyEventsResult: Result<List<Event>> = Result.Success(emptyList())
)

@HiltViewModel
class MapViewModel @Inject constructor(
    private val findNearbyEventsUseCase: FindNearbyEventsUseCase,
    private val getCurrentLocationUseCase: GetCurrentLocationUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(MapUiState())
    val uiState = _uiState.asStateFlow()

    private var allRetrievedEvents: List<Event> = emptyList()
    private var lastFetchedLocation: Point? = null
    private var lastFetchedRadius: Double = 0.0

    init {
        loadCategories()
        getInitialUserLocation()
    }

    private fun loadCategories() {
        val categories = listOf(
            CategoryItem("All", R.drawable.group_34057),
            CategoryItem("Music", R.drawable.quaver),
            CategoryItem("Sports", R.drawable.sports),
            CategoryItem("Art", R.drawable.paint_palette),
            CategoryItem("Food", R.drawable.noodles),
            CategoryItem("Tech", R.drawable.vector),
            CategoryItem("Other", R.drawable.ellipsis)
        )
        _uiState.update { it.copy(categories = categories, selectedCategory = "All") }
    }

    // [REF] Sử dụng UseCase
    private fun getInitialUserLocation() {
        viewModelScope.launch {
            val result = getCurrentLocationUseCase(includeAddress = false)

            if (result is Result.Success) {
                val location = result.data
                val userPoint = Point.fromLngLat(location.longitude, location.latitude)
                _uiState.update { it.copy(initialCameraPosition = userPoint, isLocationLoading = false) }
                fetchEventsSmart(userPoint, 20.0, force = true)
            } else {
                // Fallback nếu không lấy được vị trí
                _uiState.update { it.copy(isLocationLoading = false) }
                fetchEventsSmart(_uiState.value.initialCameraPosition, 20.0, force = true)
            }
        }
    }

    // [REF] Logic smart fetch giữ nguyên nhưng làm sạch code
    fun fetchEventsSmart(center: Point, rawRadiusKm: Double, force: Boolean = false) {
        val optimizedRadius = rawRadiusKm.coerceAtLeast(5.0).coerceAtMost(100.0)

        if (!force && lastFetchedLocation != null) {
            // Tính khoảng cách đơn giản (gần đúng) để check cache
            val dist = distanceBetween(lastFetchedLocation!!, center)
            val radiusDiff = Math.abs(optimizedRadius - lastFetchedRadius)

            if (dist < 2000 && radiusDiff < (lastFetchedRadius * 0.2)) {
                return
            }
        }

        lastFetchedLocation = center
        lastFetchedRadius = optimizedRadius

        fetchEventsInternal(center, optimizedRadius)
    }

    // Helper tính khoảng cách (mét) giữa 2 point mapbox
    private fun distanceBetween(p1: Point, p2: Point): Float {
        val results = FloatArray(1)
        Location.distanceBetween(p1.latitude(), p1.longitude(), p2.latitude(), p2.longitude(), results)
        return results[0]
    }

    private fun fetchEventsInternal(center: Point, radiusKm: Double) {
        viewModelScope.launch {
            _uiState.update { it.copy(nearbyEventsResult = Result.Loading) }

            findNearbyEventsUseCase(
                lat = center.latitude().toString(),
                lon = center.longitude().toString(),
                radiusInKm = radiusKm,
                limit = 100,
                page = 1
            ).collect { result ->
                if (result is Result.Success) {
                    allRetrievedEvents = result.data
                    applyFilters()
                } else {
                    _uiState.update { it.copy(nearbyEventsResult = result) }
                }
            }
        }
    }

    private fun applyFilters() {
        val query = _uiState.value.searchQuery.trim()
        val category = _uiState.value.selectedCategory

        val filteredList = allRetrievedEvents.filter { event ->
            val matchesCategory = if (category == "All") true else event.category.any { it.equals(category, ignoreCase = true) }
            val matchesSearch = if (query.isEmpty()) true else (event.name.contains(query, ignoreCase = true) || event.venueName.contains(query, ignoreCase = true))
            matchesCategory && matchesSearch
        }

        _uiState.update { it.copy(nearbyEventsResult = Result.Success(filteredList)) }
    }

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        applyFilters()
    }

    fun onCategorySelected(categoryName: String) {
        _uiState.update { it.copy(selectedCategory = categoryName) }
        applyFilters()
    }
}