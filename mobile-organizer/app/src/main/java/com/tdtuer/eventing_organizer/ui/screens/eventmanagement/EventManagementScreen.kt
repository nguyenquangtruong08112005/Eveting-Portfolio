package com.tdtuer.eventing_organizer.ui.screens.eventmanagement

import android.Manifest
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.accompanist.permissions.shouldShowRationale
import com.tdtuer.eventing_organizer.data.network.model.AttendeeDto
import com.tdtuer.eventing_organizer.data.network.model.EventStatsResponse
import com.tdtuer.eventing_organizer.helpers.AppUtils
import com.tdtuer.eventing_organizer.ui.navigation.Screen
import com.tdtuer.eventing_organizer.ui.theme.AppTheme

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun EventManagementScreen(
    navController: NavController,
    viewModel: EventManagementViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val dialogState by viewModel.dialogState.collectAsState()
    val context = LocalContext.current

    // --- PERMISSION STATE ---
    // Quyền ghi bộ nhớ chỉ cần thiết cho Android < 10 (API 29)
    val storagePermissionState = rememberPermissionState(
        Manifest.permission.WRITE_EXTERNAL_STORAGE
    )
    var showRationaleDialog by remember { mutableStateOf(false) }

    // File Picker cho Import
    // SỬA: Dùng "*/*" để cho phép chọn mọi loại file (tránh lỗi file bị mờ trên một số máy)
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri -> viewModel.onFileSelectedForImport(uri) }

    LaunchedEffect(uiState.successMessage) {
        uiState.successMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearMessage()
        }
    }
    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearMessage()
        }
    }

    // --- DIALOGS ---
    if (dialogState.showBroadcastDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.hideBroadcast() },
            title = { Text("Gửi thông báo") },
            text = {
                Column {
                    Text("Gửi thông báo đến tất cả khách đã mua vé.", fontSize = 14.sp, color = Color.Gray)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = dialogState.broadcastTitle,
                        onValueChange = viewModel::onBroadcastTitleChange,
                        label = { Text("Tiêu đề") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = dialogState.broadcastMessage,
                        onValueChange = viewModel::onBroadcastMessageChange,
                        label = { Text("Nội dung") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3
                    )
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.sendBroadcast() }) { Text("Gửi ngay") }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.hideBroadcast() }) { Text("Hủy") }
            }
        )
    }

    // --- DIALOG XUẤT FILE (Kết hợp Logic Permission) ---
    if (dialogState.showExportDialog) {
        AlertDialog(
            onDismissRequest = { viewModel.hideExport() },
            title = { Text("Xuất danh sách") },
            text = { Text("Bạn muốn xuất danh sách khách hàng ra file Excel (.xlsx)?") },
            confirmButton = {
                Button(
                    onClick = {
                        // Logic kiểm tra quyền trước khi xuất file
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            // Android 10+ không cần quyền WRITE_EXTERNAL_STORAGE cho getExternalFilesDir
                            viewModel.exportAttendees()
                        } else {
                            if (storagePermissionState.status.isGranted) {
                                viewModel.exportAttendees()
                            } else if (storagePermissionState.status.shouldShowRationale) {
                                // Nếu người dùng từng từ chối, hiện dialog giải thích
                                showRationaleDialog = true
                                viewModel.hideExport() // Ẩn dialog export để hiện dialog rationale
                            } else {
                                // Xin quyền lần đầu
                                storagePermissionState.launchPermissionRequest()
                            }
                        }
                    }
                ) { Text("Xuất File") }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.hideExport() }) { Text("Hủy") }
            }
        )
    }

    // --- DIALOG GIẢI THÍCH QUYỀN (Rationale) ---
    if (showRationaleDialog) {
        AlertDialog(
            onDismissRequest = { showRationaleDialog = false },
            title = { Text("Cần quyền truy cập") },
            text = { Text("Ứng dụng cần quyền ghi bộ nhớ để lưu file danh sách khách hàng vào thiết bị của bạn.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRationaleDialog = false
                        storagePermissionState.launchPermissionRequest()
                    }
                ) {
                    Text("Đồng ý cấp quyền")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRationaleDialog = false }) { Text("Không") }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(uiState.event?.name ?: "Quản lý sự kiện", maxLines = 1) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = {
                        navController.navigate(Screen.EditEvent.createRoute(viewModel.eventId))
                    }) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit Event")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppTheme.colorScheme.background)
            )
        },
        containerColor = AppTheme.colorScheme.background
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            // Tabs
            TabRow(
                selectedTabIndex = uiState.selectedTab,
                containerColor = AppTheme.colorScheme.background,
                contentColor = AppTheme.colorScheme.primary
            ) {
                Tab(
                    selected = uiState.selectedTab == 0,
                    onClick = { viewModel.onTabSelected(0) },
                    text = { Text("Tổng quan") })
                Tab(
                    selected = uiState.selectedTab == 1,
                    onClick = { viewModel.onTabSelected(1) },
                    text = { Text("Khách tham dự") })
            }

            if (uiState.isLoading && uiState.event == null) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                when (uiState.selectedTab) {
                    0 -> OverviewTab(
                        stats = uiState.stats,
                        onViewStatsClick = {
                            // --- ĐIỀU HƯỚNG ĐẾN TRANG THỐNG KÊ ---
                            navController.navigate(Screen.EventStats.createRoute(viewModel.eventId))
                        }
                    )
                    1 -> GuestListTab(
                        attendees = uiState.attendees,
                        onImportClick = {
                            // SỬA: Cho phép chọn tất cả loại file (*/*)
                            filePickerLauncher.launch("*/*")
                        },
                        onExportClick = { viewModel.showExport() },
                        onBroadcastClick = { viewModel.showBroadcast() }
                    )
                }
            }
        }
    }
}

// ... OverviewTab cập nhật ...
@Composable
fun OverviewTab(
    stats: EventStatsResponse?,
    onViewStatsClick: () -> Unit // <-- THÊM PARAMETER NÀY
) {
    if (stats == null) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) { Text("Chưa có dữ liệu thống kê") }
        return
    }

    Column(
        modifier = Modifier
            .padding(16.dp)
            .fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Revenue & Sales
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            StatBox(
                title = "Doanh thu",
                value = AppUtils.formatPrice(stats.totalRevenue),
                icon = Icons.Default.AttachMoney,
                color = Color(0xFF4CAF50),
                modifier = Modifier.weight(1f)
            )
            StatBox(
                title = "Vé đã bán",
                value = "${stats.ticketsSold?.values?.sum() ?: 0}",
                icon = Icons.Default.ConfirmationNumber,
                color = Color(0xFF2196F3),
                modifier = Modifier.weight(1f)
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            StatBox(
                title = "Lượt Check-in",
                value = "${stats.checkIns}",
                icon = Icons.Default.Person,
                color = Color(0xFFFF9800),
                modifier = Modifier.weight(1f)
            )
            StatBox(
                title = "Lượt xem",
                value = "${stats.views}",
                icon = Icons.Default.Visibility,
                color = Color(0xFF9C27B0),
                modifier = Modifier.weight(1f)
            )
        }

        // --- NÚT XEM THỐNG KÊ CHI TIẾT (MỚI) ---
        OutlinedButton(
            onClick = onViewStatsClick,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = AppTheme.colorScheme.primary),
            border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(AppTheme.colorScheme.primary))
        ) {
            Icon(Icons.Default.BarChart, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text("Xem biểu đồ & Phân tích chi tiết")
        }

        HorizontalDivider()

        Spacer(modifier = Modifier.height(8.dp))
        Text("Chi tiết loại vé", fontWeight = FontWeight.Bold, fontSize = 18.sp)

        val soldMap = stats.ticketsSold ?: emptyMap()

        if (soldMap.isEmpty()) {
            Text(
                "Chưa có dữ liệu bán vé.",
                color = Color.Gray,
                fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
            )
        } else {
            soldMap.forEach { (type, count) ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(type, fontWeight = FontWeight.Medium)
                    Text(
                        "$count vé",
                        fontWeight = FontWeight.Bold,
                        color = AppTheme.colorScheme.primary
                    )
                }
                HorizontalDivider()
            }
        }
    }
}

@Composable
fun StatBox(title: String, value: String, icon: ImageVector, color: Color, modifier: Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, null, tint = color, modifier = Modifier.size(32.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color.Black)
            Text(title, fontSize = 12.sp, color = Color.Gray)
        }
    }
}

@Composable
fun GuestListTab(
    attendees: List<AttendeeDto>,
    onImportClick: () -> Unit,
    onExportClick: () -> Unit,
    onBroadcastClick: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        // --- Toolbar công cụ ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            ActionIcon(Icons.Default.UploadFile, "Import", onImportClick)
            ActionIcon(Icons.Default.Download, "Export", onExportClick)
            ActionIcon(Icons.Default.Campaign, "Broadcast", onBroadcastClick)
        }
        HorizontalDivider()

        if (attendees.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Chưa có ai mua vé.", color = Color.Gray)
            }
        } else {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(attendees) { attendee ->
                    AttendeeItem(attendee)
                }
            }
        }
    }
}

@Composable
fun ActionIcon(icon: ImageVector, label: String, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable { onClick() }.padding(8.dp)) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(AppTheme.colorScheme.secondaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = label, tint = AppTheme.colorScheme.primary)
        }
        Spacer(Modifier.height(4.dp))
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
fun AttendeeItem(attendee: AttendeeDto) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Row(
            modifier = Modifier
                .padding(12.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            AsyncImage(
                model = attendee.user.profilePicUrl ?: "",
                contentDescription = null,
                modifier = Modifier
                    .size(50.dp)
                    .clip(CircleShape)
                    .background(Color.LightGray),
                contentScale = ContentScale.Crop
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(attendee.user.name, fontWeight = FontWeight.Bold)
                Text(attendee.user.email, fontSize = 12.sp, color = Color.Gray)
                Row(modifier = Modifier.padding(top = 4.dp)) {
                    Surface(
                        color = AppTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            text = attendee.ticket.type,
                            color = AppTheme.colorScheme.primary,
                            fontSize = 10.sp,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    if (attendee.ticket.seat != null) {
                        Spacer(Modifier.width(8.dp))
                        Surface(
                            color = Color.LightGray.copy(alpha = 0.5f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = "Ghế: ${attendee.ticket.seat}",
                                fontSize = 10.sp,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }

            // Status
            val (statusColor, statusText) = when (attendee.ticket.status) {
                "checkedIn" -> Color(0xFF4CAF50) to "Đã vào"
                "paid" -> Color(0xFF2196F3) to "Đã mua"
                else -> Color.Gray to attendee.ticket.status
            }

            Text(
                text = statusText,
                color = statusColor,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
        }
    }
}