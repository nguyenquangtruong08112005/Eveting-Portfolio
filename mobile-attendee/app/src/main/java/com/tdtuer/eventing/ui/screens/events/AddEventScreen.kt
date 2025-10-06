package com.tdtuer.eventing.ui.screens.addevent

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddEventScreen(viewModel: AddEventViewModel) {
    val eventName by viewModel.eventName.collectAsState()
    val eventType by viewModel.eventType.collectAsState()
    val eventDate by viewModel.eventDate.collectAsState()
    val eventDescription by viewModel.eventDescription.collectAsState()
    val isEventTypeDropdownExpanded by viewModel.isEventTypeDropdownExpanded.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create New Event", fontWeight = FontWeight.Bold) },
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
                .fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item { Spacer(modifier = Modifier.height(16.dp)) }

            // Photo Upload Section
            item { PhotoUploadSection() }
            item { Spacer(modifier = Modifier.height(32.dp)) }

            // Event Details Form
            item {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Event Details", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = eventName,
                        onValueChange = { viewModel.onEventNameChange(it) },
                        label = { Text("Event Name*") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    // Event Type Dropdown
                    ExposedDropdownMenuBox(
                        expanded = isEventTypeDropdownExpanded,
                        onExpandedChange = { viewModel.onEventTypeDropdownClick() }
                    ) {
                        OutlinedTextField(
                            value = eventType,
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Event Type*") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isEventTypeDropdownExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor()
                        )
                        ExposedDropdownMenu(
                            expanded = isEventTypeDropdownExpanded,
                            onDismissRequest = { viewModel.onEventTypeDropdownDismiss() }
                        ) {
                            viewModel.eventTypes.forEach { type ->
                                DropdownMenuItem(
                                    text = { Text(type) },
                                    onClick = { viewModel.onEventTypeChange(type) }
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = eventDate,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Select Date and Time*") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { viewModel.onDateClick() },
                        trailingIcon = { Icon(Icons.Default.CalendarToday, contentDescription = "Select Date") }
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    OutlinedTextField(
                        value = eventDescription,
                        onValueChange = { viewModel.onDescriptionChange(it) },
                        label = { Text("Event Description*") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                    )
                }
            }

            item { Spacer(modifier = Modifier.height(32.dp)) }
            // Publish Button
            item {
                Button(
                    onClick = { viewModel.onPublishNowClick() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = MaterialTheme.shapes.medium,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF212121),
                        contentColor = Color.White
                    )
                ) {
                    Text("PUBLISH NOW", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}

@Composable
fun PhotoUploadSection() {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        DashedBox(
            modifier = Modifier
                .fillMaxWidth()
                .height(150.dp)
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Photos", tint = MaterialTheme.colorScheme.primary)
                Spacer(modifier = Modifier.height(8.dp))
                Text("Add Cover Photos", color = Color.Gray)
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            repeat(4) {
                DashedBox(modifier = Modifier.size(70.dp)) {
                    Icon(Icons.Default.Add, contentDescription = "Add Photo", tint = Color.Gray)
                }
            }
        }
    }
}

@Composable
fun DashedBox(modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    val stroke = Stroke(
        width = 2f,
        pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
    )
    val color = Color.LightGray

    Box(
        modifier = modifier
            .drawBehind {
                drawRoundRect(
                    color = color,
                    style = stroke,
                    cornerRadius = CornerRadius(8.dp.toPx())
                )
            },
        contentAlignment = Alignment.Center
    ) {
        content()
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun AddEventScreenPreview() {
    EventingTheme {
        AddEventScreen(viewModel = viewModel())
    }
}