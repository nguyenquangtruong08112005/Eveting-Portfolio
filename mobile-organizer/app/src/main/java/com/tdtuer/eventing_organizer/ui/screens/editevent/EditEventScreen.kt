package com.tdtuer.eventing_organizer.ui.screens.editevent

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Landscape
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Portrait
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.InputChip
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing_organizer.R
import com.tdtuer.eventing_organizer.data.network.model.FeaturedProfileDto
import com.tdtuer.eventing_organizer.ui.model.LocationResult
import com.tdtuer.eventing_organizer.ui.navigation.Screen
import com.tdtuer.eventing_organizer.ui.screens.createevent.LocationMode
import com.tdtuer.eventing_organizer.ui.screens.createevent.TicketTypeState
import com.tdtuer.eventing_organizer.ui.theme.AppTheme
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun EditEventScreen(
    navController: NavController,
    viewModel: EditEventViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var viewingProfile by remember { mutableStateOf<FeaturedProfileDto?>(null) }

    // --- Date Picker ---
    val calendar = Calendar.getInstance().apply { timeInMillis = uiState.date }
    val datePickerDialog = android.app.DatePickerDialog(
        context,
        { _, y, m, d ->
            android.app.TimePickerDialog(context, { _, h, min ->
                calendar.set(y, m, d, h, min)
                viewModel.onDateSelected(calendar.timeInMillis)
            }, calendar.get(Calendar.HOUR_OF_DAY), calendar.get(Calendar.MINUTE), true).show()
        },
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH),
        calendar.get(Calendar.DAY_OF_MONTH)
    )

    // --- Launchers ---
    val bannerLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) {
            viewModel.onBannerSelected(it)
        }
    val thumbLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) {
            viewModel.onThumbnailSelected(it)
        }
    val videoLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) {
            viewModel.onVideoSelected(it)
        }
    val profileImageLauncher =
        rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) {
            viewModel.onNewProfileImageSelected(it)
        }

    // --- Effects ---
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            Toast.makeText(context, "Cập nhật thành công!", Toast.LENGTH_LONG).show()
            navController.popBackStack()
        }
    }
    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            Toast.makeText(
                context,
                it,
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    // --- Map Result ---
    val savedStateHandle =
        remember(navController.currentBackStackEntry) { navController.currentBackStackEntry?.savedStateHandle }
    if (savedStateHandle != null) {
        val locResult by savedStateHandle.getLiveData<LocationResult>("location_data")
            .observeAsState()
        LaunchedEffect(locResult) {
            locResult?.let {
                viewModel.onLocationSelected(
                    it.lat,
                    it.lng,
                    it.street,
                    it.ward,
                    it.district,
                    it.city
                )
                savedStateHandle.remove<LocationResult>("location_data")
            }
        }
    }

    // --- DIALOG XEM CHI TIẾT PROFILE ---
    if (viewingProfile != null) {
        val p = viewingProfile!!
        AlertDialog(
            onDismissRequest = { viewingProfile = null },
            title = { Text(p.name, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    AsyncImage(
                        model = p.imageUrl ?: R.drawable.default_pfp,
                        contentDescription = null,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .clip(RoundedCornerShape(12.dp)),
                        contentScale = ContentScale.Crop
                    )
                    Text(
                        "Vai trò: ${p.profileType?.uppercase() ?: "ARTIST"}",
                        color = AppTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                    if (!p.genres.isNullOrEmpty()) Text(
                        "Thể loại: ${p.genres.joinToString(", ")}",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                    if (p.followerCount != null && p.followerCount > 0) Text(
                        "Followers: ${p.followerCount}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                    if (!p.bio.isNullOrBlank()) {
                        HorizontalDivider()
                        Text(p.bio, fontSize = 14.sp, lineHeight = 20.sp)
                    }
                }
            },
            confirmButton = { TextButton(onClick = { viewingProfile = null }) { Text("Đóng") } }
        )
    }

    // --- DIALOG TẠO PROFILE MỚI ---
    if (uiState.createProfileState.isShowDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.hideCreateProfileDialog() },
            title = { Text("Thêm Khách Mời / Nghệ Sĩ") },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(Color.LightGray)
                            .clickable {
                                profileImageLauncher.launch(
                                    PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                )
                            }
                            .align(Alignment.CenterHorizontally),
                        contentAlignment = Alignment.Center
                    ) {
                        if (uiState.createProfileState.newImageUri != null) AsyncImage(
                            model = uiState.createProfileState.newImageUri,
                            contentDescription = null,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop
                        )
                        else Icon(Icons.Default.AddAPhoto, null, tint = Color.White)
                    }
                    OutlinedTextField(
                        value = uiState.createProfileState.newName,
                        onValueChange = viewModel::onNewProfileNameChange,
                        label = { Text("Tên hiển thị (Bắt buộc)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text("Vai trò:", fontSize = 12.sp, color = Color.Gray)
                    val types = listOf("Artist", "Speaker", "Host", "Guest")
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        types.forEach { type ->
                            FilterChip(
                                selected = uiState.createProfileState.newProfileType.equals(
                                    type,
                                    ignoreCase = true
                                ),
                                onClick = { viewModel.onNewProfileTypeChange(type.lowercase()) },
                                label = { Text(type) }
                            )
                        }
                    }
                    OutlinedTextField(
                        value = uiState.createProfileState.newGenresInput,
                        onValueChange = viewModel::onNewGenresChange,
                        label = { Text("Thể loại (Nhạc/Chủ đề)") },
                        placeholder = { Text("Pop, Ballad, AI...") },
                        supportingText = { Text("Ngăn cách bằng dấu phẩy") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = uiState.createProfileState.newBio,
                        onValueChange = viewModel::onNewProfileBioChange,
                        label = { Text("Giới thiệu (Bio)") },
                        maxLines = 4,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.createNewProfile() },
                    enabled = !uiState.createProfileState.isCreating && uiState.createProfileState.newName.isNotBlank()
                ) {
                    if (uiState.createProfileState.isCreating) CircularProgressIndicator(
                        modifier = Modifier.size(
                            20.dp
                        ), color = Color.White
                    ) else Text("Tạo Mới")
                }
            },
            dismissButton = { TextButton(onClick = { viewModel.hideCreateProfileDialog() }) { Text("Hủy") } }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chỉnh Sửa Sự Kiện", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            "Back"
                        )
                    }
                }
            )
        },
        bottomBar = {
            Button(
                onClick = { viewModel.onSaveChangesClick() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppTheme.colorScheme.primary),
                enabled = !uiState.isLoading
            ) {
                if (uiState.isLoading) CircularProgressIndicator(color = Color.White) else Text(
                    "LƯU THAY ĐỔI",
                    fontWeight = FontWeight.Bold
                )
            }
        }
    ) { padding ->
        if (uiState.isLoading && uiState.name.isEmpty()) {
            Box(
                Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) { CircularProgressIndicator() }
        } else {
            LazyColumn(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // 1. MEDIA
                item {
                    Text("Media", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        MediaUploadBox(
                            uri = uiState.thumbnailUri,
                            imageUrl = uiState.thumbnailUrl, // Hiển thị ảnh cũ nếu có
                            label = "Thumbnail\n(Dọc)", icon = Icons.Default.Portrait,
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(0.7f),
                            onClick = {
                                thumbLauncher.launch(
                                    PickVisualMediaRequest(
                                        ActivityResultContracts.PickVisualMedia.ImageOnly
                                    )
                                )
                            }
                        )
                        Column(
                            modifier = Modifier.weight(1.5f),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            MediaUploadBox(
                                uri = uiState.bannerUri,
                                imageUrl = uiState.bannerUrl, // Hiển thị ảnh cũ nếu có
                                label = "Banner (Ngang)", icon = Icons.Default.Landscape,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(1.8f),
                                onClick = {
                                    bannerLauncher.launch(
                                        PickVisualMediaRequest(
                                            ActivityResultContracts.PickVisualMedia.ImageOnly
                                        )
                                    )
                                }
                            )
                            MediaUploadBox(
                                uri = uiState.videoUri,
                                imageUrl = null, // Không preview video thumbnail phức tạp ở đây
                                label = "Video Intro\n(Optional)",
                                icon = Icons.Default.VideoLibrary,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(80.dp),
                                onClick = {
                                    videoLauncher.launch(
                                        PickVisualMediaRequest(
                                            ActivityResultContracts.PickVisualMedia.VideoOnly
                                        )
                                    )
                                }
                            )
                        }
                    }
                }

                // 2. INFO
                item {
                    SectionTitle("Thông tin cơ bản")
                    OutlinedTextField(
                        value = uiState.name,
                        onValueChange = viewModel::onNameChange,
                        label = { Text("Tên sự kiện") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = viewModel.getFormattedDate(),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Thời gian") },
                        trailingIcon = { Icon(Icons.Default.CalendarToday, null) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { datePickerDialog.show() },
                        enabled = false,
                        colors = OutlinedTextFieldDefaults.colors(
                            disabledTextColor = Color.Black,
                            disabledBorderColor = Color.Gray
                        )
                    )
                    OutlinedTextField(
                        value = uiState.description,
                        onValueChange = viewModel::onDescriptionChange,
                        label = { Text("Mô tả chi tiết") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3
                    )
                }

                // 3. CATEGORIES & TAGS
                item {
                    SectionTitle("Phân loại & Tags")
                    Text("Thể loại (Chọn nhiều)", fontSize = 12.sp, color = Color.Gray)
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        viewModel.predefinedCategories.forEach { cat ->
                            FilterChip(
                                selected = uiState.selectedCategories.contains(cat),
                                onClick = { viewModel.toggleCategory(cat) },
                                label = { Text(cat) })
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Tags (Nhập và gõ dấu phẩy ',' để thêm)",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    OutlinedTextField(
                        value = uiState.currentTagInput,
                        onValueChange = viewModel::onTagInputChange,
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("VD: music, live, hcm...") },
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { viewModel.onTagInputDone() })
                    )
                    if (uiState.tags.isNotEmpty()) {
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(top = 8.dp)
                        ) {
                            uiState.tags.forEach { tag ->
                                InputChip(
                                    selected = true,
                                    onClick = { },
                                    label = { Text(tag) },
                                    trailingIcon = {
                                        Icon(
                                            Icons.Default.Close,
                                            null,
                                            Modifier
                                                .clickable { viewModel.removeTag(tag) }
                                                .size(16.dp)
                                        )
                                    })
                            }
                        }
                    }
                }

                // 4. LOCATION & TYPE
                item {
                    SectionTitle("Địa điểm & Loại hình")
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(
                            selected = uiState.eventType == "physical",
                            onClick = { viewModel.onEventTypeChange("physical") })
                        Text("Offline")
                        Spacer(modifier = Modifier.width(16.dp))
                        RadioButton(
                            selected = uiState.eventType == "online",
                            onClick = { viewModel.onEventTypeChange("online") })
                        Text("Online")
                    }
                }

                if (uiState.eventType == "online") {
                    item {
                        OutlinedTextField(
                            value = uiState.onlineUrl,
                            onValueChange = viewModel::onOnlineUrlChange,
                            label = { Text("Link Online (Zoom/Meet)") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                } else {
                    item {
                        TabRow(selectedTabIndex = if (uiState.locationMode == LocationMode.EXISTING_VENUE) 0 else 1) {
                            Tab(
                                selected = uiState.locationMode == LocationMode.EXISTING_VENUE,
                                onClick = { viewModel.onLocationModeChange(LocationMode.EXISTING_VENUE) },
                                text = { Text("Có sẵn") })
                            Tab(
                                selected = uiState.locationMode == LocationMode.CUSTOM_LOCATION,
                                onClick = { viewModel.onLocationModeChange(LocationMode.CUSTOM_LOCATION) },
                                text = { Text("Tự nhập") })
                        }
                    }
                    if (uiState.locationMode == LocationMode.EXISTING_VENUE) {
                        item {
                            var expanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(
                                expanded = expanded,
                                onExpandedChange = { expanded = it }) {
                                OutlinedTextField(
                                    value = uiState.selectedVenue?.name
                                        ?: uiState.venueName, // Hiển thị tên venue
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Chọn từ danh sách") },
                                    trailingIcon = {
                                        ExposedDropdownMenuDefaults.TrailingIcon(
                                            expanded = expanded
                                        )
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .menuAnchor()
                                )
                                ExposedDropdownMenu(
                                    expanded = expanded,
                                    onDismissRequest = { expanded = false }) {
                                    uiState.availableVenues.forEach { venue ->
                                        DropdownMenuItem(
                                            text = {
                                                Text(
                                                    venue.name ?: ""
                                                )
                                            },
                                            onClick = {
                                                viewModel.onVenueSelected(venue); expanded = false
                                            })
                                    }
                                }
                            }
                        }
                    } else {
                        item {
                            OutlinedButton(
                                onClick = { navController.navigate(Screen.LocationPicker.route) },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(
                                    Icons.Default.LocationOn,
                                    null
                                ); Spacer(Modifier.width(8.dp)); Text("Chọn trên bản đồ")
                            }
                            Spacer(modifier = Modifier.height(8.dp))

                            AddressDropdown(
                                label = "Tỉnh / Thành phố",
                                items = uiState.provinces,
                                selectedItem = uiState.selectedProvinceObj,
                                textValue = uiState.city,
                                itemLabel = { it.name ?: "" },
                                onItemSelected = viewModel::onProvinceSelected
                            )

                            AddressDropdown(
                                label = "Quận / Huyện",
                                items = uiState.districts,
                                selectedItem = uiState.selectedDistrictObj,
                                textValue = uiState.district,
                                itemLabel = { it.name ?: "" },
                                onItemSelected = viewModel::onDistrictSelected,
                                enabled = uiState.selectedProvinceObj != null || uiState.city.isNotEmpty()
                            )

                            AddressDropdown(
                                label = "Phường / Xã",
                                items = uiState.wards,
                                selectedItem = uiState.selectedWardObj,
                                textValue = uiState.ward,
                                itemLabel = { it.name ?: "" },
                                onItemSelected = viewModel::onWardSelected,
                                enabled = uiState.selectedDistrictObj != null || uiState.district.isNotEmpty()
                            )

                            OutlinedTextField(
                                value = uiState.street,
                                onValueChange = viewModel::onStreetChange,
                                label = { Text("Số nhà, Tên đường") },
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = uiState.venueName,
                                onValueChange = viewModel::onVenueNameChange,
                                label = { Text("Tên địa điểm (Bắt buộc)") },
                                modifier = Modifier.fillMaxWidth()
                            )

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Checkbox(
                                    checked = uiState.isOutdoor,
                                    onCheckedChange = viewModel::onOutdoorChange
                                ); Text("Ngoài trời?")
                            }
                        }
                    }
                }

                // 5. FEATURED PROFILES
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SectionTitle("Khách mời & Nghệ sĩ")
                        TextButton(onClick = { viewModel.showCreateProfileDialog() }) {
                            Icon(
                                Icons.Default.Add,
                                null,
                                modifier = Modifier.size(16.dp)
                            ); Spacer(Modifier.width(4.dp)); Text("Tạo mới")
                        }
                    }
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(vertical = 8.dp)
                    ) {
                        items(uiState.availableProfiles) { profile ->
                            ProfileSelectionCard(
                                profile = profile,
                                isSelected = uiState.selectedProfileIds.contains(profile.id),
                                onClick = { viewModel.toggleProfileSelection(profile.id) },
                                onInfoClick = { viewingProfile = profile })
                        }
                    }
                }

                // 6. TICKETS
                item {
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        SectionTitle("Loại vé"); TextButton(onClick = { viewModel.addTicketType() }) {
                        Icon(
                            Icons.Default.Add,
                            null
                        ); Text("Thêm vé")
                    }
                    }
                }
                items(viewModel.ticketTypes.size) { index ->
                    TicketTypeInputCard(
                        state = viewModel.ticketTypes[index],
                        onUpdate = { viewModel.updateTicket(index, it) },
                        onRemove = { viewModel.removeTicketType(index) },
                        canRemove = viewModel.ticketTypes.size > 1
                    )
                }
                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

// --- REUSED COMPOSABLES ---

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun <T> AddressDropdown(
    label: String,
    items: List<T>,
    selectedItem: T?,
    textValue: String = "",
    itemLabel: (T) -> String,
    onItemSelected: (T) -> Unit,
    enabled: Boolean = true
) {
    var expanded by remember { mutableStateOf(false) }
    val displayText = selectedItem?.let { itemLabel(it) } ?: textValue

    ExposedDropdownMenuBox(
        expanded = expanded && enabled,
        onExpandedChange = { if (enabled) expanded = !expanded }) {
        OutlinedTextField(
            value = displayText,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(),
            enabled = enabled
        )
        ExposedDropdownMenu(
            expanded = expanded && enabled,
            onDismissRequest = { expanded = false },
            modifier = Modifier.heightIn(max = 250.dp)
        ) {
            items.forEach { item ->
                DropdownMenuItem(
                    text = { Text(itemLabel(item)) },
                    onClick = { onItemSelected(item); expanded = false })
            }
        }
    }
    Spacer(modifier = Modifier.height(8.dp))
}

@Composable
fun MediaUploadBox(
    uri: Uri?,
    imageUrl: String? = null,
    label: String,
    icon: ImageVector,
    modifier: Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color.LightGray.copy(alpha = 0.3f))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (uri != null) {
            AsyncImage(
                model = uri,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else if (!imageUrl.isNullOrEmpty()) {
            AsyncImage(
                model = imageUrl,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    icon,
                    null,
                    tint = Color.Gray
                ); Text(
                label,
                color = Color.Gray,
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
                lineHeight = 14.sp
            )
            }
        }
    }
}

@Composable
fun TicketTypeInputCard(
    state: TicketTypeState,
    onUpdate: (TicketTypeState) -> Unit,
    onRemove: () -> Unit,
    canRemove: Boolean
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        border = BorderStroke(1.dp, Color.LightGray),
        colors = CardDefaults.cardColors(containerColor = AppTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Loại vé", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (canRemove) IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Default.Delete,
                        null,
                        tint = Color.Red
                    )
                }
            }
            OutlinedTextField(
                value = state.name,
                onValueChange = { onUpdate(state.copy(name = it)) },
                label = { Text("Tên vé") },
                modifier = Modifier.fillMaxWidth()
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = state.price,
                    onValueChange = { onUpdate(state.copy(price = it)) },
                    label = { Text("Giá") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = state.quantity,
                    onValueChange = { onUpdate(state.copy(quantity = it)) },
                    label = { Text("Số lượng") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
fun SectionTitle(text: String) {
    Text(text, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = AppTheme.colorScheme.primary)
}

@Composable
fun ProfileSelectionCard(
    profile: FeaturedProfileDto,
    isSelected: Boolean,
    onClick: () -> Unit,
    onInfoClick: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(containerColor = if (isSelected) AppTheme.extendedColors.onSuccess else Color.White),
        border = if (isSelected) BorderStroke(2.dp, AppTheme.colorScheme.outline) else BorderStroke(
            1.dp,
            Color.LightGray
        ),
        modifier = Modifier.width(110.dp)
    ) {
        Box {
            IconButton(
                onClick = onInfoClick,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .size(24.dp)
                    .padding(4.dp)
            ) { Icon(Icons.Outlined.Info, "Info", tint = Color.Gray) }
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .padding(8.dp)
                    .fillMaxWidth()
                    .clickable { onClick() }) {
                AsyncImage(
                    model = profile.imageUrl ?: R.drawable.default_pfp,
                    contentDescription = null,
                    modifier = Modifier
                        .size(60.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop,
                    placeholder = painterResource(R.drawable.default_pfp),
                    error = painterResource(R.drawable.default_pfp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = profile.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
                Text(text = profile.profileType?.replaceFirstChar { it.uppercase() } ?: "Artist",
                    fontSize = 10.sp,
                    color = Color.Gray,
                    maxLines = 1)
            }
        }
    }
}