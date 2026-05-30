package com.tdtuer.eventing.ui.screens.home

import android.annotation.SuppressLint
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tdtuer.eventing.domain.model.FilterParams
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyHorizontalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import com.tdtuer.eventing.constants.Constraints.vietnameseProvinces
import com.tdtuer.eventing.helpers.formatVNCurrency
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@SuppressLint("LocalContextConfigurationRead")
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilterBottomSheet(
    currentFilters: FilterParams, // [REFACTORED] Nhận giá trị hiện tại
    onDismiss: () -> Unit,
    onApplyFilters: (FilterParams) -> Unit
) {
    // --- Khởi tạo State từ currentFilters (Fix lỗi mất trạng thái) ---
    var query by remember { mutableStateOf(currentFilters.query ?: "") }
    var selectedCategories by remember { mutableStateOf(currentFilters.categories) }
    var selectedTimePreset by remember { mutableStateOf(currentFilters.datePreset) }
    var selectedCustomDateRange by remember { mutableStateOf(currentFilters.customDateRange) }
    var location by remember { mutableStateOf(currentFilters.location ?: "") }

    // Price Range: Chuyển đổi từ Pair<Double, Double> sang ClosedFloatingPointRange<Float>
    var selectedPriceRange by remember {
        mutableStateOf(
            if (currentFilters.priceRange != null) {
                currentFilters.priceRange!!.first.toFloat()..currentFilters.priceRange!!.second.toFloat()
            } else {
                0f..5_000_000f
            }
        )
    }

    // --- State UI nội bộ ---
    var showDateRangePicker by remember { mutableStateOf(false) }
    val dateRangePickerState = rememberDateRangePickerState(
        initialSelectedStartDateMillis = selectedCustomDateRange?.first,
        initialSelectedEndDateMillis = selectedCustomDateRange?.second
    )
    var isLocationDropdownExpanded by remember { mutableStateOf(false) }

    val categories = listOf("Sports", "Music", "Art", "Food", "Tech", "Other")
    val timePresets = listOf("Today", "Tomorrow", "This week")
    val priceRangeSteps = 24

    // Date Picker Dialog Logic
    if (showDateRangePicker) {
        val context = LocalContext.current
        val englishContext = remember {
            val config = android.content.res.Configuration(context.resources.configuration)
            config.setLocale(Locale.ENGLISH)
            context.createConfigurationContext(config)
        }

        CompositionLocalProvider(LocalContext provides englishContext) {
            DatePickerDialog(
                onDismissRequest = { showDateRangePicker = false },
                confirmButton = {
                    TextButton(
                        onClick = {
                            showDateRangePicker = false
                            val start = dateRangePickerState.selectedStartDateMillis
                            val end = dateRangePickerState.selectedEndDateMillis
                            if (start != null && end != null) {
                                selectedCustomDateRange = start to end
                                selectedTimePreset = null // Clear preset nếu chọn custom
                            }
                        }
                    ) { Text("OK") }
                },
                dismissButton = {
                    TextButton(onClick = { showDateRangePicker = false }) { Text("Cancel") }
                }
            ) {
                DateRangePicker(state = dateRangePickerState)
            }
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text(
                "Filter Options",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // --- Category ---
            Text("Category", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            LazyHorizontalGrid(
                rows = GridCells.Fixed(1),
                modifier = Modifier.height(50.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(categories) { category ->
                    FilterChip(
                        selected = selectedCategories.contains(category),
                        onClick = {
                            selectedCategories = if (selectedCategories.contains(category)) {
                                selectedCategories - category
                            } else {
                                selectedCategories + category
                            }
                        },
                        label = { Text(category) }
                    )
                }
            }
            Spacer(modifier = Modifier.height(16.dp))

            // --- Time & Date ---
            Text("Time & Date", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                timePresets.forEach { preset ->
                    FilterChip(
                        selected = selectedTimePreset == preset,
                        onClick = {
                            if (selectedTimePreset == preset) {
                                selectedTimePreset = null // Toggle off
                            } else {
                                selectedTimePreset = preset
                                selectedCustomDateRange = null // Clear custom date
                            }
                        },
                        label = { Text(preset) }
                    )
                }
            }

            val (dateButtonText, dateButtonColor) = if (selectedCustomDateRange != null) {
                "Từ ${selectedCustomDateRange!!.first.toSimpleDate()} đến ${selectedCustomDateRange!!.second.toSimpleDate()}" to MaterialTheme.colorScheme.primary
            } else {
                "Choose from calendar" to MaterialTheme.colorScheme.onSurfaceVariant
            }
            TextButton(
                onClick = { showDateRangePicker = true },
                modifier = Modifier.padding(top = 8.dp)
            ) {
                Icon(
                    Icons.Default.CalendarToday,
                    contentDescription = "Calendar",
                    modifier = Modifier.size(18.dp),
                    tint = dateButtonColor
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(dateButtonText, color = dateButtonColor)
            }
            Spacer(modifier = Modifier.height(16.dp))

            // --- Location Dropdown ---
            Text("Location", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            ExposedDropdownMenuBox(
                expanded = isLocationDropdownExpanded,
                onExpandedChange = { isLocationDropdownExpanded = !isLocationDropdownExpanded }
            ) {
                OutlinedTextField(
                    value = location,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Select Province/City") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = isLocationDropdownExpanded) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    )
                )
                ExposedDropdownMenu(
                    expanded = isLocationDropdownExpanded,
                    onDismissRequest = { isLocationDropdownExpanded = false },
                    modifier = Modifier.heightIn(max = 250.dp)
                ) {
                    DropdownMenuItem(
                        text = { Text("All Locations (Clear)") },
                        onClick = {
                            location = ""
                            isLocationDropdownExpanded = false
                        }
                    )
                    vietnameseProvinces.forEach { province ->
                        DropdownMenuItem(
                            text = { Text(province) },
                            onClick = {
                                location = province
                                isLocationDropdownExpanded = false
                            }
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))

            // --- Price Slider ---
            Text("Price Range", style = MaterialTheme.typography.titleMedium)
            RangeSlider(
                value = selectedPriceRange,
                onValueChange = { selectedPriceRange = it },
                valueRange = 0f..5_000_000f,
                steps = priceRangeSteps,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(formatVNCurrency(selectedPriceRange.start.toDouble()), style = MaterialTheme.typography.labelSmall)
                Text(formatVNCurrency(selectedPriceRange.endInclusive.toDouble()), style = MaterialTheme.typography.labelSmall)
            }
            Spacer(modifier = Modifier.height(16.dp))

            // --- Buttons ---
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                OutlinedButton(
                    onClick = {
                        // Reset local state only
                        query = ""
                        selectedCategories = emptySet()
                        selectedTimePreset = null
                        location = ""
                        selectedCustomDateRange = null
                        selectedPriceRange = 0f..5_000_000f
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                ) {
                    Text("RESET")
                }
                Spacer(modifier = Modifier.width(16.dp))
                Button(
                    onClick = {
                        val priceRange = if (selectedPriceRange.start == 0f && selectedPriceRange.endInclusive == 5_000_000f) {
                            null
                        } else {
                            selectedPriceRange.start.toDouble() to selectedPriceRange.endInclusive.toDouble()
                        }

                        val params = FilterParams(
                            query = query.ifBlank { null }, // Hiện tại query trong sheet này đang ẩn, nếu bạn uncomment input query thì dùng biến này
                            categories = selectedCategories,
                            datePreset = selectedTimePreset,
                            customDateRange = selectedCustomDateRange,
                            location = location.ifBlank { null },
                            priceRange = priceRange
                        )
                        onApplyFilters(params)
                    },
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                ) {
                    Text("APPLY")
                }
            }
        }
    }
}

private fun Long.toSimpleDate(): String {
    val sdf = SimpleDateFormat("dd/MM", Locale.getDefault())
    return sdf.format(Date(this))
}