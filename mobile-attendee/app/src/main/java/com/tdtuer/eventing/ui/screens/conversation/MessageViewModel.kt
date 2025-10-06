package com.tdtuer.eventing.ui.screens.message

import androidx.annotation.DrawableRes
import androidx.lifecycle.ViewModel
import com.tdtuer.eventing.R
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

// Data model for a single conversation
data class Conversation(
    val id: String,
    val senderName: String,
    val lastMessage: String,
    val timestamp: String,
    val unreadCount: Int,
    @DrawableRes val avatarRes: Int
)

// UI State for the entire screen
data class MessageUiState(
    val searchQuery: String = "",
    val conversations: List<Conversation> = emptyList()
)

class MessageViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(MessageUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadConversations()
    }

    private fun loadConversations() {
        // In a real app, this data would come from a database or API.
        // Replace R.drawable placeholders with your actual avatar images.
        val conversations = listOf(
            Conversation("1", "Cristofer", "Hi :)", "Just Now", 2, R.drawable.default_pfp),
            Conversation("2", "David Silbia", "This is very good", "3 min ago", 4, R.drawable.default_pfp),
            Conversation("3", "Micheal Ullasi", "Hey, How are you?", "10 min ago", 7, R.drawable.default_pfp),
            Conversation("4", "Ashfak Sayem", "Looking forward to it!", "27 min ago", 0, R.drawable.default_pfp),
            Conversation("5", "Roman Kutepov", "Nothing man, cheers!", "40 min ago", 0, R.drawable.default_pfp),
            Conversation("6", "Jhon Wick", "You can take this up?", "1 hour ago", 0, R.drawable.default_pfp),
            Conversation("7", "Zenifero Bolex", "Okay, Bye!", "1 day ago", 0, R.drawable.default_pfp),
            Conversation("8", "Rocks Velkeinien", "See you tomorrow", "1 day ago", 3, R.drawable.default_pfp)
        )
        _uiState.update { it.copy(conversations = conversations) }
    }

    fun onBackClick() {
        println("Back button clicked")
    }

    fun onMoreOptionsClick() {
        println("More options clicked")
    }

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        // TODO: Implement search filtering logic here
    }

    fun onConversationClick(conversationId: String) {
        println("Clicked on conversation with ID: $conversationId")
    }
}