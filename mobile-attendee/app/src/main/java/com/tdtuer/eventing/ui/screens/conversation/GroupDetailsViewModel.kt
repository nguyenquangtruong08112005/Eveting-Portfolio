package com.tdtuer.eventing.ui.screens.groupdetails

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// --- Data Models ---
data class GroupInfo(
    val name: String,
    @DrawableRes val avatarRes: Int
)

data class GroupDetailsUiState(
    val groupInfo: GroupInfo = GroupInfo("", R.drawable.ic_launcher_background),
    val memberAvatars: List<Int> = emptyList(),
    val photos: List<Int> = emptyList()
)

class GroupDetailsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(GroupDetailsUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadGroupDetails()
    }

    private fun loadGroupDetails() {
        // In a real app, this data would come from a repository/API.
        // Replace placeholders with your actual drawable resources.
        val groupInfo = GroupInfo(
            name = "Shere Bangla Concert",
            avatarRes = R.drawable.group_34057
        )
        val memberAvatars = listOf(
            R.drawable.default_pfp,
            R.drawable.default_pfp,
            R.drawable.default_pfp,
            R.drawable.default_pfp
        )
        val photos = listOf(
            R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp,
            R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp,
            R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp,
            R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp,
        )

        _uiState.update {
            it.copy(
                groupInfo = groupInfo,
                memberAvatars = memberAvatars,
                photos = photos
            )
        }
    }

    // --- Event Handlers ---
    fun onBackClick() {
        println("Back button clicked")
    }

    fun onMoreOptionsClick() {
        println("More options clicked")
    }

    fun onViewAllClick() {
        println("View All / Invite clicked")
    }
}