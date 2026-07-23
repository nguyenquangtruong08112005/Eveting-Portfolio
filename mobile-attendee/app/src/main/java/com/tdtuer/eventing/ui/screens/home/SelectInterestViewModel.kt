package com.tdtuer.eventing.ui.screens.selectinterest

import android.util.Log
import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// Data class for a single interest item
data class InterestItem(
    val name: String,
    @DrawableRes val iconRes: Int
)

// Data class for the entire screen's state
data class SelectInterestUiState(
    val interests: List<InterestItem> = emptyList(),
    val selectedInterests: Set<String> = emptySet()
)

class SelectInterestViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(SelectInterestUiState())
    val uiState = _uiState.asStateFlow()

    private val SELECTION_LIMIT = 3

    init {
        loadInterests()
    }

    private fun loadInterests() {
        // Replace R.drawable placeholders with your actual icons
        val allInterests = listOf(
            InterestItem("Design", R.drawable.vector),
            InterestItem("Music", R.drawable.quaver),
            InterestItem("Art", R.drawable.paint_palette),
            InterestItem("Sports", R.drawable.sports),
            InterestItem("Food", R.drawable.noodles),
            InterestItem("Others", R.drawable.ellipsis)
        )
        _uiState.update { it.copy(interests = allInterests) }
    }

    fun onInterestClick(interestName: String) {
        _uiState.update { currentState ->
            val newSelection = currentState.selectedInterests.toMutableSet()
            if (newSelection.contains(interestName)) {
                // If already selected, deselect it
                newSelection.remove(interestName)
            } else {
                // If not selected, add it, but only if the limit is not reached
                if (newSelection.size < SELECTION_LIMIT) {
                    newSelection.add(interestName)
                }
            }
            currentState.copy(selectedInterests = newSelection)
        }
    }

    fun onNextClick() {
        // Handle the next step, e.g., save interests and navigate
        if (uiState.value.selectedInterests.isNotEmpty()) {
            println("Next clicked. Selected interests: ${uiState.value.selectedInterests}")
            //Log.d("SelectInterestViewModel", "Next clicked. Selected interests: ${uiState.value.selectedInterests}")
        } else {
            println("Next clicked. No interests selected.")
            //Log.d("SelectInterestViewModel", "Next clicked. No interests selected.")
        }
    }
}