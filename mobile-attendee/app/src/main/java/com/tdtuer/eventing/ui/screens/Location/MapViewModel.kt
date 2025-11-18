// eventing.zip/ui/screens/mapview/MapViewModel.kt
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
    // Mặc định trỏ về Việt Nam (ví dụ Đà Nẵng để nhìn thấy cả 2 miền, hoặc HCM)
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

    // Lưu trữ vị trí và bán kính lần cuối gọi API thành công để chống spam request
    private var lastFetchedLocation: Location? = null
    private var lastFetchedRadius: Double = 0.0

    init {
        loadCategories()
        getInitialUserLocation()
    }

    private fun getInitialUserLocation() {
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (!hasFine && !hasCoarse) {
            _uiState.update { it.copy(isLocationLoading = false) }
            // Mặc định tải khu vực HCM với bán kính rộng
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

    /**
     * Gọi API thông minh: Kiểm tra khoảng cách và bán kính trước khi gửi request.
     * Giúp tránh lỗi 429 Rate Limit.
     */
    fun fetchEventsSmart(center: Point, rawRadiusKm: Double, force: Boolean = false) {
        // 1. Tối ưu bán kính: Luôn lấy tối thiểu 5km để mở rộng vùng tìm kiếm, tránh lãng phí khi zoom quá gần
        val optimizedRadius = rawRadiusKm.coerceAtLeast(5.0).coerceAtMost(100.0)

        // 2. Kiểm tra khoảng cách so với lần fetch trước
        if (!force && lastFetchedLocation != null) {
            val newLocation = Location("new").apply {
                latitude = center.latitude()
                longitude = center.longitude()
            }
            val distanceMeters = newLocation.distanceTo(lastFetchedLocation!!)

            // Nếu di chuyển dưới 2km VÀ bán kính không đổi quá nhiều (20%) -> KHÔNG GỌI API
            val radiusDiff = Math.abs(optimizedRadius - lastFetchedRadius)
            if (distanceMeters < 2000 && radiusDiff < (lastFetchedRadius * 0.2)) {
                return // Bỏ qua request này
            }
        }

        // 3. Lưu trạng thái mới
        lastFetchedLocation = Location("last").apply {
            latitude = center.latitude()
            longitude = center.longitude()
        }
        lastFetchedRadius = optimizedRadius

        // 4. Gọi API
        fetchEventsInternal(center, optimizedRadius)
    }

    private fun fetchEventsInternal(center: Point, radiusKm: Double) {
        viewModelScope.launch {
            _uiState.update { it.copy(nearbyEventsResult = Result.Loading) }

            findNearbyEventsUseCase(
                lat = center.latitude().toString(),
                lon = center.longitude().toString(),
                radiusInKm = radiusKm,
                limit = 50, // Lấy nhiều hơn vì hiển thị trực tiếp trên map
                page = 1
            ).collect { result ->
                _uiState.update { it.copy(nearbyEventsResult = result) }
            }
        }
    }

    private fun loadCategories() {
        val categories = listOf(
            CategoryItem("All", R.drawable.group_34057),
            CategoryItem("Music", R.drawable.quaver),
            CategoryItem("Sports", R.drawable.sports),
            CategoryItem("Food", R.drawable.noodles)
        )
        _uiState.update { it.copy(categories = categories) }
    }

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun onCategorySelected(categoryName: String) {
        _uiState.update { it.copy(selectedCategory = categoryName) }
    }
}