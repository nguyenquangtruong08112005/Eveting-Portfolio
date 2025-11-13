package com.tdtuer.eventing.ui.screens.home

import android.annotation.SuppressLint
import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.DecayAnimationSpec
import androidx.compose.animation.core.tween
import androidx.compose.animation.rememberSplineBasedDecay
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.AnchoredDraggableState
import androidx.compose.foundation.gestures.DraggableAnchors
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.anchoredDraggable
import androidx.compose.foundation.gestures.animateTo
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.HorizontalDivider
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.unit.lerp
import androidx.compose.ui.util.lerp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.tdtuer.eventing.R
import com.tdtuer.eventing.ui.theme.EventingTheme
import com.tdtuer.eventing.ui.navigation.Screen
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

// 1. Định nghĩa trạng thái Mở/Đóng
enum class CustomDrawerValue { Closed, Open }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppWithDrawer(
    viewModel: MainAppWithDrawerViewModel = viewModel(),
    navController: NavController
) {
    val scope = rememberCoroutineScope()
    val density = LocalDensity.current

    // 1. Define animation specs
    val snapAnimationSpec: AnimationSpec<Float> = remember { tween() }
    val decayAnimationSpec: DecayAnimationSpec<Float> = rememberSplineBasedDecay()

    // 2. Initialize the state safely
    val state = rememberSaveable(saver = AnchoredDraggableState.Saver()) {
        AnchoredDraggableState(
            initialValue = CustomDrawerValue.Closed,
            anchors = DraggableAnchors { }, // Initialize with empty anchors
            positionalThreshold = { totalDistance: Float -> totalDistance * 0.5f },
            velocityThreshold = { with(density) { 100.dp.toPx() } },
            snapAnimationSpec = snapAnimationSpec,
            decayAnimationSpec = decayAnimationSpec
        )
    }

    // 3. Calculate anchors and update the state in an effect
    val openOffset = with(density) { 300.dp.toPx() }
    val anchors = remember(openOffset) {
        DraggableAnchors {
            CustomDrawerValue.Closed at 0f
            CustomDrawerValue.Open at openOffset
        }
    }

    LaunchedEffect(anchors) {
        if (anchors != state.anchors) { // Prevent unnecessary updates
            state.updateAnchors(anchors)
        }
    }

    // 4. Guard against access before anchors are set
    val areAnchorsSet = state.anchors.size > 0

    // Calculations for UI effects
    val rawOffset = state.offset
    // Ensure openOffset isn't zero to avoid division by zero
    val currentOffset = if (areAnchorsSet && !rawOffset.isNaN()) rawOffset.coerceIn(0f, openOffset) else 0f
    val progress = if (openOffset > 0f) (currentOffset / openOffset).coerceIn(0f, 1f) else 0f
    val scale = lerp(1f, 0.8f, progress)
    val cornerRadius = lerp(0.dp, 32.dp, progress)
    val elevation = lerp(0.dp, 16.dp, progress)

    val navigateToLogin by viewModel.navigateToLogin.collectAsState()

    LaunchedEffect(navigateToLogin) {
        if (navigateToLogin) {
            navController.navigate(Screen.SignIn.route) {
                popUpTo(navController.graph.startDestinationId) {
                    inclusive = true
                }
            }
            viewModel.onNavigationHandled()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        AppDrawerContent(
            viewModel = viewModel,
            navController = navController,
            onCloseDrawer = {
                scope.launch {
                    if (areAnchorsSet) state.animateTo(CustomDrawerValue.Closed)
                }
            }
        )

        HomeScreen(
            navController = navController,
            onMenuClick = {
                scope.launch {
                    if (areAnchorsSet) state.animateTo(CustomDrawerValue.Open)
                }
            },
            modifier = Modifier
                .fillMaxSize()
                .offset {
                    IntOffset(x = currentOffset.roundToInt(), y = 0)
                }
                .graphicsLayer(
                    scaleX = scale,
                    scaleY = scale,
                    shadowElevation = with(density) { elevation.toPx() },
                    shape = RoundedCornerShape(cornerRadius),
                    clip = true
                )
                .anchoredDraggable(
                    state = state,
                    orientation = Orientation.Horizontal,
                    enabled = areAnchorsSet // Only enable when anchors are set
                )
                .clickable(
                    enabled = areAnchorsSet && (state.targetValue == CustomDrawerValue.Open || state.currentValue == CustomDrawerValue.Open),
                    onClickLabel = "Close Drawer",
                    indication = null,
                    interactionSource = remember { MutableInteractionSource() },
                    onClick = {
                        scope.launch {
                            if (areAnchorsSet) state.animateTo(CustomDrawerValue.Closed)
                        }
                    }
                )
        )
    }
}


// --- Composable cho nội dung bên trong menu trượt ---
// (Không thay đổi, giữ nguyên như file của bạn)
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppDrawerContent(
    viewModel: MainAppWithDrawerViewModel, onCloseDrawer: () -> Unit, navController: NavController
) {
    val menuItems by viewModel.menuItems
    val selectedItem = viewModel.selectedItem

    ModalDrawerSheet(
        modifier = Modifier.width(300.dp),
        drawerContainerColor = MaterialTheme.colorScheme.background,
        drawerContentColor = MaterialTheme.colorScheme.onSurface
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
                    painter = painterResource(id = R.drawable.default_pfp),
                    contentDescription = "User Avatar",
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape),
                    contentScale = ContentScale.Crop
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Ashfak Sayem", fontWeight = FontWeight.Bold, fontSize = 18.sp
                )
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
                    onClick = {
                        // Sửa lại logic click (từ các bước trước)
                        viewModel.onMenuItemSelected(item) // Chỉ cập nhật state
                        navController.navigate(item.route) // Tự điều hướng
                        onCloseDrawer() // Tự đóng
                    },
                    modifier = Modifier.padding(NavigationDrawerItemDefaults.ItemPadding),
                    colors = NavigationDrawerItemDefaults.colors(
                        unselectedContainerColor = Color.Transparent,
                        selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                        unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        selectedIconColor = MaterialTheme.colorScheme.primary
                    )
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(Modifier, DividerDefaults.Thickness, DividerDefaults.color)
            Spacer(modifier = Modifier.height(16.dp))

            NavigationDrawerItem(
                label = { Text("Sign Out") },
                icon = { Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign Out") },
                selected = false,
                onClick = { viewModel.onSignOutClick(onCloseDrawer) },
                colors = NavigationDrawerItemDefaults.colors(
                    unselectedContainerColor = Color.Transparent
                )
            )

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = { viewModel.onUpgradeProClick(onCloseDrawer) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFE0F7FA), contentColor = Color(0xFF00BFA5)
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

// ... (Phần Preview giữ nguyên) ...
@SuppressLint("ViewModelConstructorInComposable")
@Preview(showBackground = true)
@Composable
fun MainAppWithDrawerPreview() {
    EventingTheme {
//        MainAppWithDrawer(
//            viewModel = MainAppWithDrawerViewModel(), navController = rememberNavController()
//        )
    }
}
