package com.tdtuer.eventing_organizer.ui.screens.createevent

import android.net.Uri
import android.util.Log
import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing_organizer.constants.Constraints
import com.tdtuer.eventing_organizer.data.network.AddressApiService
import com.tdtuer.eventing_organizer.data.network.EventApiService
import com.tdtuer.eventing_organizer.data.network.model.*
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

// --- State Models ---
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

// Thêm state cho dialog tạo profile mới
data class CreateProfileState(
    val isShowDialog: Boolean = false,
    val newName: String = "",
    val newBio: String = "",
    val newImageUri: Uri? = null,
    val newProfileType: String = "artist", // Mặc định
    val newGenresInput: String = "",       // Chuỗi nhập tags
    val isCreating: Boolean = false
)

data class CreateEventUiState(
    // Basic Info
    val name: String = "",
    val description: String = "",
    val date: Long = System.currentTimeMillis(),

    // Type & Location Logic
    val eventType: String = "physical", // 'physical' or 'online'
    val isOutdoor: Boolean = false,
    val onlineUrl: String = "",
    val locationMode: LocationMode = LocationMode.EXISTING_VENUE,

    // Media (Uri để hiển thị preview, Url để gửi lên server)
    val bannerUri: Uri? = null,
    val bannerUrl: String = "",
    val thumbnailUri: Uri? = null,
    val thumbnailUrl: String = "",
    val videoUri: Uri? = null,  // Mới: Upload Video
    val videoUrl: String = "",  // Mới: URL video sau khi upload

    // Categories & Tags
    val selectedCategories: Set<String> = emptySet(), // Mới: Chọn nhiều
    val currentTagInput: String = "", // Mới: Input tag hiện tại
    val tags: List<String> = emptyList(), // Mới: List tag đã tạo

    // Featured Profiles
    val availableProfiles: List<FeaturedProfileDto> = emptyList(),
    val selectedProfileIds: Set<String> = emptySet(),

    val createProfileState: CreateProfileState = CreateProfileState(), // State cho dialog

    // Location Data (Custom)
    val venueName: String = "",
    val street: String = "",
    val ward: String = "",
    val district: String = "",
    val city: String = "",
    val lat: Double = 10.7769,
    val lng: Double = 106.7009,

    // Location Data (Existing)
    val availableVenues: List<VenueResponse> = emptyList(),
    val selectedVenue: VenueResponse? = null,

    // Address Dropdowns (Data source)
    val provinces: List<Province> = emptyList(),
    val districts: List<District> = emptyList(),
    val wards: List<Ward> = emptyList(),

    // Selected Address Objects
    val selectedProvinceObj: Province? = null,
    val selectedDistrictObj: District? = null,
    val selectedWardObj: Ward? = null,

    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class CreateEventViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val uploadImageUseCase: UploadImageUseCase,
    private val addressApiService: AddressApiService,
    private val eventApiService: EventApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(CreateEventUiState())
    val uiState = _uiState.asStateFlow()

    val ticketTypes = mutableStateListOf(TicketTypeState())

    // Danh sách thể loại cố định (hoặc load từ server nếu có API)
    val predefinedCategories = listOf(
        "Music",
        "Art",
        "Workshop",
        "Business",
        "Food & Drink",
        "Technology",
        "Sports",
        "Education",
        "Fashion",
        "Other"
    )

    init {
        if (ticketTypes.isEmpty()) ticketTypes.add(TicketTypeState())
        loadInitialData()
        loadFeaturedProfiles()
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
            // Load Profiles (Giả lập hoặc API thật)
            // ...
        }
    }

    private fun loadFeaturedProfiles() {
        viewModelScope.launch {
            eventRepository.getFeaturedProfiles().collect { result ->
                if (result is Result.Success) {
                    _uiState.update { it.copy(availableProfiles = result.data) }
                }
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

    // --- Fields Update ---
    fun onNameChange(v: String) {
        _uiState.update { it.copy(name = v) }
    }

    fun onDescriptionChange(v: String) {
        _uiState.update { it.copy(description = v) }
    }

    fun onDateSelected(v: Long) {
        _uiState.update { it.copy(date = v) }
    }

    fun onEventTypeChange(v: String) {
        _uiState.update { it.copy(eventType = v) }
    }

    fun onOutdoorChange(v: Boolean) {
        _uiState.update { it.copy(isOutdoor = v) }
    }

    fun onOnlineUrlChange(v: String) {
        _uiState.update { it.copy(onlineUrl = v) }
    }

    fun onLocationModeChange(mode: LocationMode) {
        _uiState.update { it.copy(locationMode = mode) }
    }

    fun onVenueSelected(venue: VenueResponse) {
        _uiState.update { it.copy(selectedVenue = venue) }
    }

    // --- Media Selection ---
    fun onBannerSelected(uri: Uri?) {
        _uiState.update { it.copy(bannerUri = uri) }
    }

    fun onThumbnailSelected(uri: Uri?) {
        _uiState.update { it.copy(thumbnailUri = uri) }
    }

    fun onVideoSelected(uri: Uri?) {
        _uiState.update { it.copy(videoUri = uri) }
    }

    // --- Categories & Tags Logic ---
    fun toggleCategory(category: String) {
        _uiState.update {
            val newSet = it.selectedCategories.toMutableSet()
            if (newSet.contains(category)) newSet.remove(category) else newSet.add(category)
            it.copy(selectedCategories = newSet)
        }
    }

    fun showCreateProfileDialog() {
        _uiState.update { it.copy(createProfileState = it.createProfileState.copy(isShowDialog = true)) }
    }

    fun hideCreateProfileDialog() {
        _uiState.update { it.copy(createProfileState = CreateProfileState()) } // Reset dialog state
    }

    fun onNewProfileNameChange(v: String) {
        _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newName = v)) }
    }

    fun onNewProfileBioChange(v: String) {
        _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newBio = v)) }
    }

    fun onNewProfileTypeChange(v: String) {
        _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newProfileType = v)) }
    }

    fun onNewGenresChange(v: String) {
        _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newGenresInput = v)) }
    }

    fun onNewProfileImageSelected(uri: Uri?) {
        _uiState.update { it.copy(createProfileState = it.createProfileState.copy(newImageUri = uri)) }
    }

    fun createNewProfile() {
        val pState = _uiState.value.createProfileState
        if (pState.newName.isBlank()) return

        viewModelScope.launch {
            _uiState.update { it.copy(createProfileState = it.createProfileState.copy(isCreating = true)) }

            // 1. Upload Image
            var imageUrl: String? = null
            if (pState.newImageUri != null) {
                val path = "${Constraints.PATH_UPLOADS}/profiles/${System.currentTimeMillis()}.jpg"
                val uploadRes = uploadImageUseCase(pState.newImageUri, path)
                if (uploadRes is Result.Success) imageUrl = uploadRes.data
            }

            // 2. Parse Genres (tách dấu phẩy)
            val genresList =
                pState.newGenresInput.split(",").map { it.trim() }.filter { it.isNotEmpty() }

            // 3. Call API
            val result = eventRepository.createFeaturedProfile(
                name = pState.newName,
                bio = pState.newBio,
                imageUrl = imageUrl,
                profileType = pState.newProfileType,
                genres = genresList
            )

            if (result is Result.Success) {
                val newProfile = result.data
                _uiState.update {
                    it.copy(
                        availableProfiles = it.availableProfiles + newProfile,
                        selectedProfileIds = it.selectedProfileIds + newProfile.id,
                        createProfileState = CreateProfileState() // Reset & Close
                    )
                }
            } else {
                _uiState.update { it.copy(createProfileState = it.createProfileState.copy(isCreating = false)) }
            }
        }
    }

    fun onTagInputChange(input: String) {
        // Nếu người dùng nhập dấu phẩy
        if (input.endsWith(",")) {
            val newTag = input.dropLast(1).trim()
            if (newTag.isNotEmpty()) {
                addTag(newTag)
            }
            _uiState.update { it.copy(currentTagInput = "") }
        } else {
            _uiState.update { it.copy(currentTagInput = input) }
        }
    }

    // Xử lý khi bấm Enter (ImeAction)
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

    // --- Custom Location Fields ---
    fun onVenueNameChange(v: String) {
        _uiState.update { it.copy(venueName = v) }
    }

    fun onStreetChange(v: String) {
        _uiState.update { it.copy(street = v) }
    }

    fun onProvinceSelected(province: Province) {
        _uiState.update {
            it.copy(
                selectedProvinceObj = province,
                selectedDistrictObj = null,
                selectedWardObj = null,
                districts = emptyList(),
                wards = emptyList(),
                city = province.name
            )
        }
        viewModelScope.launch {
            try {
                val res = addressApiService.getDistrictsByProvince(province.code)
                if (res.isSuccessful) _uiState.update { it.copy(districts = res.body()!!.districts) }
            } catch (e: Exception) {
            }
        }
    }

    fun onDistrictSelected(district: District) {
        _uiState.update {
            it.copy(
                selectedDistrictObj = district,
                selectedWardObj = null,
                wards = emptyList(),
                district = district.name
            )
        }
        viewModelScope.launch {
            try {
                val res = addressApiService.getWardsByDistrict(district.code)
                if (res.isSuccessful) _uiState.update { it.copy(wards = res.body()!!.wards) }
            } catch (e: Exception) {
            }
        }
    }

    fun onWardSelected(ward: Ward) {
        _uiState.update { it.copy(selectedWardObj = ward, ward = ward.name) }
    }

    // Update từ Map (Geocoding)
    fun onLocationSelected(lat: Double, lng: Double, street: String, ward: String, district: String, city: String) {
        // 1. Cập nhật State cơ bản
        _uiState.update {
            val finalStreet = street.ifBlank { it.street }

            // Tự động điền Venue Name nếu đang trống
            val autoVenueName = it.venueName.ifBlank { "$finalStreet, $district".trim(',',' ') }

            it.copy(
                lat = lat,
                lng = lng,
                street = finalStreet,
                // Cập nhật các trường Text hiển thị
                ward = ward,
                district = district,
                city = city,
                venueName = autoVenueName
            )
        }

        // 2. TRIGGER LOGIC LOAD DATA CHO DROPDOWN
        // Vì Dropdown phụ thuộc vào đối tượng selectedProvinceObj/selectedDistrictObj
        // Chúng ta cần tìm object tương ứng trong list provinces đã load

        val foundProvince = _uiState.value.provinces.find {
            // So sánh tên gần đúng (Bỏ 'Tỉnh', 'Thành phố', case insensitive)
            it.name.contains(city.replace(Regex("^(Tỉnh|Thành phố|TP\\.)\\s+"), ""), ignoreCase = true)
                    || city.contains(it.name.replace(Regex("^(Tỉnh|Thành phố|TP\\.)\\s+"), ""), ignoreCase = true)
        }

        if (foundProvince != null) {
            // Nếu tìm thấy Tỉnh, chọn nó và load Quận/Huyện
            onProvinceSelected(foundProvince)

            // Sau khi load quận huyện xong (trong coroutine), tiếp tục tìm Quận
            viewModelScope.launch {
                try {
                    val res = addressApiService.getDistrictsByProvince(foundProvince.code)
                    if (res.isSuccessful && res.body() != null) {
                        val districts = res.body()!!.districts
                        _uiState.update { it.copy(districts = districts) }

                        // Tìm Quận
                        val foundDistrict = districts.find {
                            it.name.contains(district.replace(Regex("^(Quận|Huyện|Thị xã|TP\\.)\\s+"), ""), ignoreCase = true)
                                    || district.contains(it.name.replace(Regex("^(Quận|Huyện|Thị xã|TP\\.)\\s+"), ""), ignoreCase = true)
                        }

                        if (foundDistrict != null) {
                            onDistrictSelected(foundDistrict)

                            // Tìm Phường/Xã
                            try {
                                val resWard = addressApiService.getWardsByDistrict(foundDistrict.code)
                                if (resWard.isSuccessful && resWard.body() != null) {
                                    val wards = resWard.body()!!.wards
                                    _uiState.update { it.copy(wards = wards) }

                                    val foundWard = wards.find {
                                        it.name.contains(ward.replace(Regex("^(Phường|Xã|Thị trấn)\\s+"), ""), ignoreCase = true)
                                                || ward.contains(it.name.replace(Regex("^(Phường|Xã|Thị trấn)\\s+"), ""), ignoreCase = true)
                                    }

                                    if (foundWard != null) {
                                        onWardSelected(foundWard)
                                    } else {
                                        // Nếu không tìm thấy object, vẫn giữ text hiển thị (nếu UI cho phép edit text)
                                        // Hoặc set selectedWardObj = null
                                    }
                                }
                            } catch (e: Exception) {}
                        }
                    }
                } catch (e: Exception) {}
            }
        }
    }

    // --- Tickets ---
    fun addTicketType() {
        ticketTypes.add(TicketTypeState())
    }

    fun removeTicketType(index: Int) {
        if (ticketTypes.size > 1) ticketTypes.removeAt(index)
    }

    fun updateTicket(index: Int, ticket: TicketTypeState) {
        ticketTypes[index] = ticket
    }

    // --- CREATE EVENT ---
    fun createEvent() {
        val state = _uiState.value

        // Validate Basic
        if (state.name.isBlank() || state.description.isBlank() || ticketTypes.isEmpty()) {
            _uiState.update { it.copy(error = "Vui lòng nhập Tên, Mô tả và ít nhất 1 loại vé.") }
            return
        }
        // Validate Media
        if ((state.bannerUri == null && state.bannerUrl.isEmpty()) || (state.thumbnailUri == null && state.thumbnailUrl.isEmpty())) {
            _uiState.update { it.copy(error = "Vui lòng chọn đầy đủ Ảnh bìa và Ảnh đại diện.") }
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
                else Result.Success("") // Video optional
            }

            val bannerRes = bannerDef.await()
            val thumbRes = thumbDef.await()
            val videoRes = videoDef.await()

            if (!bannerRes.isSuccess || !thumbRes.isSuccess) {
                _uiState.update { it.copy(isLoading = false, error = "Lỗi upload ảnh/video.") }
                return@launch
            }

            val finalBannerUrl = (bannerRes as Result.Success).data
            val finalThumbUrl = (thumbRes as Result.Success).data
            val finalVideoUrl = if (videoRes is Result.Success) videoRes.data else ""

            // 2. Prepare Data
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
                    addressDetails =
                        AddressDetailsRequest(state.street, state.ward, state.district, state.city)
                    locationCoords = LocationCoordinates(state.lat, state.lng)
                }
            }

            val request = CreateEventRequest(
                name = state.name,
                eventType = state.eventType,
                date = state.date,
                description = state.description,
                bannerUrl = finalBannerUrl,
                imageUrl = finalThumbUrl,
                videoUrl = finalVideoUrl, // URL video đã upload
                isOutdoor = state.isOutdoor,
                ticketTypes = ticketRequests,
                category = state.selectedCategories.toList(), // Gửi list category đã chọn
                tags = state.tags, // Gửi list tags đã nhập
                onlineUrl = if (state.eventType == "online") state.onlineUrl else null,
                venueId = venueId,
                venueName = venueName,
                location = locationCoords,
                addressDetails = addressDetails,
                featuredProfileIds = state.selectedProfileIds.toList(),
            )

            // 3. Call API
            val result = eventRepository.createEvent(request)
            if (result is Result.Success) {
                _uiState.update { it.copy(isLoading = false, isSuccess = true) }
            } else {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = (result as Result.Failure).exception.message
                    )
                }
            }
        }
    }

    fun resetState() {
        _uiState.value = CreateEventUiState()
        ticketTypes.clear(); ticketTypes.add(TicketTypeState())
        loadInitialData()
    }

    fun getFormattedDate(): String =
        SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date(_uiState.value.date))
}