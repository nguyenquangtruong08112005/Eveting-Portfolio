package com.tdtuer.eventing.ui.screens.schedule

import android.os.Build
import androidx.annotation.RequiresApi
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.ui.screens.calendar.CalendarViewModel
import com.tdtuer.eventing.ui.screens.calendar.Event
import com.tdtuer.eventing.ui.theme.EventingTheme
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.*

@RequiresApi(Build.VERSION_CODES.O)
@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun CalendarScreen(viewModel: CalendarViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        modifier = Modifier.clickable { viewModel.onCalendarViewChangeClick() },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Calendar", fontWeight = FontWeight.Bold)
                        Icon(Icons.Default.ArrowDropDown, contentDescription = "Change calendar view")
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
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.padding(innerPadding),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp) // Space between items in the same day
        ) {
            uiState.events.forEach { (date, eventsOnDate) ->
                stickyHeader {
                    DateHeader(date = date)
                }
                items(eventsOnDate) { event ->
                    EventCard(event = event)
                }
            }
        }
    }
}


// --- Custom Composables for this Screen ---

@RequiresApi(Build.VERSION_CODES.O)
@Composable
private fun DateHeader(date: LocalDate) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            // VISUAL REFINEMENT: Add top padding to separate date groups
            .padding(top = 24.dp, bottom = 12.dp)
    ) {
        val month = date.month.getDisplayName(TextStyle.SHORT, Locale.ENGLISH)
        DateIndicator(
            day = date.dayOfMonth.toString(),
            month = month
        )
        val dayOfWeek = date.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.ENGLISH).uppercase()
        val dayOfMonth = date.dayOfMonth
        val monthName = date.month.getDisplayName(TextStyle.FULL, Locale.ENGLISH)
        val year = date.year
        val fullDateText = "$dayOfWeek, $dayOfMonth $monthName, $year"

        Text(
            text = fullDateText,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun DateIndicator(day: String, month: String) {
    Card(
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(month.uppercase(), fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
            Text(day, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = MaterialTheme.colorScheme.primary)
        }
    }
}

@RequiresApi(Build.VERSION_CODES.O)
@Composable
fun EventCard(event: Event) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.large,
        // VISUAL REFINEMENT: Use surface color and a subtle border
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Image(
                painter = painterResource(id = event.imageRes),
                contentDescription = event.title,
                modifier = Modifier
                    .size(64.dp)
                    .clip(MaterialTheme.shapes.medium)
            )
            Column {
                Text(event.title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(4.dp))
                val dateString = "${event.date.dayOfMonth} ${event.date.month.getDisplayName(TextStyle.FULL, Locale.ENGLISH)}, ${event.date.year}"
                Text(
                    text = "$dateString  •  ${event.location}",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun AppBottomNavigation(selectedItem: String, onItemSelected: (String) -> Unit) {
    val items = listOf("Home", "Calendar", "Location", "Profile")
    val icons = mapOf(
        "Home" to Icons.Default.Home,
        "Calendar" to Icons.Default.CalendarToday,
        "Location" to Icons.Default.LocationOn,
        "Profile" to Icons.Default.Person
    )

    NavigationBar {
        items.forEach { screen ->
            NavigationBarItem(
                icon = { Icon(icons[screen]!!, contentDescription = screen) },
                label = { Text(screen) },
                selected = screen == selectedItem,
                onClick = { onItemSelected(screen) }
            )
        }
    }
}

@RequiresApi(Build.VERSION_CODES.O)
@Preview(showSystemUi = true)
@Composable
fun CalendarScreenPreview() {
    EventingTheme {
        CalendarScreen(viewModel = viewModel())
    }
}