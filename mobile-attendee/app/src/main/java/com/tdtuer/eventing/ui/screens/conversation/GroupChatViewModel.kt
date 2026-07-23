package com.tdtuer.eventing.ui.screens.groupchat

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// --- Data Models ---
data class GroupInfo(
    val name: String,
    val memberCount: String,
    @DrawableRes val avatarRes: Int
)

data class User(
    val id: String,
    val name: String,
    @DrawableRes val avatarRes: Int
)

data class GroupChatMessage(
    val id: String,
    val sender: User,
    val text: String?,
    val timestamp: String,
    val imageAttachments: List<Int> = emptyList()
)

data class GroupChatUiState(
    val groupInfo: GroupInfo? = null,
    val messages: List<GroupChatMessage> = emptyList(),
    val currentMessage: String = "",
    val currentUserId: String = "me"
)

class GroupChatViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(GroupChatUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadGroupChat()
    }

    private fun loadGroupChat() {
        val currentUser = User("me", "MyUser", R.drawable.default_pfp)
        val zara = User("zara1", "Zara Cla", R.drawable.default_pfp)
        val jhon = User("jhon2", "Jhon Wick", R.drawable.default_pfp)

        val groupInfo = GroupInfo(
            name = "Shere Bangla Concert",
            memberCount = "100+ Members",
            avatarRes = R.drawable.group_34057
        )

        val messages = listOf(
            GroupChatMessage("5", currentUser, "kepriwe kie rawone ra mudun-mudun", "08:50 AM"),
            GroupChatMessage("4", currentUser, "Halo, bro", "08:50 AM"),
            GroupChatMessage("3", jhon, "hooн kie selak kaliren weteng inyong...", "1m ago"),
            GroupChatMessage(
                id = "2",
                sender = zara,
                text = "hooн kie selak kaliren weteng inyong...",
                timestamp = "1m ago",
                imageAttachments = listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp)
            ),
            GroupChatMessage("1", currentUser, "opo tak tuku bae", "08:50 AM")
        )

        _uiState.update {
            it.copy(
                groupInfo = groupInfo,
                messages = messages
            )
        }
    }

    // --- Event Handlers ---
    fun onBackClick() { println("Back clicked") }
    fun onSearchClick() { println("Search clicked") }
    fun onMoreOptionsClick() { println("More options clicked") }
    fun onCurrentMessageChange(newMessage: String) {
        _uiState.update { it.copy(currentMessage = newMessage) }
    }
    fun onSendMessageClick() {
        // Logic to send a new message...
    }
}