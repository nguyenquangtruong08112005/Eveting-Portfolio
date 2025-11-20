package com.tdtuer.eventing.ui.screens.postevent

import android.net.Uri
import android.util.Log
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.Firebase
import com.google.firebase.auth.FirebaseAuth
import com.tdtuer.eventing.constants.Constraints
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.data.repository.EventRepository
import com.tdtuer.eventing.domain.model.Event
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.events.GetEventByIdUseCase
import com.tdtuer.eventing.domain.usecase.user.UploadImageUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject
import retrofit2.HttpException

data class ReviewItem(
    val userName: String,
    val avatarUrl: String,
    val rating: Int,
    val comment: String
)

data class MediaItem(val url: String, val type: String)

data class PostEventUiState(
    val eventId: String = "",
    val event: Event? = null, // Thêm trường chứa thông tin sự kiện
    val organizer: FeaturedProfileDto? = null, // Thông tin Organizer
    val reviews: List<ReviewItem> = emptyList(),
    val sharedMedia: List<MediaItem> = emptyList(),
    val userRating: Int = 0,
    val userReview: String = "",
    val isUploading: Boolean = false,
    val activeTab: Int = 0, // 0: Reviews, 1: Media
    val error: String? = null
)

@HiltViewModel
class PostEventViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val uploadImageUseCase: UploadImageUseCase,
    private val getEventByIdUseCase: GetEventByIdUseCase,
    private val eventRepository: EventRepository,
    private val auth: FirebaseAuth,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PostEventUiState())
    val uiState = _uiState.asStateFlow()

    init {
        val eventId = savedStateHandle.get<String>("eventId") ?: ""
        _uiState.update { it.copy(eventId = eventId) }

        // Gọi song song: lấy thông tin sự kiện và dữ liệu review/media
        loadEventDetails(eventId)
        loadReviewsAndMedia(eventId)
    }

    private fun loadEventDetails(eventId: String) {
        viewModelScope.launch {
            getEventByIdUseCase(eventId).collectLatest { result ->
                if (result is Result.Success) {
                    val event = result.data

                    // Trích xuất Organizer từ featuredProfiles
                    val profiles = (event.featuredProfiles as? List<*>)
                        ?.filterIsInstance<FeaturedProfileDto>() ?: emptyList()
                    val organizer = profiles.firstOrNull { it.profileType == "organizer" }

                    _uiState.update {
                        it.copy(event = event, organizer = organizer)
                    }
                }
                // Handle error if needed
            }
        }
    }

    private fun loadReviewsAndMedia(eventId: String) {
        // 1. Load Reviews
        viewModelScope.launch {
            eventRepository.getEventReviews(eventId).collect { result ->
                if (result is Result.Success) {
                    _uiState.update { it.copy(reviews = result.data) }
                }
            }
        }

        // 2. Load Media
        viewModelScope.launch {
            eventRepository.getEventMedia(eventId).collect { result ->
                if (result is Result.Success) {
                    _uiState.update { it.copy(sharedMedia = result.data) }
                }
            }
        }
    }

    // ... (Giữ nguyên các hàm onTabSelected, onRatingChange, onSubmitReview, onMediaSelected...)
    fun onTabSelected(index: Int) {
        _uiState.update { it.copy(activeTab = index) }
    }

    fun onRatingChange(rating: Int) {
        _uiState.update { it.copy(userRating = rating) }
    }

    fun onReviewChange(text: String) {
        _uiState.update { it.copy(userReview = text) }
    }

    fun onSubmitReview() {
        val rating = _uiState.value.userRating
        val comment = _uiState.value.userReview
        val eventId = _uiState.value.eventId

        if (rating == 0) return

        viewModelScope.launch {
            // Gọi API
            val result = eventRepository.postEventReview(eventId, rating, comment)

            when (result) {
                is Result.Success -> {
                    // Refresh lại list và reset input
                    loadReviewsAndMedia(eventId)
                    _uiState.update { it.copy(userRating = 0, userReview = "", error = null) }
                }
                is Result.Failure -> {
                    handleApiError(result.exception)
                }
                else -> {}
            }
        }
    }

    fun onMediaSelected(uri: Uri) {
        val eventId = _uiState.value.eventId
        val userId = auth.currentUser?.uid ?: "anonymous"

        viewModelScope.launch {
            _uiState.update { it.copy(isUploading = true, error = null) }

            // 1. Tạo đường dẫn có cấu trúc: events/{eventId}/uploads/{userId}/{timestamp}.jpg
            val fileName = "${System.currentTimeMillis()}.jpg"
            val storagePath = "${Constraints.PATH_EVENTS}/$eventId/${Constraints.PATH_UPLOADS}/$userId/$fileName"

            // 2. Upload lên Firebase
            val uploadResult = uploadImageUseCase(uri, storagePath)

            if (uploadResult is Result.Success) {
                val downloadUrl = uploadResult.data

                // 3. Gửi URL về Server (Lúc này Server mới check quyền tham gia)
                val postResult = eventRepository.postEventMedia(eventId, downloadUrl, "image")

                if (postResult is Result.Success) {
                    loadReviewsAndMedia(eventId)
                    _uiState.update { it.copy(isUploading = false) }
                } else if (postResult is Result.Failure) {
                    _uiState.update { it.copy(isUploading = false) }
                    handleApiError(postResult.exception)
                }
            } else {
                _uiState.update { it.copy(isUploading = false, error = "Failed to upload image.") }
            }
        }
    }

    // Hàm xử lý lỗi chung
    private fun handleApiError(exception: Exception) {
        if (exception is HttpException && exception.code() == 403 || exception.message?.contains("403") == true) {
            // Xử lý riêng lỗi 403: Người dùng chưa tham gia sự kiện
            _uiState.update {
                it.copy(error = "You didn't participate in this event.")
            }
        } else {
            _uiState.update {
                it.copy(error = exception.message ?: "Oops something went wrong.")
            }
        }
    }
}