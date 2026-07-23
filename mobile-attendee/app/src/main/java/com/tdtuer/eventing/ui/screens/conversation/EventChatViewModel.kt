package com.tdtuer.eventing.ui.screens.eventchat

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// --- Data Models ---
data class User(
    val id: String,
    val name: String,
    @DrawableRes val avatarRes: Int
)

data class EventChatMessage(
    val id: String,
    val sender: User,
    val text: String?,
    val timestamp: String,
    val imageAttachments: List<Int> = emptyList()
)

data class EventChatUiState(
    val eventName: String = "",
    val messages: List<EventChatMessage> = emptyList(),
    val currentMessage: String = "",
    val currentUserId: String = "me"
)

class EventChatViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(EventChatUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadEventChat()
    }

    private fun loadEventChat() {
        val currentUser = User("me", "MyUser", R.drawable.default_pfp)
        val otherUser = User("2", "Zara Cla", R.drawable.default_pfp)

        val messages = listOf(
            EventChatMessage("6", currentUser, "Njaluk duwite yoo", "08:50 AM"),
            EventChatMessage("5", currentUser, "karuane inyong metu nyang pasar bae", "08:50 AM"),
            EventChatMessage("4", currentUser, "opo tak tuku bae", "08:50 AM"),
            EventChatMessage(
                id = "3",
                sender = otherUser,
                text = "hooн kie selak kaliren weteng inyong...",
                timestamp = "1m ago",
                imageAttachments = listOf(R.drawable.default_pfp, R.drawable.default_pfp, R.drawable.default_pfp) // Images
            ),
            EventChatMessage("2", currentUser, "kepriwe kie rawone ra mudun-mudun", "08:50 AM"),
            EventChatMessage("1", currentUser, "Halo, bro", "08:50 AM")
        )

        _uiState.update {
            it.copy(
                eventName = "Shere Bangla Concert",
                messages = messages
            )
        }
    }

    // --- Event Handlers ---
    fun onMoreOptionsClick() {
        println("More options clicked")
    }

    fun onCurrentMessageChange(newMessage: String) {
        _uiState.update { it.copy(currentMessage = newMessage) }
    }

    fun onSendMessageClick() {
        val messageText = _uiState.value.currentMessage
        if (messageText.isNotBlank()) {
            val newMessage = EventChatMessage(
                id = (_uiState.value.messages.size + 1).toString(),
                sender = User("me", "MyUser", R.drawable.default_pfp), // Assuming current user
                text = messageText,
                timestamp = "Just Now"
            )
            _uiState.update {
                it.copy(
                    messages = it.messages + newMessage,
                    currentMessage = ""
                )
            }
        }
    }
}