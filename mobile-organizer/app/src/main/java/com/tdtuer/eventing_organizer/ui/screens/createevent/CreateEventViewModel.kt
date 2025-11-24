package com.tdtuer.eventing_organizer.ui.screens.createevent

import android.net.Uri
import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.constants.Constraints
import com.tdtuer.eventing_organizer.data.network.model.AddressDetailsRequest
import com.tdtuer.eventing_organizer.data.network.model.CreateEventRequest
import com.tdtuer.eventing_organizer.data.network.model.LocationCoordinates
import com.tdtuer.eventing_organizer.data.network.model.TicketTypeRequest
import com.tdtuer.eventing_organizer.data.network.model.VenueResponse
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.user.UploadImageUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

// --- DEFINITION OF TICKET TYPE STATE ---
data class TicketTypeState(
    var name: String = "",
    var price: String = "",
    var quantity: String = "",
    var description: String = ""
)

enum class LocationMode {
    EXISTING_VENUE,
    CUSTOM_LOCATION
}

data class CreateEventUiState(
    val name: String = "",
    val description: String = "",
    val date: Long = System.currentTimeMillis(),
    val eventType: String = "physical",

    val onlineUrl: String = "",
    val videoUrl: String = "",

    val bannerUri: Uri? = null,
    val thumbnailUri: Uri? = null,
    val bannerUrl: String = "",
    val thumbnailUrl: String = "",

    val locationMode: LocationMode = LocationMode.EXISTING_VENUE,

    val availableVenues: List<VenueResponse> = emptyList(),
    val selectedVenue: VenueResponse? = null,

    val venueName: String = "",
    val street: String = "",
    val ward: String = "",
    val district: String = "",
    val city: String = "",
    val lat: Double = 10.7769,
    val lng: Double = 106.7009,
    val isOutdoor: Boolean = false,

    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class CreateEventViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val uploadImageUseCase: UploadImageUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreateEventUiState())
    val uiState = _uiState.asStateFlow()

    val ticketTypes = mutableStateListOf(TicketTypeState())

    init {
        loadVenues()
        if (ticketTypes.isEmpty()) ticketTypes.add(TicketTypeState())
    }

    private fun loadVenues() {
        viewModelScope.launch {
            eventRepository.getVenues().collect { result ->
                if (result is Result.Success) {
                    _uiState.update { it.copy(availableVenues = result.data) }
                }
            }
        }
    }

    // Fields
    fun onNameChange(v: String) { _uiState.update { it.copy(name = v) } }
    fun onDescriptionChange(v: String) { _uiState.update { it.copy(description = v) } }
    fun onDateSelected(v: Long) { _uiState.update { it.copy(date = v) } }
    fun onEventTypeChange(v: String) { _uiState.update { it.copy(eventType = v) } }
    fun onOnlineUrlChange(v: String) { _uiState.update { it.copy(onlineUrl = v) } }
    fun onVideoUrlChange(v: String) { _uiState.update { it.copy(videoUrl = v) } }

    // Images
    fun onBannerSelected(uri: Uri?) { _uiState.update { it.copy(bannerUri = uri) } }
    fun onThumbnailSelected(uri: Uri?) { _uiState.update { it.copy(thumbnailUri = uri) } }

    // Location
    fun onLocationModeChange(mode: LocationMode) { _uiState.update { it.copy(locationMode = mode) } }
    fun onVenueSelected(venue: VenueResponse) { _uiState.update { it.copy(selectedVenue = venue) } }
    fun onVenueNameChange(v: String) { _uiState.update { it.copy(venueName = v) } }
    fun onStreetChange(v: String) { _uiState.update { it.copy(street = v) } }
    fun onWardChange(v: String) { _uiState.update { it.copy(ward = v) } }
    fun onDistrictChange(v: String) { _uiState.update { it.copy(district = v) } }
    fun onCityChange(v: String) { _uiState.update { it.copy(city = v) } }
    fun onOutdoorChange(v: Boolean) { _uiState.update { it.copy(isOutdoor = v) } }

    // Tickets
    fun addTicketType() { ticketTypes.add(TicketTypeState()) }
    fun removeTicketType(index: Int) { if (ticketTypes.size > 1) ticketTypes.removeAt(index) }

    // Location Update from Map
    fun onLocationSelected(lat: Double, lng: Double, street: String, ward: String, district: String, city: String) {
        _uiState.update {
            val finalStreet = if (street.isBlank()) it.street else street
            val autoVenueName = if (it.venueName.isBlank()) "$finalStreet, $district".trim(',',' ') else it.venueName
            it.copy(lat = lat, lng = lng, street = finalStreet, ward = ward, district = district, city = city, venueName = autoVenueName)
        }
    }

    fun createEvent() {
        val state = _uiState.value

        if (state.name.isBlank() || state.description.isBlank() || ticketTypes.isEmpty()) {
            _uiState.update { it.copy(error = "Vui lòng nhập Tên, Mô tả và ít nhất 1 loại vé.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // Upload Images
            val bannerDeferred = async {
                if (state.bannerUri != null) {
                    val path = "${Constraints.PATH_EVENTS}/banners/${System.currentTimeMillis()}_banner.jpg"
                    uploadImageUseCase(state.bannerUri, path)
                } else Result.Success(state.bannerUrl)
            }
            val thumbDeferred = async {
                if (state.thumbnailUri != null) {
                    val path = "${Constraints.PATH_EVENTS}/thumbnails/${System.currentTimeMillis()}_thumb.jpg"
                    uploadImageUseCase(state.thumbnailUri, path)
                } else Result.Success(state.thumbnailUrl)
            }

            val bannerResult = bannerDeferred.await()
            val thumbResult = thumbDeferred.await()

            if (!bannerResult.isSuccess || !thumbResult.isSuccess) {
                _uiState.update { it.copy(isLoading = false, error = "Lỗi upload ảnh.") }
                return@launch
            }

            val finalBannerUrl = (bannerResult as Result.Success).data
            val finalThumbUrl = (thumbResult as Result.Success).data

            // Ticket Requests
            val ticketRequests = ticketTypes.map {
                TicketTypeRequest(
                    name = it.name.ifBlank { "General" },
                    price = it.price.toDoubleOrNull() ?: 0.0,
                    quantity = it.quantity.toIntOrNull() ?: 0,
                    description = it.description
                )
            }

            // Location Logic
            var venueId: String? = null
            var venueName: String? = null
            var locationCoords: LocationCoordinates? = null
            var addressDetails: AddressDetailsRequest? = null
            var onlineUrl: String? = null

            if (state.eventType == "online") {
                onlineUrl = state.onlineUrl
            } else {
                if (state.locationMode == LocationMode.EXISTING_VENUE) {
                    venueId = state.selectedVenue?.id
                } else {
                    venueName = state.venueName
                    locationCoords = LocationCoordinates(state.lat, state.lng)
                    addressDetails = AddressDetailsRequest(state.street, state.ward, state.district, state.city)
                }
            }

            val request = CreateEventRequest(
                name = state.name,
                description = state.description,
                date = state.date,
                eventType = state.eventType,
                bannerUrl = finalBannerUrl,
                imageUrl = finalThumbUrl,
                videoUrl = state.videoUrl.ifBlank { null },
                isOutdoor = state.isOutdoor,
                ticketTypes = ticketRequests,
                onlineUrl = onlineUrl,
                venueId = venueId,
                venueName = venueName,
                location = locationCoords,
                addressDetails = addressDetails
            )

            val result = eventRepository.createEvent(request)
            if (result is Result.Success) {
                _uiState.update { it.copy(isLoading = false, isSuccess = true) }
            } else {
                val errorMsg = (result as Result.Failure).exception.message ?: "Unknown Error"
                _uiState.update { it.copy(isLoading = false, error = errorMsg) }
            }
        }
    }

    fun resetState() {
        _uiState.value = CreateEventUiState()
        loadVenues()
        ticketTypes.clear()
        ticketTypes.add(TicketTypeState())
    }

    fun getFormattedDate(): String {
        return SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date(_uiState.value.date))
    }
}