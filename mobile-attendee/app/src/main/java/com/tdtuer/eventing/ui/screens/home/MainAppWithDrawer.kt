package com.tdtuer.eventing.ui.screens.home

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels // Added for ViewModel
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
// MenuItem data class is now in the ViewModel
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.R // Ensure R class is available
import com.tdtuer.eventing.ui.theme.EventingTheme
import kotlinx.coroutines.launch

// --- Activity ---
class MainActivityWithDrawer : ComponentActivity() {
    private val viewModel: MainAppWithDrawerViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                // Pass ViewModel to MainAppWithDrawer, which can then pass to AppDrawerContent
                MainAppWithDrawer(viewModel = viewModel)
            }
        }
    }
}

// --- Composable chính chứa cả Drawer và màn hình Home ---
@Composable
fun MainAppWithDrawer(viewModel: MainAppWithDrawerViewModel) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            AppDrawerContent(
                viewModel = viewModel, // Pass ViewModel here
                onCloseDrawer = {
                    scope.launch { drawerState.close() }
                }
            )
        }
    ) {
        // HomeScreen can remain independent or also take parts of the ViewModel if needed
        HomeScreen1(
            onMenuClick = {
                scope.launch { drawerState.open() }
            }
        )
    }
}


// --- Composable cho nội dung bên trong menu trượt ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppDrawerContent(viewModel: MainAppWithDrawerViewModel, onCloseDrawer: () -> Unit) {
    val menuItems by viewModel.menuItems
    val selectedItem = viewModel.selectedItem // This is observable directly

    ModalDrawerSheet(
        modifier = Modifier.width(300.dp) // Giới hạn chiều rộng của Drawer
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Image(
                    painter = painterResource(id = R.drawable.default_pfp), // Placeholder, could come from user data in ViewModel
                    contentDescription = "User Avatar",
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text("Ashfak Sayem", fontWeight = FontWeight.Bold, fontSize = 18.sp) // Placeholder, could come from user data
            }
            Spacer(modifier = Modifier.height(16.dp))

            menuItems.forEach { item ->
                NavigationDrawerItem(
                    label = { Text(item.title) },
                    icon = { Icon(item.icon, contentDescription = item.title) },
                    badge = {
                        item.badgeCount?.let {
                            Badge { Text(it.toString()) }
                        }
                    },
                    selected = item == selectedItem,
                    onClick = { viewModel.onMenuItemClick(item, onCloseDrawer) },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            Divider()
            Spacer(modifier = Modifier.height(16.dp))

            NavigationDrawerItem(
                label = { Text("Sign Out") },
                icon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign Out") },
                selected = false,
                onClick = { viewModel.onSignOutClick(onCloseDrawer) }
            )

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = { viewModel.onUpgradeProClick(onCloseDrawer) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFE0F7FA),
                    contentColor = Color(0xFF00BFA5)
                ),
                contentPadding = PaddingValues(vertical = 12.dp)
            ) {
                Icon(Icons.Default.WorkspacePremium, contentDescription = "Upgrade Pro")
                Spacer(modifier = Modifier.width(8.dp))
                Text("Upgrade Pro")
            }
        }
    }
}

// Assuming HomeScreen is defined elsewhere or below, and takes onMenuClick
@Composable
fun HomeScreen1(onMenuClick: () -> Unit = {}) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column {
            Text("Đây là Màn hình Home", fontSize = 22.sp)
            Button(onClick = onMenuClick) {
                Text("Mở Menu")
            }
        }
    }
}


@Preview(showBackground = true)
@Composable
fun MainAppWithDrawerPreview() {
    EventingTheme {
        // For preview, create a new instance of the ViewModel
        MainAppWithDrawer(viewModel = MainAppWithDrawerViewModel())
    }
}
