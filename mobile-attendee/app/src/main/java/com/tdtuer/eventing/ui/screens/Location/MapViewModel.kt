// eventing.zip/ui/screens/mapview/MapViewModel.kt (ĐÃ HOÀN THIỆN SEARCH & FILTER)
package com.tdtuer.eventing.ui.screens.mapview

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.location.FusedLocationProviderClient
import com.mapbox.geojson.Point
import com.tdtuer.eventing.R
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.events.FindNearbyEventsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
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
    private val fusedLocationClient: FusedLocationProviderClient,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(MapUiState())
    val uiState = _uiState.asStateFlow()

    // Cache danh sách gốc lấy từ API để lọc local mà không cần gọi lại server
    private var allRetrievedEvents: List<Event> = emptyList()

    private var lastFetchedLocation: Location? = null
    private var lastFetchedRadius: Double = 0.0

    init {
        loadCategories()
        getInitialUserLocation()
    }

    // --- 1. SETUP CATEGORIES ---
    private fun loadCategories() {
        // Danh sách category khớp với yêu cầu của bạn
        val categories = listOf(
            CategoryItem("All", R.drawable.group_34057),
            CategoryItem("Music", R.drawable.quaver), // Đảm bảo có icon tương ứng
            CategoryItem("Sports", R.drawable.sports),
            CategoryItem("Art", R.drawable.paint_palette),
            CategoryItem("Food", R.drawable.noodles),
            CategoryItem("Tech", R.drawable.vector), // Icon ví dụ
            CategoryItem("Other", R.drawable.ellipsis)
        )
        _uiState.update { it.copy(categories = categories, selectedCategory = "All") }
    }

    // --- 2. XỬ LÝ VỊ TRÍ ---
    private fun getInitialUserLocation() {
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (!hasFine && !hasCoarse) {
            _uiState.update { it.copy(isLocationLoading = false) }
            fetchEventsSmart(Point.fromLngLat(106.7009, 10.7769), 20.0, force = true)
            return
        }

        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                val userPoint = Point.fromLngLat(location.longitude, location.latitude)
                _uiState.update { it.copy(initialCameraPosition = userPoint, isLocationLoading = false) }
                fetchEventsSmart(userPoint, 20.0, force = true)
            } else {
                _uiState.update { it.copy(isLocationLoading = false) }
                fetchEventsSmart(_uiState.value.initialCameraPosition, 20.0, force = true)
            }
        }.addOnFailureListener {
            _uiState.update { it.copy(isLocationLoading = false) }
        }
    }

    // --- 3. GỌI API (SMART FETCH) ---
    fun fetchEventsSmart(center: Point, rawRadiusKm: Double, force: Boolean = false) {
        val optimizedRadius = rawRadiusKm.coerceAtLeast(5.0).coerceAtMost(100.0)

        if (!force && lastFetchedLocation != null) {
            val newLocation = Location("new").apply {
                latitude = center.latitude()
                longitude = center.longitude()
            }
            val distanceMeters = newLocation.distanceTo(lastFetchedLocation!!)
            val radiusDiff = Math.abs(optimizedRadius - lastFetchedRadius)

            // Nếu di chuyển ít (<2km) và bán kính không đổi nhiều -> Không gọi API
            if (distanceMeters < 2000 && radiusDiff < (lastFetchedRadius * 0.2)) {
                return
            }
        }

        lastFetchedLocation = Location("last").apply {
            latitude = center.latitude()
            longitude = center.longitude()
        }
        lastFetchedRadius = optimizedRadius

        fetchEventsInternal(center, optimizedRadius)
    }

    private fun fetchEventsInternal(center: Point, radiusKm: Double) {
        viewModelScope.launch {
            _uiState.update { it.copy(nearbyEventsResult = Result.Loading) }

            findNearbyEventsUseCase(
                lat = center.latitude().toString(),
                lon = center.longitude().toString(),
                radiusInKm = radiusKm,
                limit = 100, // Lấy nhiều hơn để lọc client
                page = 1
            ).collect { result ->
                if (result is Result.Success) {
                    // Lưu vào cache
                    allRetrievedEvents = result.data
                    // Áp dụng bộ lọc ngay lập tức
                    applyFilters()
                } else {
                    _uiState.update { it.copy(nearbyEventsResult = result) }
                }
            }
        }
    }

    // --- 4. LOGIC LỌC & TÌM KIẾM (CORE) ---
    private fun applyFilters() {
        val query = _uiState.value.searchQuery.trim()
        val category = _uiState.value.selectedCategory

        val filteredList = allRetrievedEvents.filter { event ->
            // 1. Lọc theo Category
            val matchesCategory = if (category == "All") {
                true
            } else {
                // Giả sử event.category là List<String> ["Music", "Live"]
                // Kiểm tra xem có chứa category đang chọn không (không phân biệt hoa thường)
                event.category.any { it.equals(category, ignoreCase = true) }
            }

            // 2. Lọc theo Search Query (Tên sự kiện hoặc Địa điểm)
            val matchesSearch = if (query.isEmpty()) {
                true
            } else {
                event.name.contains(query, ignoreCase = true) ||
                        event.location.contains(query, ignoreCase = true) ||
                        event.venueName.contains(query, ignoreCase = true)
            }

            matchesCategory && matchesSearch
        }

        // Cập nhật UI State với danh sách ĐÃ LỌC
        _uiState.update {
            it.copy(nearbyEventsResult = Result.Success(filteredList))
        }
    }

    // Sự kiện từ UI: Nhập text tìm kiếm
    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        applyFilters() // Lọc lại ngay khi nhập
    }

    // Sự kiện từ UI: Chọn Category Chip
    fun onCategorySelected(categoryName: String) {
        _uiState.update { it.copy(selectedCategory = categoryName) }
        applyFilters() // Lọc lại ngay khi chọn
    }
}