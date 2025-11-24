package com.tdtuer.eventing_organizer.ui.screens.createevent

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing_organizer.constants.Constraints
import com.tdtuer.eventing_organizer.ui.navigation.Screen
import com.tdtuer.eventing_organizer.ui.model.LocationResult // Import đúng model
import com.tdtuer.eventing_organizer.ui.theme.AppTheme
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateEventScreen(
    navController: NavController,
    viewModel: CreateEventViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Date Picker
    val calendar = Calendar.getInstance().apply { timeInMillis = uiState.date }
    val datePickerDialog = android.app.DatePickerDialog(
        context,
        { _, year, month, dayOfMonth ->
            android.app.TimePickerDialog(
                context,
                { _, hourOfDay, minute ->
                    calendar.set(year, month, dayOfMonth, hourOfDay, minute)
                    viewModel.onDateSelected(calendar.timeInMillis)
                },
                calendar.get(Calendar.HOUR_OF_DAY), calendar.get(Calendar.MINUTE), true
            ).show()
        },
        calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)
    )

    // Image Pickers
    val bannerLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { viewModel.onBannerSelected(it) }
    val thumbnailLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { viewModel.onThumbnailSelected(it) }

    // Success/Error Handler
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            Toast.makeText(context, "Tạo sự kiện thành công!", Toast.LENGTH_LONG).show()
            navController.popBackStack()
            viewModel.resetState()
        }
    }
    LaunchedEffect(uiState.error) { uiState.error?.let { Toast.makeText(context, it, Toast.LENGTH_SHORT).show() } }

    // Location Result Handling
    val currentBackStackEntry = navController.currentBackStackEntry
    val savedStateHandle = remember(currentBackStackEntry) { currentBackStackEntry?.savedStateHandle }

    if (savedStateHandle != null) {
        val locationResultState = savedStateHandle.getLiveData<LocationResult>("location_data").observeAsState()
        val locationResult = locationResultState.value

        LaunchedEffect(locationResult) {
            locationResult?.let { result ->
                viewModel.onLocationSelected(
                    result.lat, result.lng,
                    result.street, result.ward, result.district, result.city
                )
                savedStateHandle.remove<LocationResult>("location_data")
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tạo Sự Kiện", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppTheme.colorScheme.background)
            )
        },
        bottomBar = {
            Button(
                onClick = { viewModel.createEvent() },
                modifier = Modifier.fillMaxWidth().padding(16.dp).height(56.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = AppTheme.colorScheme.primary),
                enabled = !uiState.isLoading
            ) {
                if (uiState.isLoading) CircularProgressIndicator(color = Color.White) else Text("ĐĂNG SỰ KIỆN", fontWeight = FontWeight.Bold)
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding).fillMaxSize().padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Images
            item {
                Text("Hình ảnh sự kiện", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ImageUploadBox(
                        uri = uiState.thumbnailUri, label = "Thumbnail (Dọc)", modifier = Modifier.weight(1f).aspectRatio(0.7f),
                        onClick = { thumbnailLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
                    )
                    ImageUploadBox(
                        uri = uiState.bannerUri, label = "Banner (Ngang)", modifier = Modifier.weight(1.5f).aspectRatio(1.5f),
                        onClick = { bannerLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
                    )
                }
            }

            // 2. Info
            item {
                SectionTitle("Thông tin chung")
                OutlinedTextField(value = uiState.name, onValueChange = viewModel::onNameChange, label = { Text("Tên sự kiện") }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    value = viewModel.getFormattedDate(), onValueChange = {}, readOnly = true, label = { Text("Thời gian") },
                    trailingIcon = { Icon(Icons.Default.CalendarToday, null) },
                    modifier = Modifier.fillMaxWidth().clickable { datePickerDialog.show() }, enabled = false,
                    colors = OutlinedTextFieldDefaults.colors(disabledTextColor = Color.Black, disabledBorderColor = Color.Gray)
                )
                OutlinedTextField(value = uiState.description, onValueChange = viewModel::onDescriptionChange, label = { Text("Mô tả") }, modifier = Modifier.fillMaxWidth(), minLines = 3)
                OutlinedTextField(value = uiState.videoUrl, onValueChange = viewModel::onVideoUrlChange, label = { Text("Video URL (Optional)") }, modifier = Modifier.fillMaxWidth())
            }

            // 3. Location
            item {
                SectionTitle("Địa điểm & Loại hình")
                Row {
                    RadioButton(selected = uiState.eventType == "physical", onClick = { viewModel.onEventTypeChange("physical") })
                    Text("Offline", modifier = Modifier.align(Alignment.CenterVertically))
                    Spacer(modifier = Modifier.width(16.dp))
                    RadioButton(selected = uiState.eventType == "online", onClick = { viewModel.onEventTypeChange("online") })
                    Text("Online", modifier = Modifier.align(Alignment.CenterVertically))
                }
            }

            if (uiState.eventType == "online") {
                item {
                    OutlinedTextField(value = uiState.onlineUrl, onValueChange = viewModel::onOnlineUrlChange, label = { Text("Link Online") }, modifier = Modifier.fillMaxWidth())
                }
            } else {
                item {
                    TabRow(selectedTabIndex = if (uiState.locationMode == LocationMode.EXISTING_VENUE) 0 else 1) {
                        Tab(selected = uiState.locationMode == LocationMode.EXISTING_VENUE, onClick = { viewModel.onLocationModeChange(LocationMode.EXISTING_VENUE) }, text = { Text("Có sẵn") })
                        Tab(selected = uiState.locationMode == LocationMode.CUSTOM_LOCATION, onClick = { viewModel.onLocationModeChange(LocationMode.CUSTOM_LOCATION) }, text = { Text("Tự nhập") })
                    }
                }

                if (uiState.locationMode == LocationMode.EXISTING_VENUE) {
                    item {
                        var expanded by remember { mutableStateOf(false) }
                        ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                            OutlinedTextField(
                                value = uiState.selectedVenue?.name ?: "", onValueChange = {}, readOnly = true, label = { Text("Chọn địa điểm") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) }, modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                uiState.availableVenues.forEach { venue ->
                                    DropdownMenuItem(text = { Text(venue.name) }, onClick = { viewModel.onVenueSelected(venue); expanded = false })
                                }
                            }
                        }
                    }
                } else {
                    item {
                        OutlinedButton(onClick = { navController.navigate(Screen.LocationPicker.route) }, modifier = Modifier.fillMaxWidth()) {
                            Icon(Icons.Default.LocationOn, null); Text("Chọn trên bản đồ")
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(value = uiState.venueName, onValueChange = viewModel::onVenueNameChange, label = { Text("Tên địa điểm") }, modifier = Modifier.fillMaxWidth())
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            // City Dropdown
                            var isCityExpanded by remember { mutableStateOf(false) }
                            ExposedDropdownMenuBox(
                                expanded = isCityExpanded,
                                onExpandedChange = { isCityExpanded = it },
                                modifier = Modifier.weight(1f)
                            ) {
                                OutlinedTextField(
                                    value = uiState.city, onValueChange = {}, readOnly = true, label = { Text("Tỉnh/Thành") },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isCityExpanded) },
                                    modifier = Modifier.menuAnchor()
                                )
                                ExposedDropdownMenu(expanded = isCityExpanded, onDismissRequest = { isCityExpanded = false }, modifier = Modifier.heightIn(max = 250.dp)) {
                                    Constraints.vietnameseProvinces.forEach { province ->
                                        DropdownMenuItem(text = { Text(province) }, onClick = { viewModel.onCityChange(province); isCityExpanded = false })
                                    }
                                }
                            }
                            OutlinedTextField(value = uiState.district, onValueChange = viewModel::onDistrictChange, label = { Text("Quận") }, modifier = Modifier.weight(1f))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(value = uiState.ward, onValueChange = viewModel::onWardChange, label = { Text("Phường") }, modifier = Modifier.weight(1f))
                            OutlinedTextField(value = uiState.street, onValueChange = viewModel::onStreetChange, label = { Text("Đường") }, modifier = Modifier.weight(1f))
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(checked = uiState.isOutdoor, onCheckedChange = viewModel::onOutdoorChange)
                            Text("Ngoài trời?")
                        }
                    }
                }
            }

            // 4. Tickets
            item {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    SectionTitle("Các loại vé")
                    TextButton(onClick = { viewModel.addTicketType() }) { Icon(Icons.Default.Add, null); Text("Thêm") }
                }
            }
            items(viewModel.ticketTypes.size) { index ->
                TicketTypeInputCard(viewModel.ticketTypes[index], { viewModel.removeTicketType(index) }, viewModel.ticketTypes.size > 1)
            }
            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}

@Composable
fun ImageUploadBox(uri: Uri?, label: String, modifier: Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier.clip(RoundedCornerShape(12.dp)).background(Color.LightGray.copy(alpha = 0.3f)).clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        if (uri != null) {
            AsyncImage(model = uri, contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Image, null, tint = Color.Gray)
                Text(label, color = Color.Gray, fontSize = 12.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }
    }
}

@Composable
fun TicketTypeInputCard(ticketState: TicketTypeState, onRemove: () -> Unit, canRemove: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White), elevation = CardDefaults.cardElevation(2.dp),
        border = BorderStroke(1.dp, Color.LightGray.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Loại vé", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                if (canRemove) IconButton(onClick = onRemove) { Icon(Icons.Default.Delete, null, tint = Color.Red) }
            }
            OutlinedTextField(value = ticketState.name, onValueChange = { ticketState.name = it }, label = { Text("Tên vé (VD: VIP)") }, modifier = Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(value = ticketState.price, onValueChange = { ticketState.price = it }, label = { Text("Giá") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f))
                OutlinedTextField(value = ticketState.quantity, onValueChange = { ticketState.quantity = it }, label = { Text("Số lượng") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
fun SectionTitle(text: String) {
    Text(text, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = AppTheme.colorScheme.primary)
}