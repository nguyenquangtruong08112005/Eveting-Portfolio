package com.tdtuer.eventing.ui.screens.home

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Campaign
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Sports
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.tdtuer.eventing.domain.usecase.events.GetAllEventsUseCase
import com.tdtuer.eventing.domain.usecase.events.GetRecommendationsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.launch
import javax.inject.Inject
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import android.util.Log
import com.google.android.gms.location.FusedLocationProviderClient
import com.tdtuer.eventing.domain.usecase.events.FindNearbyEventsUseCase
import com.tdtuer.eventing.helpers.formatDisplayPrice
import com.tdtuer.eventing.helpers.formatTimestampToDay
import com.tdtuer.eventing.helpers.formatTimestampToMonth
import dagger.hilt.android.qualifiers.ApplicationContext
import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.annotation.RequiresPermission
import androidx.compose.material3.Icon
import androidx.core.content.ContextCompat
import com.tdtuer.eventing.domain.model.FilterParams
import com.tdtuer.eventing.domain.usecase.events.SearchEventsUseCase
import com.tdtuer.eventing.helpers.getAddressFromCoordinates
import kotlinx.coroutines.Dispatchers

// Data classes for UI state
data class Category(
    val name: String,
    val color: Color,
    val selectedTextColor: Color,
    val iconFactory: @Composable () -> Unit
)

// Enum for Navigation Events
enum class HomeNavEvent {
    NavigateToAuth
}

data class Destination(val name: String, val imageUrl: String)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val firebaseAuth: FirebaseAuth, // Inject FirebaseAuth
    private val getAllEventsUseCase: GetAllEventsUseCase,
    private val searchEventsUseCase: SearchEventsUseCase,
    private val getRecommendationsUseCase: GetRecommendationsUseCase,
    private val findNearbyEventsUseCase: FindNearbyEventsUseCase,
    private val fusedLocationClient: FusedLocationProviderClient,
    @ApplicationContext private val context: Context
) : ViewModel() {

    // --- Navigation ---
    private val _navEvent = MutableSharedFlow<HomeNavEvent>()
    val navEvent = _navEvent.asSharedFlow()

    // --- UI State ---
    private val _upcomingEvents = mutableStateOf<List<EventCardUiModel>>(emptyList())
    val upcomingEvents: State<List<EventCardUiModel>> = _upcomingEvents

    private val _nearbyEvents = mutableStateOf<List<EventCardUiModel>>(emptyList())
    val nearbyEvents: State<List<EventCardUiModel>> = _nearbyEvents

    private val _categories = mutableStateOf<List<Category>>(emptyList())
    val categories: State<List<Category>> = _categories

    private val _selectedCategoryName = mutableStateOf("All")
    val selectedCategoryName: String get() = _selectedCategoryName.value

    private val _currentLocationDisplay = mutableStateOf<String?>(null)
    val currentLocationDisplay: State<String?> = _currentLocationDisplay

    private val _videoEvents = mutableStateOf<List<EventCardUiModel>>(emptyList())
    val videoEvents: State<List<EventCardUiModel>> = _videoEvents

    private val _trendingEvents = mutableStateOf<List<EventCardUiModel>>(emptyList())
    val trendingEvents: State<List<EventCardUiModel>> = _trendingEvents

    private val _forYouEvents = mutableStateOf<List<EventCardUiModel>>(emptyList())
    val forYouEvents: State<List<EventCardUiModel>> = _forYouEvents


    // Danh sách địa điểm
    val popularDestinations = listOf(
        Destination(
            "Hồ Chí Minh",
            "https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=1000&auto=format&fit=crop"
        ), Destination(
            "Hà Nội",
            "https://images.unsplash.com/photo-1616486410185-81af2d32a2af?q=80&w=686&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        ), Destination(
            "Đà Nẵng",
            "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=1000&auto=format&fit=crop"
        ), Destination(
            "Đà Lạt",
            "https://images.unsplash.com/photo-1558338475-7ac335028946?q=80&w=1632&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        ), Destination(
            "Cao Bằng",
            "https://images.unsplash.com/photo-1650610114362-29af75c44fd7?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        ), Destination(
            "Ninh Bình",
            "https://images.unsplash.com/photo-1557750255-c76072a7aad1?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        ), Destination(
            "Phú Quốc",
            "https://images.unsplash.com/photo-1730714103959-5d5a30acf547?q=80&w=2061&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        )
    )

    init {
        loadAllSections()
    }

    private fun loadAllSections() {
        viewModelScope.launch {
            // 1. Video Highlights: Lấy sự kiện có video
            launch {
                searchEventsUseCase(FilterParams(hasVideo = true, limit = 5)).collect { result ->
                    if (result is Result.Success) {
                        _videoEvents.value = result.data.map { it.toUiModel() }
                        //Log.d("HomeViewModel", "Video Events: ${_videoEvents.value}")
                    }
                }
            }

            // 2. Trending: Sắp xếp theo hotScore
            launch {
                searchEventsUseCase(
                    FilterParams(
                        sortBy = "hotScore", sortOrder = "desc", limit = 6
                    )
                ).collect { result ->
                    if (result is Result.Success) {
                        _trendingEvents.value = result.data.map { it.toUiModel() }
                    }
                }
            }

            // 3. For You: Gợi ý cá nhân hóa
            launch {
                getRecommendationsUseCase(limit = 10).collect { result ->
                    if (result is Result.Success) {
                        _forYouEvents.value = result.data.map { it.toUiModel() }
                    }
                }
            }
        }
    }

    // --- Event Handlers ---
    fun onSignOutClick() = viewModelScope.launch {
        firebaseAuth.signOut()
        _navEvent.emit(HomeNavEvent.NavigateToAuth) // Phát sự kiện điều hướng
    }

    fun onBottomBarItemClick(itemName: String) { /* TODO */
    }

    fun onFabClick() { /* TODO */
    }


    fun onSearchFilterClick() { /* TODO */
    }

    fun onCategorySelected(categoryName: String) {
        _selectedCategoryName.value = categoryName
    }

    fun onEventBookmarkClick(event: EventCardUiModel) {
        viewModelScope.launch {
            val updatedEvent = event.copy(isFavorite = !event.isFavorite)

            // Update upcoming events list
            val upcomingList = _upcomingEvents.value
            val upcomingEventIndex = upcomingList.indexOfFirst { it.id == event.id }
            if (upcomingEventIndex != -1) {
                _upcomingEvents.value = upcomingList.toMutableList().apply {
                    set(upcomingEventIndex, updatedEvent)
                }
            }

            // Update nearby events list
            val nearbyList = _nearbyEvents.value
            val nearbyEventIndex = nearbyList.indexOfFirst { it.id == event.id }
            if (nearbyEventIndex != -1) {
                _nearbyEvents.value = nearbyList.toMutableList().apply {
                    set(nearbyEventIndex, updatedEvent)
                }
            }
        }
    }

    fun onInviteFriendsClick() { /* TODO */
    }

    // --- Data Loading ---
    private fun loadEvents() {
        viewModelScope.launch {
            // (Tùy chọn) TODO: Tạo một state _isLoading và set = true

            getAllEventsUseCase(
                page = 1,
                limit = 10,
            ).collect { result ->
                when (result) {
                    is Result.Success -> {
                        _upcomingEvents.value = result.data.map { domainEvent ->
                            domainEvent.toUiModel()
                        } // Cập nhật state với dữ liệu thật

                    }

                    is Result.Failure -> {
                        // TODO: Tạo một state khác để báo lỗi cho UI
                        //Log.e("HomeViewModel", "Lỗi khi tải events: ${result.exception.message}")
                        // (Tùy chọn) TODO: set _isLoading = false
                    }

                    is Result.Loading -> {
                        // (Tùy chọn) TODO: set _isLoading = true
                        //Log.d("HomeViewModel", "Đang tải events...")
                    }
                }
            }
        }
    }

    private fun Event.toUiModel(): EventCardUiModel {
        return EventCardUiModel(
            id = this.id,
            name = this.name,
            // Ưu tiên banner, nếu không có thì dùng ảnh thường
            imageUrl = this.bannerUrl.ifEmpty { this.imageUrl },
            // Map video URL
            videoUrl = this.videoUrl,
            displayDate = formatTimestampToDay(this.date),
            displayMonth = formatTimestampToMonth(this.date),
            displayPrice = formatDisplayPrice(this.minPrice),
            displayLocation = this.location,
            isFavorite = false
        )
    }

    fun loadNearbyEventsBasedOnLocation() {
        if (ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_FINE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED && ContextCompat.checkSelfPermission(
                context, Manifest.permission.ACCESS_COARSE_LOCATION
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.w("HomeViewModel", "Không có quyền truy cập vị trí")
            return
        }

        fusedLocationClient.lastLocation.addOnFailureListener { exception ->
            {}//Log.e("HomeViewModel", "Lỗi khi lấy vị trí: ${exception.message}")
        }.addOnSuccessListener { location ->
            if (location == null) {
                Log.w("HomeViewModel", "Không thể trí hiện tại (location is null)")
                return@addOnSuccessListener
            }

            //Log.d("HomeViewModel", "Vị trí hiện tại: $location")

            getAddressFromCoordinates(context, location.latitude, location.longitude)

            viewModelScope.launch {

                launch(Dispatchers.IO) {
                    val addressName =
                        getAddressFromCoordinates(context, location.latitude, location.longitude)

                    _currentLocationDisplay.value = addressName

                    //Log.d("HomeViewModel", "Địa chỉ hiện tại: $addressName")
                }

                findNearbyEventsUseCase(
                    lat = location.latitude.toString(),
                    lon = location.longitude.toString(),
                    radiusInKm = 50.0
                ).collect { result ->
                    when (result) {
                        is Result.Loading -> {}
                        is Result.Failure -> {
                            //Log.e"HomeViewModel", "Lỗi khi tải events: ${result.exception.message}")
                        }

                        is Result.Success -> {
                            _nearbyEvents.value = result.data.map { domainEvent ->
                                domainEvent.toUiModel()
                            }
                        }
                    }
                }
            }
        }
    }

    private fun loadCategories() {
        _categories.value = listOf(
            Category(
            "All", Color(0xFF5669FF), Color.White
        ) {
            Icon(
                Icons.Default.Bookmark, contentDescription = null, tint = Color.White
            )
        }, Category(
            "Music", Color.White, Color.Black
        ) {
            Icon(
                Icons.Default.MusicNote, contentDescription = null, tint = Color.Black
            )
        }, Category("Sports", Color(0xFFF0635A), Color.White) {
            Icon(
                Icons.Default.Sports, contentDescription = null, tint = Color.White
            )
        }, Category(
            "Art", Color(0xFF29D697), Color.White
        ) {
            Icon(
                Icons.Default.Campaign, contentDescription = null, tint = Color.White
            )
        })
    }
}