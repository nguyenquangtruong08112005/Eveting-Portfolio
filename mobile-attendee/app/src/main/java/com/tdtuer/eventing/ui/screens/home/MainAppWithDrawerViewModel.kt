package com.tdtuer.eventing.ui.screens.home

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Help
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tdtuer.eventing.domain.usecase.authentication.SignOutUseCase
import com.tdtuer.eventing.ui.navigation.Screen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// --- Data Model cho một mục trong menu ---
data class MenuItem(
    val title: String,
    val icon: ImageVector,
    val badgeCount: Int? = null,
    val route: String // Added for navigation purposes, can be adapted
)

@HiltViewModel
class MainAppWithDrawerViewModel @Inject constructor(
    private val signOutUseCase: SignOutUseCase
) : ViewModel() {

    private val _menuItems = mutableStateOf<List<MenuItem>>(emptyList())
    val menuItems: State<List<MenuItem>> = _menuItems

    private val _navigateToLogin = MutableStateFlow(false)
    val navigateToLogin = _navigateToLogin.asStateFlow()

    // Initial selected item can be the first one, or based on current route
    var selectedItem by mutableStateOf<MenuItem?>(null)
        private set

    init {
        loadMenuItems()
        // Set initial selected item, e.g., the first one if list is not empty
        if (_menuItems.value.isNotEmpty()) {
            selectedItem = _menuItems.value[0]
        }
    }

    private fun loadMenuItems() {
        _menuItems.value = listOf(
            MenuItem("My Profile", Icons.Default.Person, route = Screen.Profile.route),
//            MenuItem("Message", Icons.AutoMirrored.Filled.Message, badgeCount = 3, route = "messages"),
            MenuItem("Calender", Icons.Default.CalendarToday, route = "calendar"),
            MenuItem("Bookmark", Icons.Default.Bookmark, route = "bookmarks"),
            MenuItem("Contact Us", Icons.Default.Email, route = "contact_us"),
            MenuItem("Settings", Icons.Default.Settings, route = "settings"),
            MenuItem("Helps & FAQs", Icons.AutoMirrored.Filled.Help, route = "help_faqs"),
        )
    }

    fun onMenuItemSelected(item: MenuItem) {
        selectedItem = item
    }

    fun onMenuItemClick(item: MenuItem, closeDrawerCallback: () -> Unit) {
        selectedItem = item
        println("Menu item clicked: ${item.title}, navigating to ${item.route}")
//        closeDrawerCallback() // Close drawer after item click
    }

    fun onSignOutClick(closeDrawerCallback: () -> Unit) {
        viewModelScope.launch {
            signOutUseCase()
            _navigateToLogin.value = true
            closeDrawerCallback()
        }
    }

    fun onNavigationHandled() {
        _navigateToLogin.value = false
    }

    fun onUpgradeProClick(closeDrawerCallback: () -> Unit) {
        // TODO: Implement upgrade pro logic
        println("Upgrade Pro clicked")
        closeDrawerCallback()
    }
}
