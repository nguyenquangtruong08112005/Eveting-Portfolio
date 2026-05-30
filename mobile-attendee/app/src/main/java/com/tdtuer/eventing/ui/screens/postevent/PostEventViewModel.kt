package com.tdtuer.eventing.ui.screens.postevent

import android.net.Uri
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.tdtuer.eventing.constants.Constraints
import com.tdtuer.eventing.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing.domain.model.Result
import com.tdtuer.eventing.domain.usecase.authentication.GetCurrentUserIdUseCase
import com.tdtuer.eventing.domain.usecase.events.GetEventByIdUseCase
import com.tdtuer.eventing.domain.usecase.events.GetEventMediaUseCase
import com.tdtuer.eventing.domain.usecase.events.GetEventReviewsUseCase
import com.tdtuer.eventing.domain.usecase.events.PostEventMediaUseCase
import com.tdtuer.eventing.domain.usecase.events.PostEventReviewUseCase
import com.tdtuer.eventing.domain.usecase.user.UploadImageUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import retrofit2.HttpException
import javax.inject.Inject

@HiltViewModel
class PostEventViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val uploadImageUseCase: UploadImageUseCase,
    private val getEventByIdUseCase: GetEventByIdUseCase,
    private val getEventReviewsUseCase: GetEventReviewsUseCase,
    private val postEventReviewUseCase: PostEventReviewUseCase,
    private val getEventMediaUseCase: GetEventMediaUseCase,
    private val postEventMediaUseCase: PostEventMediaUseCase,
    private val getCurrentUserIdUseCase: GetCurrentUserIdUseCase
    ) : ViewModel() {

    private val _uiState = MutableStateFlow(PostEventUiState())
    val uiState = _uiState.asStateFlow()

    init {
        val eventId = savedStateHandle.get<String>("eventId") ?: ""
        _uiState.update { it.copy(eventId = eventId) }

        loadEventDetails(eventId)
        loadReviewsAndMedia(eventId)
    }

    private fun loadEventDetails(eventId: String) {
        viewModelScope.launch {
            getEventByIdUseCase(eventId).collectLatest { result ->
                if (result is Result.Success) {
                    val event = result.data
                    val profiles = (event.featuredProfiles as? List<*>)
                        ?.filterIsInstance<FeaturedProfileDto>() ?: emptyList()
                    val organizer = profiles.firstOrNull { it.profileType == "organizer" }

                    _uiState.update {
                        it.copy(event = event, organizer = organizer)
                    }
                }
            }
        }
    }

    private fun loadReviewsAndMedia(eventId: String) {
        // 1. Load Reviews qua UseCase
        viewModelScope.launch {
            getEventReviewsUseCase(eventId).collect { result ->
                if (result is Result.Success) {
                    _uiState.update { it.copy(reviews = result.data) }
                }
            }
        }

        // 2. Load Media qua UseCase
        viewModelScope.launch {
            getEventMediaUseCase(eventId).collect { result ->
                if (result is Result.Success) {
                    _uiState.update { it.copy(sharedMedia = result.data) }
                }
            }
        }
    }

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
            // Gọi qua UseCase
            val result = postEventReviewUseCase(eventId, rating, comment)

            when (result) {
                is Result.Success -> {
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
        val userId = getCurrentUserIdUseCase() ?: "anonymous"

        viewModelScope.launch {
            _uiState.update { it.copy(isUploading = true, error = null) }

            val fileName = "${System.currentTimeMillis()}.jpg"
            val storagePath = "${Constraints.PATH_EVENTS}/$eventId/${Constraints.PATH_UPLOADS}/$userId/$fileName"

            val uploadResult = uploadImageUseCase(uri, storagePath)

            if (uploadResult is Result.Success) {
                val downloadUrl = uploadResult.data

                // Gọi qua UseCase
                val postResult = postEventMediaUseCase(eventId, downloadUrl, "image")

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

    private fun handleApiError(exception: Exception) {
        if (exception is HttpException && exception.code() == 403 || exception.message?.contains("403") == true) {
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