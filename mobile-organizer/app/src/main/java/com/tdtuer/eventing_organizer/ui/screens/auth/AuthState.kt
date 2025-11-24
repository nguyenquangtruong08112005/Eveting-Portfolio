package com.tdtuer.eventing_organizer.ui.screens.auth

import com.tdtuer.eventing_organizer.domain.model.User

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val user: User) : AuthState()
    data class Error(val message: String) : AuthState()
}
