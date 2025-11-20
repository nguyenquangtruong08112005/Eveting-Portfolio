package com.tdtuer.eventing.ui.screens.editprofile

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    viewModel: EditProfileViewModel = hiltViewModel(),
    navController: NavController? = null
) {
    val uiState by viewModel.uiState.collectAsState()
    val showDatePicker by viewModel.showDatePicker.collectAsState()

    // --- 1. Setup Image Pickers ---

    // Launcher cho Avatar
    val avatarLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        uri?.let { viewModel.onAvatarSelected(it) }
    }

    // Launcher cho Cover
    val coverLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? ->
        uri?.let { viewModel.onCoverSelected(it) }
    }

    // Date Picker
    val datePickerState = rememberDatePickerState(initialSelectedDateMillis = uiState.dateOfBirth)
    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { viewModel.onDatePickerDismiss() },
            confirmButton = {
                TextButton(onClick = { viewModel.onDateSelected(datePickerState.selectedDateMillis) }) {
                    Text("OK", color = AppTheme.colorScheme.primary)
                }
            },
            dismissButton = { TextButton(onClick = { viewModel.onDatePickerDismiss() }) { Text("Cancel") } }
        ) { DatePicker(state = datePickerState) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Profile", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController?.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = { viewModel.onSaveChangesClick { navController?.popBackStack() } },
                        enabled = !uiState.isLoading
                    ) {
                        Text("Done", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AppTheme.colorScheme.primary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppTheme.colorScheme.background)
            )
        },
        containerColor = AppTheme.colorScheme.background
    ) { innerPadding ->
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(innerPadding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = AppTheme.colorScheme.primary)
            }
        } else {
            Column(
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                // --- MEDIA EDIT SECTION ---
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(240.dp) // Tăng chiều cao để chứa avatar nổi
                ) {
                    // 1. COVER PHOTO
                    AsyncImage(
                        model = uiState.coverUrl.ifEmpty { R.drawable.group_34057 },
                        contentDescription = "Cover",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                            .background(Color.LightGray)
                            .clickable {
                                coverLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            },
                        contentScale = ContentScale.Crop
                    )

                    // Nút Edit Cover (Góc phải trên)
                    IconButton(
                        onClick = {
                            coverLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        },
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(16.dp)
                            .background(Color.Black.copy(0.4f), CircleShape)
                    ) {
                        Icon(Icons.Default.Edit, "Edit Cover", tint = Color.White)
                    }

                    // 2. AVATAR
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .offset(y = (-10).dp) // Đẩy lên một chút
                    ) {
                        AsyncImage(
                            model = uiState.avatarUrl,
                            contentDescription = "Avatar",
                            modifier = Modifier
                                .size(110.dp)
                                .clip(CircleShape)
                                .border(4.dp, AppTheme.colorScheme.background, CircleShape)
                                .clickable {
                                    avatarLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                },
                            contentScale = ContentScale.Crop,
                            placeholder = painterResource(R.drawable.default_pfp),
                            error = painterResource(R.drawable.default_pfp)
                        )

                        // Nút Edit Avatar (Nhỏ, góc dưới phải của avatar)
                        IconButton(
                            onClick = {
                                avatarLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                            },
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .offset(x = 4.dp, y = 4.dp)
                                .clip(CircleShape)
                                .background(AppTheme.colorScheme.primary)
                                .size(32.dp)
                        ) {
                            Icon(Icons.Default.CameraAlt, "Edit Avatar", tint = Color.White, modifier = Modifier.size(16.dp))
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // --- FORM FIELDS ---
                Column(
                    modifier = Modifier.padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    EditProfileField(
                        value = uiState.fullName,
                        onValueChange = viewModel::onFullNameChange,
                        label = "Full Name",
                        icon = Icons.Default.Person
                    )

                    EditProfileField(
                        value = uiState.bio,
                        onValueChange = viewModel::onBioChange,
                        label = "Bio",
                        icon = Icons.Default.Info,
                        singleLine = false,
                        maxLines = 4
                    )

                    OutlinedTextField(
                        value = uiState.dateOfBirthString,
                        onValueChange = {},
                        label = { Text("Date of Birth") },
                        readOnly = true,
                        trailingIcon = {
                            IconButton(onClick = { viewModel.onDateOfBirthClick() }) {
                                Icon(Icons.Default.CalendarToday, null, tint = Color.Gray)
                            }
                        },
                        modifier = Modifier.fillMaxWidth().clickable { viewModel.onDateOfBirthClick() },
                        shape = RoundedCornerShape(12.dp),
                        enabled = false, // Visual trick: keep look disabled but clickable via modifier
                        colors = OutlinedTextFieldDefaults.colors(
                            disabledTextColor = MaterialTheme.colorScheme.onSurface,
                            disabledBorderColor = Color.LightGray,
                            disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            disabledTrailingIconColor = Color.Gray
                        )
                    )

                    EditProfileField(
                        value = uiState.location,
                        onValueChange = viewModel::onLocationChange,
                        label = "Location",
                        icon = Icons.Default.LocationOn
                    )

                    EditProfileField(
                        value = uiState.interestedEvents,
                        onValueChange = viewModel::onInterestsChange,
                        label = "Interests (Ex: Music, Art...)",
                        icon = Icons.Default.FavoriteBorder,
                        singleLine = false,
                        maxLines = 2
                    )

                    Spacer(modifier = Modifier.height(40.dp))
                }
            }
        }
    }
}

@Composable
fun EditProfileField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    singleLine: Boolean = true,
    maxLines: Int = 1
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        leadingIcon = { Icon(icon, null, tint = Color.Gray) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        singleLine = singleLine,
        maxLines = maxLines,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = AppTheme.colorScheme.primary,
            unfocusedBorderColor = Color.LightGray,
            focusedLabelColor = AppTheme.colorScheme.primary,
            cursorColor = AppTheme.colorScheme.primary
        )
    )
}