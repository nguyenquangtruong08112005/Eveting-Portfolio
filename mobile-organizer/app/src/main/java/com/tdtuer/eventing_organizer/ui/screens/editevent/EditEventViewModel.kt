package com.tdtuer.eventing_organizer.ui.screens.editevent

import android.net.Uri
import android.util.Log
import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.constants.Constraints
import com.tdtuer.eventing_organizer.data.network.AddressApiService
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.network.model.*
import com.tdtuer.eventing_organizer.data.repository.EventRepository
import com.tdtuer.eventing_organizer.domain.model.Event
import com.tdtuer.eventing_organizer.domain.model.Result
import com.tdtuer.eventing_organizer.domain.usecase.user.UploadImageUseCase
import com.tdtuer.eventing_organizer.ui.screens.createevent.CreateEventUiState
import com.tdtuer.eventing_organizer.ui.screens.createevent.CreateProfileState
import com.tdtuer.eventing_organizer.ui.screens.createevent.LocationMode
import com.tdtuer.eventing_organizer.ui.screens.createevent.TicketTypeState
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

@HiltViewModel
class EditEventViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val eventRepository: EventRepository,
    private val uploadImageUseCase: UploadImageUseCase,
    private val addressApiService: AddressApiService,
    private val eventApiService: EventApiService
) : ViewModel() {

    private val eventId: String = savedStateHandle.get<String>("eventId") ?: ""

    private val _uiState = MutableStateFlow(CreateEventUiState())
    val uiState = _uiState.asStateFlow()

    val ticketTypes = mutableStateListOf<TicketTypeState>()

    val predefinedCategories = listOf(
        "Music", "Art", "Workshop", "Business", "Food & Drink",
        "Technology", "Sports", "Education", "Fashion", "Other"
    )

    init {
        loadInitialData()
        if (eventId.isNotEmpty()) {
            loadEventData(eventId)
        }
    }

    private fun loadInitialData() {
        viewModelScope.launch {
            // Load Venues
            launch {
                eventRepository.getVenues().collect { result ->
                    if (result is Result.Success) _uiState.update { it.copy(availableVenues = result.data) }
                }
            }
            // Load Provinces
            launch {
                try {
                    val res = addressApiService.getProvinces()
                    if (res.isSuccessful && res.body() != null) _uiState.update { it.copy(provinces = res.body()!!) }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
            // Load Profiles
            launch {
                eventRepository.getFeaturedProfiles().collect { result ->
                    if (result is Result.Success) _uiState.update { it.copy(availableProfiles = result.data) }
                }
            }
        }
    }

    /**
     * @param id: ID của sự kiện cần load
     * Load data từ repository và map vào UI State
     */
    private fun loadEventData(id: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            eventRepository.getEventById(id).collect { result ->
                Log.d("EditEventViewModel", "loadEventData: $result")

                if (result is Result.Success) {
                    val event = result.data
                    mapEventToState(event)
                    _uiState.update { it.copy(isLoading = false) }
                } else if (result is Result.Failure) {
                    _uiState.update { it.copy(isLoading = false, error = "Failed to load event") }
                }
            }
        }
    }

    private fun mapEventToState(event: Event) {
        // 1. Map Ticket Types
        // Dữ liệu từ Domain là Map<String, Map<String, Any>>
        ticketTypes.clear()
        if (event.ticketTypes.isNotEmpty()) {
            event.ticketTypes.forEach { (key, details) ->
                // Kiểm tra kỹ kiểu dữ liệu khi lấy từ Map<String, Any>
                val typeName = details["name"] as? String ?: key
                // Convert an toàn số sang String
                val price = when (val p = details["price"]) {
                    is Number -> p.toLong().toString()
                    is String -> p
                    else -> "0"
                }
                val quantity = when (val q = details["quantity"]) {
                    is Number -> q.toInt().toString()
                    is String -> q
                    else -> "0"
                }
                val description = details["description"] as? String ?: ""
                ticketTypes.add(TicketTypeState(typeName, price, quantity, description))
            }
        } else {
            ticketTypes.add(TicketTypeState())
        }

        // 2. Map Featured Profiles
        // Logic mới: Server chỉ trả về list String ID trong detail, không phải list Object
        val profileIds = try {
            val rawList = event.featuredProfiles
            if (rawList.isNotEmpty()) {
                // Kiểm tra xem phần tử đầu tiên là String hay Object để xử lý
                val firstItem = rawList.firstOrNull()
                when (firstItem) {
                    is String -> rawList.filterIsInstance<String>().toSet()
                    is FeaturedProfileDto -> rawList.filterIsInstance<FeaturedProfileDto>().map { it.id }.toSet()
                    else -> emptySet()
                }
            } else emptySet()
        } catch (e: Exception) {
            Log.e("EditEventViewModel", "Error mapping profiles: ${e.message}")
            emptySet()
        }

        // 3. Map Location
        val venueDetails = event.venueDetails
        val lat = (venueDetails["latitude"] as? Number)?.toDouble() ?: 0.0
        val lng = (venueDetails["longitude"] as? Number)?.toDouble() ?: 0.0

        // Xử lý địa chỉ
        val fullAddress = venueDetails["address"] as? String ?: event.location
        val parts = fullAddress.split(",").map { it.trim() }

        var city = event.city
        var district = ""
        var ward = ""
        var street = fullAddress

        // Cố gắng parse ngược địa chỉ nếu có dấu phẩy
        if (parts.size >= 4) {
            city = parts.last()
            district = parts[parts.size - 2]
            ward = parts[parts.size - 3]
            street = parts.take(parts.size - 3).joinToString(", ")
        } else if (parts.isNotEmpty()) {
            // Fallback nếu format không chuẩn
            street = parts[0]
        }

        // Kiểm tra Location Mode
        val hasVenueId = venueDetails["id"] != null && (venueDetails["id"] as String).isNotEmpty()
        val mode = if (hasVenueId) LocationMode.EXISTING_VENUE else LocationMode.CUSTOM_LOCATION
        val venueName = event.venueName

        // Tìm venue object tương ứng trong danh sách loaded venues nếu ở mode EXISTING
        var selectedVenue: VenueResponse? = null
        if (hasVenueId) {
            val vId = venueDetails["id"] as String
            // Lưu ý: availableVenues có thể chưa load xong tại thời điểm này,
            // nhưng UI sẽ update khi list load xong nhờ StateFlow
            selectedVenue = _uiState.value.availableVenues.find { it.id == vId }
            // Nếu chưa tìm thấy (do list chưa load), ta tạo tạm 1 object để hiển thị
            if (selectedVenue == null) {
                selectedVenue = VenueResponse(
                    id = vId,
                    name = venueName,
                    addressDetails = AddressDetailsDto(street, ward, district, city),
                    location = LocationDto(lat, lng)
                )
            }
        }

        _uiState.update {
            it.copy(
                name = event.name,
                description = event.description,
                date = event.date,
                eventType = event.eventType,
                onlineUrl = event.onlineUrl,
                videoUrl = event.videoUrl,
                bannerUrl = event.bannerUrl,
                thumbnailUrl = event.imageUrl,
                isOutdoor = event.isOutdoor,
                locationMode = mode,
                selectedVenue = selectedVenue,
                venueName = venueName,
                city = city,
                district = district,
                ward = ward,
                street = street,
                lat = lat,
                lng = lng,
                selectedCategories = event.category.toSet(),
                tags = event.tags,
                selectedProfileIds = profileIds
            )
        }

        // Trigger location logic to pre-select dropdowns (nếu là custom location)
        if (mode == LocationMode.CUSTOM_LOCATION) {
            onLocationSelected(lat, lng, street, ward, district, city)
        }
    }

    fun onSaveChangesClick() {
        val state = _uiState.value

        if (state.name.isBlank() || ticketTypes.isEmpty()) {
            _uiState.update { it.copy(error = "Vui lòng nhập Tên sự kiện và ít nhất 1 loại vé.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }

            // 1. Upload All Media (Parallel)
            val bannerDef = async {
                if (state.bannerUri != null) uploadImageUseCase(
                    state.bannerUri,
                    "${Constraints.PATH_EVENTS}/banners/${System.currentTimeMillis()}.jpg"
                ) else Result.Success(state.bannerUrl)
            }
            val thumbDef = async {
                if (state.thumbnailUri != null) uploadImageUseCase(
                    state.thumbnailUri,
                    "${Constraints.PATH_EVENTS}/thumbnails/${System.currentTimeMillis()}.jpg"
                ) else Result.Success(state.thumbnailUrl)
            }
            val videoDef = async {
                if (state.videoUri != null) uploadImageUseCase(
                    state.videoUri,
                    "${Constraints.PATH_EVENTS}/videos/${System.currentTimeMillis()}.mp4"
                )
                else Result.Success(state.videoUrl) // Keep existing video if not changed
            }

            val bannerRes = bannerDef.await()
            val thumbRes = thumbDef.await()
            val videoRes = videoDef.await()

            if (bannerRes !is Result.Success || thumbRes !is Result.Success || videoRes !is Result.Success) {
                _uiState.update { it.copy(isLoading = false, error = "Lỗi upload ảnh/video.") }
                return@launch
            }

            val finalBannerUrl = bannerRes.data
            val finalThumbUrl = thumbRes.data
            val finalVideoUrl = videoRes.data

            // 2. Prepare Request
            val ticketRequests = ticketTypes.map {
                TicketTypeRequest(
                    it.name.ifBlank { "General" },
                    it.price.toDoubleOrNull() ?: 0.0,
                    it.quantity.toIntOrNull() ?: 0,
                    it.description
                )
            }

            var venueId: String? = null
            var venueName: String? = null
            var addressDetails: AddressDetailsRequest? = null
            var locationCoords: LocationCoordinates? = null

            if (state.eventType == "physical") {
                if (state.locationMode == LocationMode.EXISTING_VENUE) {
                    venueId = state.selectedVenue?.id
                } else {
                    venueName = state.venueName.ifBlank { "${state.street}, ${state.district}" }
                    addressDetails = AddressDetailsRequest(state.street, state.ward, state.district, state.city)
                    locationCoords = LocationCoordinates(state.lat, state.lng)
                }
            } else {
                venueId = null
            }

            val request = CreateEventRequest(
                name = state.name,
                description = state.description,
                date = state.date,
                eventType = state.eventType,
                bannerUrl = finalBannerUrl,
                imageUrl = finalThumbUrl,
                videoUrl = finalVideoUrl,
                isOutdoor = state.isOutdoor,
                ticketTypes = ticketRequests,
                category = state.selectedCategories.toList(),
                tags = state.tags,
                onlineUrl = if (state.eventType == "online") state.onlineUrl else null,
                venueId = venueId,
                venueName = venueName,
                location = locationCoords,
                addressDetails = addressDetails,
                featuredProfileIds = state.selectedProfileIds.toList()
            )

            // 3. Call Update API
            val result = eventRepository.updateEvent(eventId, request)

            if (result is Result.Success) {
                _uiState.update { it.copy(isLoading = false, isSuccess = true) }
            } else {
                val err = (result as Result.Failure).exception.message ?: "Unknown Error"
                _uiState.update { it.copy(isLoading = false, error = err) }
            }
        }
    }

    private fun normalizeAddressName(name: String): String {
        return name.lowercase()
            .replace(Regex("^(tỉnh|thành phố|tp\\.|tp|quận|huyện|thị xã|phường|xã|thị trấn|q\\.|p\\.)\\s+"), "")
            .trim()
    }

    fun onNameChange(v: String) { _uiState.update { it.copy(name = v) } }
    fun onDescriptionChange(v: String) { _uiState.update { it.copy(description = v) } }
    fun onDateSelected(v: Long) { _uiState.update { it.copy(date = v) } }
    fun onEventTypeChange(v: String) { _uiState.update { it.copy(eventType = v) } }
    fun onOutdoorChange(v: Boolean) { _uiState.update { it.copy(isOutdoor = v) } }
    fun onOnlineUrlChange(v: String) { _uiState.update { it.copy(onlineUrl = v) } }
    fun onVideoUrlChange(v: String) { _uiState.update { it.copy(videoUrl = v) } }

    fun onLocationModeChange(mode: LocationMode) { _uiState.update { it.copy(locationMode = mode) } }
    fun onVenueSelected(venue: VenueResponse) { _uiState.update { it.copy(selectedVenue = venue) } }

    fun onBannerSelected(uri: Uri?) { _uiState.update { it.copy(bannerUri = uri) } }
    fun onThumbnailSelected(uri: Uri?) { _uiState.update { it.copy(thumbnailUri = uri) } }
    fun onVideoSelected(uri: Uri?) { _uiState.update { it.copy(videoUri = uri) } }

    fun toggleCategory(category: String) {
        _uiState.update {
            val newSet = it.selectedCategories.toMutableSet()
            if (newSet.contains(category)) newSet.remove(category) else newSet.add(category)
            it.copy(selectedCategories = newSet)
        }
    }

    fun onTagInputChange(input: String) {
        if (input.endsWith(",")) {
            val newTag = input.dropLast(1).trim()
            if (newTag.isNotEmpty()) addTag(newTag)
            _uiState.update { it.copy(currentTagInput = "") }
        } else {
            _uiState.update { it.copy(currentTagInput = input) }
        }
    }

    fun onTagInputDone() {
        val input = _uiState.value.currentTagInput.trim()
        if (input.isNotEmpty()) {
            addTag(input)
            _uiState.update { it.copy(currentTagInput = "") }
        }
    }

    private fun addTag(tag: String) {
        val currentTags = _uiState.value.tags.toMutableList()
        if (!currentTags.contains(tag)) {
            currentTags.add(tag)
            _uiState.update { it.copy(tags = currentTags) }
        }
    }

    fun removeTag(tag: String) {
        val currentTags = _uiState.value.tags.toMutableList()
        currentTags.remove(tag)
        _uiState.update { it.copy(tags = currentTags) }
    }

    fun onVenueNameChange(v: String) { _uiState.update { it.copy(venueName = v) } }
    fun onStreetChange(v: String) { _uiState.update { it.copy(street = v) } }

    fun onProvinceSelected(province: Province) {
        _uiState.update { it.copy(selectedProvinceObj = province, selectedDistrictObj = null, selectedWardObj = null, districts = emptyList(), wards = emptyList(), city = province.name) }
        viewModelScope.launch {
            try {
                val res = addressApiService.getDistrictsByProvince(province.code)
                if (res.isSuccessful) _uiState.update { it.copy(districts = res.body()!!.districts) }
            } catch (e: Exception) {}
        }
    }

    fun onDistrictSelected(district: District) {
        _uiState.update { it.copy(selectedDistrictObj = district, selectedWardObj = null, wards = emptyList(), district = district.name) }
        viewModelScope.launch {
            try {
                val res = addressApiService.getWardsByDistrict(district.code)
                if (res.isSuccessful) _uiState.update { it.copy(wards = res.body()!!.wards) }
            } catch (e: Exception) {}
        }
    }

    fun onWardSelected(ward: Ward) {
        _uiState.update { it.copy(selectedWardObj = ward, ward = ward.name) }
    }

    fun onLocationSelected(lat: Double, lng: Double, street: String, ward: String, district: String, city: String) {
        _uiState.update {
            val finalStreet = street.ifBlank { it.street }
            val autoVenueName = it.venueName.ifBlank { "$finalStreet, $district".trim(',',' ') }

            // Preserve original lat/lng if new ones are 0.0
            val finalLat = if (lat == 0.0) it.lat else lat
            val finalLng = if (lng == 0.0) it.lng else lng

            it.copy(lat = finalLat, lng = finalLng, street = finalStreet, ward = ward, district = district, city = city, venueName = autoVenueName)
        }

        val provinces = _uiState.value.provinces
        if (provinces.isEmpty()) return

        val normCity = normalizeAddressName(city)
        val foundProvince = provinces.find { normalizeAddressName(it.name).contains(normCity) || normCity.contains(normalizeAddressName(it.name)) }

        if (foundProvince != null) {
            onProvinceSelected(foundProvince)
            viewModelScope.launch {
                try {
                    val res = addressApiService.getDistrictsByProvince(foundProvince.code)
                    if (res.isSuccessful && res.body() != null) {
                        val districts = res.body()!!.districts
                        _uiState.update { it.copy(districts = districts) }

                        val normDistrict = normalizeAddressName(district)
                        val foundDistrict = districts.find { normalizeAddressName(it.name).contains(normDistrict) || normDistrict.contains(normalizeAddressName(it.name)) }

                        if (foundDistrict != null) {
                            onDistrictSelected(foundDistrict)
                            try {
                                val resWard = addressApiService.getWardsByDistrict(foundDistrict.code)
                                if (resWard.isSuccessful && resWard.body() != null) {
                                    val wards = resWard.body()!!.wards
                                    _uiState.update { it.copy(wards = wards) }

                                    val normWard = normalizeAddressName(ward)
                                    val foundWard = wards.find { normalizeAddressName(it.name).contains(normWard) || normWard.contains(normalizeAddressName(it.name)) }
                                    if (foundWard != null) onWardSelected(foundWard)
                                }
                            } catch (e: Exception) {}
                        }
                    }
                } catch (e: Exception) {}
            }
        }
    }

    fun addTicketType() { ticketTypes.add(TicketTypeState()) }
    fun removeTicketType(index: Int) { if (ticketTypes.size > 1) ticketTypes.removeAt(index) }
    fun updateTicket(index: Int, ticket: TicketTypeState) { ticketTypes[index] = ticket }

    fun getFormattedDate(): String = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date(_uiState.value.date))

    fun showCreateProfileDialog() { _uiState.update { it.copy(createProfileState = it.createProfileState.copy(isShowDialog = true)) } }
    fun hideCreateProfileDialog() { _uiState.update { it.copy(createProfileState = CreateProfileState()) } }
    fun onNewProfileNameChange(v: String) { _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newName = v)) } }
    fun onNewProfileBioChange(v: String) { _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newBio = v)) } }
    fun onNewProfileTypeChange(v: String) { _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newProfileType = v)) } }
    fun onNewGenresChange(v: String) { _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newGenresInput = v)) } }
    fun onNewProfileImageSelected(uri: Uri?) { _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newImageUri = uri)) } }

    fun createNewProfile() {
        val pState = _uiState.value.createProfileState
        if (pState.newName.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(createProfileState = it.createProfileState.copy(isCreating = true)) }
            var imageUrl: String? = null
            if (pState.newImageUri != null) {
                val path = "${Constraints.PATH_UPLOADS}/profiles/${System.currentTimeMillis()}.jpg"
                val uploadRes = uploadImageUseCase(pState.newImageUri, path)
                if (uploadRes is Result.Success) imageUrl = uploadRes.data
            }
            val genresList = pState.newGenresInput.split(",").map { it.trim() }.filter { it.isNotEmpty() }

            val result = eventRepository.createFeaturedProfile(pState.newName, pState.newBio, imageUrl, pState.newProfileType, genresList)
            if (result is Result.Success) {
                val newProfile = result.data
                _uiState.update {
                    it.copy(
                        availableProfiles = it.availableProfiles + newProfile,
                        selectedProfileIds = it.selectedProfileIds + newProfile.id,
                        createProfileState = CreateProfileState()
                    )
                }
            } else {
                _uiState.update { it.copy(createProfileState = it.createProfileState.copy(isCreating = false)) }
            }
        }
    }

    fun toggleProfileSelection(profileId: String) {
        _uiState.update {
            val current = it.selectedProfileIds.toMutableSet()
            if (current.contains(profileId)) current.remove(profileId) else current.add(profileId)
            it.copy(selectedProfileIds = current)
        }
    }

    fun onBackClick() { /* Handled in UI */ }
}