package com.tdtuer.eventing.ui.screens

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.screens.ui.theme.EventingTheme
import kotlinx.coroutines.launch

// --- Data Model cho một mục trong menu ---
data class MenuItem(
    val title: String,
    val icon: ImageVector,
    val badgeCount: Int? = null
)

// --- Activity ---
class MainActivityWithDrawer : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EventingTheme {
                MainAppWithDrawer()
            }
        }
    }
}

// --- Composable chính chứa cả Drawer và màn hình Home ---
@Composable
fun MainAppWithDrawer() {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            AppDrawerContent(
                onCloseDrawer = {
                    scope.launch { drawerState.close() }
                }
            )
        }
    ) {
        // Đây là nội dung chính của ứng dụng
        // Chúng ta có thể đặt HomeScreen ở đây và truyền sự kiện mở Drawer vào
        HomeScreen(
            onMenuClick = {
                scope.launch { drawerState.open() }
            }
        )
    }
}


// --- Composable cho nội dung bên trong menu trượt ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppDrawerContent(onCloseDrawer: () -> Unit) {
    val menuItems = remember {
        listOf(
            MenuItem("My Profile", Icons.Default.Person),
            MenuItem("Message", Icons.Default.Message, badgeCount = 3),
            MenuItem("Calender", Icons.Default.CalendarToday),
            MenuItem("Bookmark", Icons.Default.Bookmark),
            MenuItem("Contact Us", Icons.Default.Email),
            MenuItem("Settings", Icons.Default.Settings),
            MenuItem("Helps & FAQs", Icons.Default.Help),
        )
    }
    var selectedItem by remember { mutableStateOf(menuItems[0]) }

    ModalDrawerSheet(
        modifier = Modifier.width(300.dp) // Giới hạn chiều rộng của Drawer
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .padding(16.dp)
        ) {
            // Header: Avatar và Tên
            Column(
                modifier = Modifier.padding(vertical = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Image(
                    painter = painterResource(id = R.drawable.default_pfp),
                    contentDescription = "User Avatar",
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text("Ashfak Sayem", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
            Spacer(modifier = Modifier.height(16.dp))

            // Danh sách các mục menu
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
                    onClick = {
                        selectedItem = item
                        onCloseDrawer()
                        // Xử lý điều hướng ở đây, ví dụ: navController.navigate(item.route)
                    },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            Divider()
            Spacer(modifier = Modifier.height(16.dp))

            // Mục Sign Out
            NavigationDrawerItem(
                label = { Text("Sign Out") },
                icon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign Out") },
                selected = false,
                onClick = { /* Handle sign out */ }
            )

            // Đẩy nút Upgrade Pro xuống dưới cùng
            Spacer(modifier = Modifier.weight(1f))

            // Nút Upgrade Pro
            Button(
                onClick = { /* Handle Upgrade Pro */ },
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

// Giả lập HomeScreen có nhận sự kiện onMenuClick
@Composable
fun HomeScreen(onMenuClick: () -> Unit = {}) {
    // Đây là nơi bạn đặt code HomeScreen đã tạo trước đó.
    // Chỉ cần đảm bảo Icon Menu có onClick = onMenuClick
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
        MainAppWithDrawer()
    }
}