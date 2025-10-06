package com.tdtuer.eventing.ui.screens.groupmembers

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// --- Data Models ---
data class Member(
    val id: String,
    val name: String,
    val followerCount: String,
    @DrawableRes val avatarRes: Int
)

data class GroupMembersUiState(
    val members: List<Member> = emptyList()
)

class GroupMembersViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(GroupMembersUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadMembers()
    }

    private fun loadMembers() {
        // In a real app, this data would come from a repository/API.
        // Replace placeholders with your actual drawable resources.
        val members = listOf(
            Member("1", "Alex Lee", "2k Followers", R.drawable.default_pfp),
            Member("2", "Micheal Ulasi", "56 Followers", R.drawable.default_pfp),
            Member("3", "Cristofer", "300 Followers", R.drawable.default_pfp),
            Member("4", "David Silbia", "5k Followers", R.drawable.default_pfp),
            Member("5", "Ashfak Sayem", "402 Followers", R.drawable.default_pfp),
            Member("6", "Rocks Velkeinjen", "893 Followers", R.drawable.default_pfp),
            Member("7", "Roman Kutepov", "225 Followers", R.drawable.default_pfp),
            Member("8", "Cristofer Nolan", "322 Followers", R.drawable.default_pfp),
            Member("9", "Jhon Wick", "2k Followers", R.drawable.default_pfp),
            Member("10", "Zenifero Bolex", "3k Followers", R.drawable.default_pfp)
        )
        _uiState.update { it.copy(members = members) }
    }

    // --- Event Handlers ---
    fun onBackClick() {
        println("Back button clicked")
    }

    fun onMoreOptionsClick() {
        println("More options clicked")
    }

    fun onMemberClick(memberId: String) {
        println("Clicked on member with ID: $memberId")
    }
}