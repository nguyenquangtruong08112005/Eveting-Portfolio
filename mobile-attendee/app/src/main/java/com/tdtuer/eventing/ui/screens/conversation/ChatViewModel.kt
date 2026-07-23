package com.tdtuer.eventing.ui.screens.chat

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// --- Data Models ---
data class Message(
    val id: String,
    val text: String,
    val timestamp: String,
    val senderId: String
)

data class User(
    val id: String,
    val name: String,
    val email: String,
    @DrawableRes val avatarRes: Int
)

data class ChatUiState(
    val messages: List<Message> = emptyList(),
    val currentMessage: String = "",
    val conversationPartner: User? = null,
    val currentUserId: String = "me" // A static ID for the current user
)

class ChatViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(ChatUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadChatHistory()
    }

    private fun loadChatHistory() {
        // This is where you would fetch data from a repository/API
        val partner = User("2", "David Silbia", "davidsilbia1997@gmail.com", R.drawable.default_pfp)
        val messages = listOf(
            Message("1", "peeн ra modal koen cuk", "07:52 AM", "2"),
            Message("2", "Njaluk duwite yoo", "07:53 AM", "me"),
            Message("3", "karuane inyong metu nyang pasar bae", "07:53 AM", "me"),
            Message("4", "opo tak tuku bae", "07:53 AM", "me"),
            Message("5", "hooн kie selak kaliren weteng inyong...", "08:01 AM", "2"),
            Message("6", "kepriwe kie rawone ra mudun-mudun", "08:50 AM", "me"),
            Message("7", "Halo, bro", "08:50 AM", "me")
        )
        _uiState.update {
            it.copy(conversationPartner = partner, messages = messages)
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
        val messageText = _uiState.value.currentMessage
        if (messageText.isNotBlank()) {
            val newMessage = Message(
                id = (_uiState.value.messages.size + 1).toString(),
                text = messageText,
                timestamp = "09:41 AM", // In a real app, generate a real timestamp
                senderId = _uiState.value.currentUserId
            )
            _uiState.update {
                it.copy(
                    messages = it.messages + newMessage,
                    currentMessage = "" // Clear the input field
                )
            }
        }
    }
}