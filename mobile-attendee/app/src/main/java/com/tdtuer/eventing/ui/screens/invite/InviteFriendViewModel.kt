package com.tdtuer.eventing.ui.screens.invite

import androidx.compose.runtime.State
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R // Assuming R class is correctly imported

// --- Data Model cho bạn bè ---
data class Friend(
    val id: Int,
    val name: String,
    val followers: String,
    val avatarRes: Int,
    var isSelected: Boolean = false
)

class InviteFriendViewModel : ViewModel() {

    private val _allFriends = mutableStateListOf<Friend>()
    val allFriends: List<Friend> = _allFriends

    var searchText by mutableStateOf("")
        private set

    val filteredFriends: State<List<Friend>> = derivedStateOf {
        if (searchText.isBlank()) {
            _allFriends
        } else {
            _allFriends.filter {
                it.name.contains(searchText, ignoreCase = true)
            }
        }
    }

    init {
        loadFriends()
    }

    private fun loadFriends() {
        // Replace with actual data fetching logic
        _allFriends.addAll(listOf(
            Friend(1, "Alex Lee", "2k Followers", R.drawable.default_pfp),
            Friend(2, "Micheal Ulasi", "56 Followers", R.drawable.default_pfp),
            Friend(3, "Cristofer", "300 Followers", R.drawable.default_pfp),
            Friend(4, "David Silbia", "5k Followers", R.drawable.default_pfp),
            Friend(5, "Ashfak Sayem", "402 Followers", R.drawable.default_pfp),
            Friend(6, "Rocks Velkeinjen", "893 Followers", R.drawable.default_pfp),
            Friend(7, "Roman Kutepov", "225 Followers", R.drawable.default_pfp),
            Friend(8, "Cristofer Nolan", "322 Followers", R.drawable.default_pfp),
            Friend(9, "John Wick", "1.2k Followers", R.drawable.default_pfp),
            Friend(10, "Zenifero Bolex", "2k Followers", R.drawable.default_pfp),
            Friend(11, "Lena Bell", "150 Followers", R.drawable.default_pfp),
            Friend(12, "Mark Zukerberg", "10M Followers", R.drawable.default_pfp)
        ))
    }

    fun onSearchTextChange(newText: String) {
        searchText = newText
    }

    fun onFriendSelected(friend: Friend) {
        val index = _allFriends.indexOfFirst { it.id == friend.id }
        if (index != -1) {
            val currentFriend = _allFriends[index]
            _allFriends[index] = currentFriend.copy(isSelected = !currentFriend.isSelected)
        }
    }

    fun onInviteClick() {
        val selectedFriends = _allFriends.filter { it.isSelected }
        if (selectedFriends.isNotEmpty()) {
            // TODO: Implement actual invite logic (e.g., send invitations)
            println("Inviting friends: ${selectedFriends.joinToString { it.name }}")
        } else {
            println("No friends selected to invite.")
        }
    }
}
