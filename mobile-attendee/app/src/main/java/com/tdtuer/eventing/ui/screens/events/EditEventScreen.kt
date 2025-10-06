package com.tdtuer.eventing.ui.screens.editevent

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your drawable resources
import com.tdtuer.eventing.ui.screens.addevent.DashedBox
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditEventScreen(viewModel: EditEventViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Event", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackClick() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .fillMaxSize()
        ) {
            item { Spacer(modifier = Modifier.height(16.dp)) }
            item { EditPhotoSection(uiState.coverImage, uiState.thumbnailImages) }
            item { Spacer(modifier = Modifier.height(32.dp)) }
            item { Text("Event Details", fontSize = 18.sp, fontWeight = FontWeight.Bold) }
            item { Spacer(modifier = Modifier.height(16.dp)) }

            // Refactored Form Section
            item {
                EventTextField(
                    label = "Event Name",
                    value = uiState.eventName,
                    onValueChange = viewModel::onEventNameChange,
                    singleLine = true
                )
            }
            item { Spacer(modifier = Modifier.height(16.dp)) }
            item {
                EventDropdownField(
                    label = "Event Type",
                    selectedValue = uiState.eventType,
                    options = viewModel.eventTypes,
                    onOptionSelected = viewModel::onEventTypeChange,
                    expanded = uiState.isEventTypeDropdownExpanded,
                    onExpandedChange = viewModel::onEventTypeDropdownClick,
                    onDismiss = viewModel::onEventTypeDropdownDismiss
                )
            }
            item { Spacer(modifier = Modifier.height(16.dp)) }
            item {
                EventDateField(
                    label = "Select Date and Time",
                    value = uiState.eventDate,
                    onClick = viewModel::onDateClick
                )
            }
            item { Spacer(modifier = Modifier.height(16.dp)) }
            item {
                EventTextField(
                    label = "Event Description",
                    value = uiState.eventDescription,
                    onValueChange = viewModel::onDescriptionChange,
                    minLines = 4
                )
            }

            // Save Changes Button
            item {
                Button(
                    onClick = { viewModel.onSaveChangesClick() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp)
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
}

// --- Reusable Form Field Composables ---

@Composable
private fun EventTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    singleLine: Boolean = false,
    minLines: Int = 1
) {
    FormFieldWrapper {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(label) },
            modifier = modifier.fillMaxWidth(),
            singleLine = singleLine,
            minLines = minLines
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EventDropdownField(
    label: String,
    selectedValue: String,
    options: List<String>,
    onOptionSelected: (String) -> Unit,
    expanded: Boolean,
    onExpandedChange: () -> Unit,
    onDismiss: () -> Unit
) {
    FormFieldWrapper {
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { onExpandedChange() }
        ) {
            OutlinedTextField(
                value = selectedValue,
                onValueChange = {},
                readOnly = true,
                label = { Text(label) },
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                modifier = Modifier.fillMaxWidth().menuAnchor()
            )
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = onDismiss
            ) {
                options.forEach { type ->
                    DropdownMenuItem(
                        text = { Text(type) },
                        onClick = { onOptionSelected(type) }
                    )
                }
            }
        }
    }
}

@Composable
private fun EventDateField(
    label: String,
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    FormFieldWrapper {
        OutlinedTextField(
            value = value,
            onValueChange = {},
            readOnly = true,
            label = { Text(label) },
            modifier = modifier.fillMaxWidth().clickable(onClick = onClick),
            trailingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = "Select Date") }
        )
    }
}


// --- Helper and Section Composables ---

@Composable
private fun EditPhotoSection(coverImage: Int?, thumbnailImages: List<Int>) {
    /* ... (Same as before) ... */
    Column {
        coverImage?.let {
            Image(
                painter = painterResource(id = it),
                contentDescription = "Cover Photo",
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
                    .clip(MaterialTheme.shapes.medium),
                contentScale = ContentScale.Crop
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(thumbnailImages) { imageRes ->
                Image(
                    painter = painterResource(id = imageRes),
                    contentDescription = "Thumbnail",
                    modifier = Modifier
                        .size(70.dp)
                        .clip(MaterialTheme.shapes.medium),
                    contentScale = ContentScale.Crop
                )
            }
            item {
                DashedBox(modifier = Modifier.size(70.dp)) {
                    Icon(Icons.Default.Add, contentDescription = "Add Photo", tint = Color.Gray)
                }
            }
        }
    }
}

@Composable
private fun FormFieldWrapper(content: @Composable () -> Unit) {
    /* ... (Same as before) ... */
    Box {
        content()
        Icon(
            imageVector = Icons.Default.Edit,
            contentDescription = "Edit",
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(top = 6.dp, end = 6.dp)
                .size(16.dp)
        )
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun EditEventScreenPreview() {
    EventingTheme {
        EditEventScreen(viewModel = viewModel())
    }
}