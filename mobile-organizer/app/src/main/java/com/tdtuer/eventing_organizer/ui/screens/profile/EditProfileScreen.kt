package com.tdtuer.eventing_organizer.ui.screens.editprofile

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Numbers
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.tdtuer.eventing_organizer.R
import com.tdtuer.eventing_organizer.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    viewModel: EditProfileViewModel = hiltViewModel(),
    navController: NavController? = null
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Upload Launcher
    val avatarLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri: Uri? -> uri?.let { viewModel.onAvatarSelected(it) } }

    // Error handling
    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let { Toast.makeText(context, it, Toast.LENGTH_SHORT).show() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chỉnh sửa Hồ sơ", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController?.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    TextButton(onClick = { viewModel.onSaveChangesClick { navController?.popBackStack() } }) {
                        Text("LƯU", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = AppTheme.colorScheme.primary)
                    }
                }
            )
        }
    ) { innerPadding ->
        if (uiState.isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .padding(innerPadding)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Avatar Edit
                Box(modifier = Modifier.clickable { avatarLauncher.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) {
                    AsyncImage(
                        model = uiState.avatarUrl.ifEmpty { R.drawable.default_pfp },
                        contentDescription = "Avatar",
                        modifier = Modifier.size(120.dp).clip(CircleShape).background(Color.LightGray),
                        contentScale = ContentScale.Crop
                    )
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .clip(CircleShape)
                            .background(AppTheme.colorScheme.primary)
                            .padding(6.dp)
                    ) {
                        Icon(Icons.Default.Edit, null, tint = Color.White, modifier = Modifier.size(16.dp))
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Form Fields
                // Note: Name có thể readonly hoặc editable tùy backend, ở đây cho phép sửa Company Name
                OutlinedTextField(
                    value = uiState.companyName,
                    onValueChange = viewModel::onCompanyNameChange,
                    label = { Text("Tên doanh nghiệp") },
                    leadingIcon = { Icon(Icons.Default.Business, null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = uiState.taxCode,
                    onValueChange = viewModel::onTaxCodeChange,
                    label = { Text("Mã số thuế") },
                    leadingIcon = { Icon(Icons.Default.Numbers, null) }, // Hoặc icon khác
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = uiState.website,
                    onValueChange = viewModel::onWebsiteChange,
                    label = { Text("Website") },
                    leadingIcon = { Icon(Icons.Default.Language, null) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                OutlinedTextField(
                    value = uiState.description,
                    onValueChange = viewModel::onDescriptionChange,
                    label = { Text("Giới thiệu") },
                    leadingIcon = { Icon(Icons.Default.Description, null) },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 4
                )
            }
        }
    }
}