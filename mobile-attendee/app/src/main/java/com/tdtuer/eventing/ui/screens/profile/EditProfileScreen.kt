 package com.tdtuer.eventing.ui.screens.editprofile

import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your drawable resources
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(viewModel: EditProfileViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Profile", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackClick() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .fillMaxSize()
        ) {
            LazyColumn(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                item { Spacer(modifier = Modifier.height(32.dp)) }
                item {
                    ProfilePicture(
                        avatarRes = uiState.avatar,
                        onEditClick = { viewModel.onAvatarEditClick() }
                    )
                }
                item { Spacer(modifier = Modifier.height(32.dp)) }

                // Form Section
                item {
                    OutlinedTextField(
                        value = uiState.fullName,
                        onValueChange = viewModel::onFullNameChange,
                        label = { Text("Full Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
                item {
                    OutlinedTextField(
                        value = uiState.dateOfBirth,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Date of Birth") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.onDateOfBirthClick() },
                        trailingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = "Select Date") }
                    )
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
                item {
                    OutlinedTextField(
                        value = uiState.location,
                        onValueChange = viewModel::onLocationChange,
                        label = { Text("Location") },
                        modifier = Modifier.fillMaxWidth(),
                        trailingIcon = { Icon(Icons.Default.LocationOn, contentDescription = "Location") },
                        singleLine = true
                    )
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
                item {
                    OutlinedTextField(
                        value = uiState.interestedEvents,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Interested Event") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.onInterestedEventsClick() },
                        trailingIcon = { Icon(Icons.Default.ArrowDropDown, contentDescription = "Select Interests") }
                    )
                }
            }

            // Save Button
            Button(
                onClick = { viewModel.onSaveChangesClick() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp)
                    .height(56.dp),
                shape = MaterialTheme.shapes.medium,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF212121),
                    contentColor = Color.White
                )
            ) {
                Text("SAVE CHANGES", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        }
    }
}

@Composable
private fun ProfilePicture(avatarRes: Int?, onEditClick: () -> Unit) {
    Box(contentAlignment = Alignment.BottomEnd) {
        Image(
            painter = painterResource(id = avatarRes ?: R.drawable.ic_launcher_background), // Fallback image
            contentDescription = "Profile Avatar",
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .border(4.dp, Color.White, CircleShape)
        )
        SmallFloatingActionButton(
            onClick = onEditClick,
            shape = CircleShape,
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier.border(2.dp, Color.White, CircleShape)

        ) {
            Icon(Icons.Default.Edit, contentDescription = "Edit Profile Picture", modifier = Modifier.size(20.dp))
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun EditProfileScreenPreview() {
    EventingTheme {
        EditProfileScreen(viewModel = viewModel())
    }
}