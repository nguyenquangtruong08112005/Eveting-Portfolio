// eventing.zip/ui/screens/home/FilterBottomSheet.kt (ĐÃ CẬP NHẬT HOÀN CHỈNH)
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
    onDismiss: () -> Unit,
    onApplyFilters: (FilterParams) -> Unit
) {
    // --- State cho Date Picker ---
    var showDateRangePicker by remember { mutableStateOf(false) }
    val dateRangePickerState = rememberDateRangePickerState()
    var selectedCustomDateRange by remember { mutableStateOf<Pair<Long, Long>?>(null) }

    // --- State cho Price Slider ---
    var selectedPriceRange by remember { mutableStateOf(0f..5_000_000f) }
    val priceRangeSteps = 24

    // --- State gốc (ĐÃ BỎ `artist`) ---
    var query by remember { mutableStateOf("") }
    // (ĐIỂM 1) Đã loại bỏ 'var artist'
    var selectedCategories by remember { mutableStateOf(emptySet<String>()) }
    var selectedTimePreset by remember { mutableStateOf<String?>("Tomorrow") }

    // (ĐIỂM 3) State cho Location Dropdown
    var location by remember { mutableStateOf("") }
    var isLocationDropdownExpanded by remember { mutableStateOf(false) }


    val categories = listOf("Sports", "Music", "Art", "Food", "Tech", "Other")
    val timePresets = listOf("Today", "Tomorrow", "This week")

    if (showDateRangePicker) {
        // --- (MỚI) Tạo Context Tiếng Anh ---
        val context = LocalContext.current
        val englishContext = remember {
            val config = android.content.res.Configuration(context.resources.configuration)
            config.setLocale(Locale.ENGLISH)
            context.createConfigurationContext(config)
        }

        // --- (MỚI) Bọc Dialog trong Provider ---
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
                                selectedTimePreset = null
                            }
                        }
                    ) { Text("OK") } // Chữ "OK" này cũng sẽ là Tiếng Anh (hoặc từ hệ thống)
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
                "Filter",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            // --- (ĐIỂM 1) Chỉ còn 1 trường query ---
//            OutlinedTextField(
//                value = query,
//                onValueChange = { query = it },
//                label = { Text("Event, Artist or Program Name") },
//                modifier = Modifier.fillMaxWidth()
//            )
//            Spacer(modifier = Modifier.height(16.dp))

            // --- Category (Giữ nguyên) ---
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

            // --- Time & Date (Giữ nguyên) ---
            Text("Time & Date", style = MaterialTheme.typography.titleMedium)
            // ... (Row các FilterChip 'Today', 'Tomorrow'...)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                timePresets.forEach { preset ->
                    FilterChip(
                        selected = selectedTimePreset == preset,
                        onClick = {
                            selectedTimePreset = preset
                            selectedCustomDateRange = null
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

            // --- (ĐIỂM 3) Location Dropdown ---
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
                        .menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = isLocationDropdownExpanded,
                    onDismissRequest = { isLocationDropdownExpanded = false },
                    modifier = Modifier.heightIn(max = 250.dp) // Giới hạn chiều cao
                ) {
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

            // --- (ĐIỂM 4) Price Slider (Dùng helper) ---
            Text("Select price range", style = MaterialTheme.typography.titleMedium)
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
                // Dùng helper 'formatVNCurrency'
                Text(formatVNCurrency(selectedPriceRange.start.toDouble()), style = MaterialTheme.typography.labelSmall)
                Text(formatVNCurrency(selectedPriceRange.endInclusive.toDouble()), style = MaterialTheme.typography.labelSmall)
            }
            Spacer(modifier = Modifier.height(16.dp))

            // --- Nút bấm (CẬP NHẬT LOGIC) ---
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                OutlinedButton(
                    onClick = {
                        // Reset (Đã bỏ 'artist')
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
                        // (ĐIỂM 1) 'query' giờ là tham số duy nhất
                        val priceRange = if (selectedPriceRange == 0f..5_000_000f) {
                            null
                        } else {
                            selectedPriceRange.start.toDouble() to selectedPriceRange.endInclusive.toDouble()
                        }

                        val params = FilterParams(
                            query = query.ifBlank { null },
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

// Helper format ngày
private fun Long.toSimpleDate(): String {
    val sdf = SimpleDateFormat("dd/MM", Locale.getDefault())
    return sdf.format(Date(this))
}