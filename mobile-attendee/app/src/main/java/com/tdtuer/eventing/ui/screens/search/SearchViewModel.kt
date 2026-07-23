package com.tdtuer.eventing.ui.screens.search

import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R // Assuming R class is available

// --- Data Model cho một kết quả tìm kiếm ---
data class SearchResultEvent(
    val title: String,
    val dateTime: String,
    val imageRes: Int
)

class SearchViewModel : ViewModel() {

    // Holds the initial list of events; in a real app, this would be dynamically loaded/filtered.
    private val _allSearchResults = mutableStateOf<List<SearchResultEvent>>(emptyList())

    // Exposed to the UI, potentially filtered by searchText
    // For now, it just mirrors _allSearchResults but could be a derivedStateOf searchText
    val searchResults: State<List<SearchResultEvent>> = _allSearchResults

    var searchText by mutableStateOf("")
        private set

    init {
        loadDefaultResults() // Load initial/sample search results
    }

    private fun loadDefaultResults() {
        // In a real app, you might fetch initial popular results or recent searches.
        // Or this list could be populated based on actual search queries.
        _allSearchResults.value = listOf(
            SearchResultEvent("A virtual evening of smooth jazz", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
            SearchResultEvent("Jo malone london’s mother’s day", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
            SearchResultEvent("Women's leadership conference", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
            SearchResultEvent("International kids safe parents night out", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
            SearchResultEvent("International gala music festival", "1ST MAY- SAT -2:00 PM", R.drawable.banner_svgrepo_com),
        )
        // If you want live filtering, you would update a derivedState or re-filter here
        // based on the current searchText. For simplicity, we are not doing live filtering here.
        // The UI will display _allSearchResults directly for now.
    }

    fun onSearchTextChanged(newText: String) {
        searchText = newText
        // TODO: Implement actual search logic here.
        // This could involve:
        // 1. Calling an API with the newText.
        // 2. Filtering the _allSearchResults list based on newText.
        // For now, just printing and the UI will show the default list.
        println("Search text changed: $newText. Current results count: ${_allSearchResults.value.size}")
        // Example of simple local filtering (uncomment and adapt if needed):
        // if (newText.isBlank()) {
        //     _searchResults.value = _allSearchResults.value // Show all if search is blank
        // } else {
        //     _searchResults.value = _allSearchResults.value.filter {
        //         it.title.contains(newText, ignoreCase = true) || 
        //         it.dateTime.contains(newText, ignoreCase = true)
        //     }
        // }
    }

    fun onBackNavigationClick() {
        // TODO: Implement back navigation logic (e.g., pop backstack or finish activity)
        println("Back navigation clicked from SearchScreen")
    }

    fun onFilterClick() {
        // TODO: Implement filter functionality (e.g., show filter dialog/screen)
        println("Filter button clicked")
    }

    fun onSearchResultClick(event: SearchResultEvent) {
        // TODO: Implement navigation to event details screen or other action
        println("Search result clicked: ${event.title}")
    }
}
