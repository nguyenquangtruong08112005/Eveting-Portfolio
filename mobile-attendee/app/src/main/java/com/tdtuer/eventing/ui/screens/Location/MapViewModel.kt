package com.tdtuer.eventing.ui.screens.mapview

import androidx.annotation.DrawableRes
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// --- Data Models for this Screen ---
data class CategoryItem(val name: String, @DrawableRes val iconRes: Int)
data class MapEvent(val id: String, val price: String, val title: String, val position: Pair<Dp, Dp>)
data class BottomSheetEvent(val id: String, val title: String, val attendees: String, @DrawableRes val imageRes: Int)

data class MapUiState(
    val searchQuery: String = "",
    val categories: List<CategoryItem> = emptyList(),
    val selectedCategory: String = "Design",
    val mapEvents: List<MapEvent> = emptyList(),
    val bottomSheetEvents: List<BottomSheetEvent> = emptyList()
)

class MapViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(MapUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        // Replace placeholders with your actual drawable resources
        val categories = listOf(
            CategoryItem("Design", R.drawable.group_34057),
            CategoryItem("Art", R.drawable.group_34057),
            CategoryItem("Sports", R.drawable.group_34057),
            CategoryItem("Music", R.drawable.group_34057)
        )
        val mapEvents = listOf(
            MapEvent("1", "Ticket: $19.9", "Design Event", Pair(50.dp, 450.dp)),
            MapEvent("2", "Ticket: $30", "Music concert", Pair(150.dp, 350.dp)),
            MapEvent("3", "Ticket: $59", "Food Event", Pair(250.dp, 480.dp)),
            MapEvent("4", "Ticket: $10.99", "Cricket Match", Pair(220.dp, 280.dp))
        )
        val bottomSheetEvents = listOf(
            BottomSheetEvent("1", "International Band Music Co..", "12k Members joined", R.drawable.default_pfp),
            BottomSheetEvent("2", "Shere Bangla Concert", "15k Members joined", R.drawable.default_pfp),
            BottomSheetEvent("3", "Designers Meetup 2022", "5k Members joined", R.drawable.default_pfp)
        )

        _uiState.value = MapUiState(
            categories = categories,
            mapEvents = mapEvents,
            bottomSheetEvents = bottomSheetEvents
        )
    }

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun onCategorySelected(categoryName: String) {
        _uiState.update { it.copy(selectedCategory = categoryName) }
        // In a real app, you would filter mapEvents and bottomSheetEvents here
    }
}