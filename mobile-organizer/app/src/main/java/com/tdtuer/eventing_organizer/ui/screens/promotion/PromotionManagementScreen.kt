package com.tdtuer.eventing_organizer.ui.screens.promotion

import android.app.DatePickerDialog
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.tdtuer.eventing_organizer.domain.model.Promotion
import com.tdtuer.eventing_organizer.ui.theme.AppTheme
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PromotionManagementScreen(
    navController: NavController,
    viewModel: PromotionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var showCreateDialog by remember { mutableStateOf(false) }

    // Hiển thị Toast khi có thông báo
    LaunchedEffect(uiState.successMessage, uiState.error) {
        uiState.successMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.clearMessages()
        }
        uiState.error?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearMessages()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Quản lý Khuyến mãi", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppTheme.colorScheme.background)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showCreateDialog = true },
                containerColor = AppTheme.colorScheme.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add")
            }
        },
        containerColor = AppTheme.colorScheme.background
    ) { padding ->
        if (uiState.isLoading && uiState.promotions.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (uiState.promotions.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Chưa có mã giảm giá nào.", color = Color.Gray)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .padding(padding)
                    .fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(uiState.promotions) { promo ->
                    PromotionCard(
                        promotion = promo,
                        onDelete = { viewModel.deletePromotion(promo.id) }
                    )
                }
            }
        }

        if (showCreateDialog) {
            CreatePromotionDialog(
                onDismiss = { showCreateDialog = false },
                onConfirm = { code, value, type, limit, minQty, desc, validFrom, validUntil ->
                    viewModel.createPromotion(
                        code, value, type, validFrom, validUntil, limit, minQty, desc,
                        isPublic = true
                    )
                    showCreateDialog = false
                }
            )
        }
    }
}

@Composable
fun PromotionCard(promotion: Promotion, onDelete: () -> Unit) {
    val clipboardManager = LocalClipboardManager.current
    val isActive = promotion.isActive() // Giả sử Domain Model có hàm này
    val statusColor = if (isActive) Color(0xFF4CAF50) else Color.Gray

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = promotion.code,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = AppTheme.colorScheme.primary
                    )
                    IconButton(
                        onClick = { clipboardManager.setText(AnnotatedString(promotion.code)) },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.ContentCopy, null, tint = Color.Gray, modifier = Modifier.size(16.dp))
                    }
                }

                Surface(
                    color = statusColor.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = if (isActive) "Active" else "Expired",
                        color = statusColor,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(Modifier.height(8.dp))
            val discountText = if (promotion.discountType == "percent") "${(promotion.discountValue * 100).toInt()}%" else "${promotion.discountValue.toInt()}đ"

            Text("Giảm: $discountText", fontWeight = FontWeight.Bold)
            Text("Đã dùng: ${promotion.usedCount} / ${promotion.usageLimit}", fontSize = 14.sp, color = Color.Gray)
            Text("Hết hạn: ${formatDate(promotion.validUntil)}", fontSize = 14.sp, color = Color.Gray)

            if (promotion.description.isNotBlank()) {
                Text("Mô tả: ${promotion.description}", fontSize = 13.sp, color = Color.Gray, fontStyle = FontStyle.Italic)
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, "Delete", tint = Color.Red)
                }
            }
        }
    }
}

@Composable
fun CreatePromotionDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, Double, String, Int, Int, String, Long, Long) -> Unit
) {
    var code by remember { mutableStateOf("") }
    var discountValue by remember { mutableStateOf("") }
    var usageLimit by remember { mutableStateOf("100") }
    var minQty by remember { mutableStateOf("1") }
    var description by remember { mutableStateOf("") }
    var isPercent by remember { mutableStateOf(false) }

    // Date state
    var validUntil by remember { mutableStateOf(System.currentTimeMillis() + 2592000000L) } // +30 days
    val context = LocalContext.current
    val calendar = Calendar.getInstance()

    val datePickerDialog = DatePickerDialog(
        context,
        { _, year, month, dayOfMonth ->
            calendar.set(year, month, dayOfMonth)
            validUntil = calendar.timeInMillis
        },
        calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Tạo Mã Giảm Giá") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it.uppercase() },
                    label = { Text("Mã Code (VD: SALE50)") },
                    singleLine = true
                )

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isPercent, onCheckedChange = { isPercent = it })
                    Text("Giảm theo % (VD: 10%)")
                }

                OutlinedTextField(
                    value = discountValue,
                    onValueChange = { discountValue = it },
                    label = { Text(if(isPercent) "Nhập 0.1 cho 10%" else "Số tiền giảm (VNĐ)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true
                )

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = usageLimit,
                        onValueChange = { usageLimit = it },
                        label = { Text("Lượt dùng") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                    OutlinedTextField(
                        value = minQty,
                        onValueChange = { minQty = it },
                        label = { Text("Min Vé") },
                        modifier = Modifier.weight(1f),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                }

                OutlinedTextField(
                    value = formatDate(validUntil),
                    onValueChange = {},
                    label = { Text("Hết hạn") },
                    readOnly = true,
                    trailingIcon = {
                        IconButton(onClick = { datePickerDialog.show() }) {
                            Icon(Icons.Default.DateRange, null)
                        }
                    }
                )

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Mô tả ngắn") }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val value = discountValue.toDoubleOrNull() ?: 0.0
                    val limit = usageLimit.toIntOrNull() ?: 100
                    val min = minQty.toIntOrNull() ?: 1
                    val type = if (isPercent) "percent" else "amount"

                    if (code.isNotBlank() && value > 0) {
                        onConfirm(code, value, type, limit, min, description, System.currentTimeMillis(), validUntil)
                    }
                }
            ) { Text("Tạo") }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Hủy") }
        }
    )
}

fun formatDate(millis: Long): String {
    val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
    return sdf.format(Date(millis))
}