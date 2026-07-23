package com.tdtuer.eventing.ui.screens.home

import android.content.Context
import android.content.Intent
import android.net.Uri
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
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// --- Data Model cho một mục trong menu ---
data class MenuItem(
    val title: String,
    val icon: ImageVector,
    val badgeCount: Int? = null,
    val route: String, // Added for navigation purposes, can be adapted
    val isExternal: Boolean = false // Cờ đánh dấu link ngoài (Contact Us)
)

@HiltViewModel
class MainAppWithDrawerViewModel @Inject constructor(
    private val signOutUseCase: SignOutUseCase,
    @ApplicationContext private val context: Context // Inject Context để mở Intent
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
            MenuItem("Calendar", Icons.Default.CalendarToday, route = Screen.Calendar.route), // Link tới CalendarScreen
            MenuItem("Bookmark", Icons.Default.Bookmark, route = Screen.Bookmark.route), // Link tới WishlistScreen
            MenuItem("Contact Us", Icons.Default.Email, route = "mailto:nguyenquangtruong08112005@gmail.com", isExternal = true),
            MenuItem("Settings", Icons.Default.Settings, route = Screen.Settings.route),
            MenuItem("Helps & FAQs", Icons.AutoMirrored.Filled.Help, route = Screen.HelpFaqs.route),
        )
    }

    fun onMenuItemSelected(item: MenuItem) {
        selectedItem = item
    }

    fun onMenuItemClick(item: MenuItem, navController: androidx.navigation.NavController, closeDrawerCallback: () -> Unit) {
        selectedItem = item
        closeDrawerCallback() // Đóng drawer trước khi thực hiện hành động

        if (item.isExternal) {
            // Xử lý mở Email hoặc Web
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(item.route))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            try {
                context.startActivity(intent)
            } catch (e: Exception) {
                // Handle error (ví dụ không có app mail)
            }
        } else {
            // Điều hướng nội bộ
            navController.navigate(item.route)
        }
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
