package com.tdtuer.eventing.ui.screens.calendarexpanded

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.ui.screens.calendar.Event
import com.tdtuer.eventing.ui.theme.EventingTheme
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.*
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.ExperimentalFoundationApi

import com.tdtuer.eventing.ui.screens.calendar.EventCard

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun CalendarExpandedScreen(viewModel: CalendarExpandedViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        modifier = Modifier.clickable { /* Collapse calendar */ },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Calendar", fontWeight = FontWeight.Bold)
                        Icon(Icons.Default.ArrowDropUp, contentDescription = "Collapse calendar view")
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackClick() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onMoreOptionsClick() }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More Options")
                    }
                }
            )
        },
        bottomBar = {
            // Reusing Bottom Navigation from the previous screen
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
        ) {
            item { FilterBar() }
            item { Spacer(modifier = Modifier.height(16.dp)) }
            item {
                CalendarMonthView(
                    selectedDate = uiState.selectedDate,
                    onDateSelected = viewModel::onDateSelected
                )
            }

            // Sticky header for the selected day's events
            if (uiState.eventsForSelectedDate.isNotEmpty()) {
                stickyHeader {
                    val selectedDate = uiState.selectedDate
                    val dayOfWeek = selectedDate.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.ENGLISH).uppercase()
                    val dayOfMonth = selectedDate.dayOfMonth
                    val monthName = selectedDate.month.getDisplayName(TextStyle.FULL, Locale.ENGLISH)
                    val year = selectedDate.year
                    val fullDateText = "$dayOfWeek, $dayOfMonth $monthName, $year"

                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.surface)
                            .padding(top = 24.dp, bottom = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(fullDateText, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                items(uiState.eventsForSelectedDate) { event ->
                    EventCard(event = event) // Now this call is resolved correctly
                }
            }
        }
    }
}


// --- Custom Composables for this Screen ---

@Composable
private fun FilterBar() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        OutlinedButton(onClick = { /*TODO*/ }) {
            Text("All Events")
            Icon(Icons.Default.ArrowDropDown, contentDescription = null)
        }
        Button(onClick = { /*TODO*/ }) {
            Icon(Icons.Default.FilterList, contentDescription = "Filter")
            Spacer(modifier = Modifier.width(8.dp))
            Text("Filter")
        }
    }
}

@Composable
private fun CalendarMonthView(selectedDate: LocalDate, onDateSelected: (LocalDate) -> Unit) {
    val daysInMonth = (1..31).toList()
    val firstDayOfMonthOffset = 5

    Card {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                IconButton(onClick = { /* Previous month */ }) { Icon(Icons.Default.ChevronLeft, "Previous Month") }
                Text("October 2022", fontWeight = FontWeight.Bold)
                IconButton(onClick = { /* Next month */ }) { Icon(Icons.Default.ChevronRight, "Next Month") }
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                listOf("Mo", "Tu", "We", "Th", "Fr", "Sa", "Su").forEach { day ->
                    Text(day, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                val allCells = List(firstDayOfMonthOffset) { null } + daysInMonth
                allCells.chunked(7).forEach { week ->
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceAround) {
                        week.forEach { day ->
                            if (day != null) {
                                val date = LocalDate.of(2022, 10, day)
                                DateCell(
                                    day = day.toString(),
                                    isSelected = date == selectedDate,
                                    onClick = { onDateSelected(date) }
                                )
                            } else {
                                Spacer(modifier = Modifier.size(40.dp))
                            }
                        }
                        if (week.size < 7) {
                            for (i in 0 until (7 - week.size)) {
                                Spacer(modifier = Modifier.size(40.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DateCell(day: String, isSelected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .background(if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = day,
            color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
        )
    }
}

@Preview(showSystemUi = true)
@Composable
fun CalendarExpandedScreenPreview() {
    EventingTheme {
        CalendarExpandedScreen(viewModel = viewModel())
    }
}