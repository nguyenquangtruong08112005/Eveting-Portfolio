package com.tdtuer.eventing.ui.screens.buyticket

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.Discount // Icon Mới
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.tdtuer.eventing.domain.model.Promotion
import com.tdtuer.eventing.helpers.formatVNCurrency
import com.tdtuer.eventing.ui.navigation.Screen
import com.tdtuer.eventing.ui.theme.AppTheme
import com.tdtuer.eventing.ui.theme.EventingTheme
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuyTicketScreen(viewModel: BuyTicketViewModel, navController: NavHostController) {
    val uiState by viewModel.uiState.collectAsState()
    val sheetState = rememberModalBottomSheetState()

    LaunchedEffect(Unit) {
        viewModel.navigationEvent.collect { event ->
            when (event) {
                is BuyTicketViewModel.NavigationEvent.GoToPayment -> {
                    navController.navigate(Screen.Payment.createRoute(event.ticketId))
                }
            }
        }
    }

    // --- MỚI: BOTTOM SHEET DANH SÁCH VOUCHER ---
    if (uiState.isShowPromoSheet) {
        ModalBottomSheet(
            onDismissRequest = { viewModel.hidePromoSheet() },
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            PromotionListContent(
                promotions = uiState.availablePromotions,
                onSelectPromotion = { viewModel.onPromotionSelected(it) }
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Select Ticket", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AppTheme.colorScheme.background)
            )
        },
        bottomBar = {
            TicketPurchaseBottomBar(
                totalPrice = uiState.finalTotalPrice,
                originalPrice = if (uiState.discountAmount > 0) uiState.subTotal else null,
                onContinueClick = { viewModel.onContinueClick() },
                isLoading = uiState.isLoading
            )
        },
        containerColor = AppTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(16.dp)
                .fillMaxSize()
        ) {
            // 1. Ticket Types
            SectionTitle("Ticket Type")
            TicketTypeSelector(
                ticketTypes = uiState.ticketTypes,
                selectedType = uiState.selectedTicketType,
                onTypeSelected = viewModel::onTicketTypeSelected
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 2. Quantity
            SectionTitle("Quantity")
            QuantitySelector(
                quantity = uiState.quantity,
                onIncrease = viewModel::onIncreaseQuantity,
                onDecrease = viewModel::onDecreaseQuantity
            )

            Spacer(modifier = Modifier.height(24.dp))

            // 3. Voucher Section (ĐÃ CẬP NHẬT)
            SectionTitle("Promo Code")
            if (uiState.appliedVoucherCode == null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = uiState.voucherCode,
                        onValueChange = viewModel::onVoucherCodeChange,
                        placeholder = { Text("Enter code") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        trailingIcon = {
                            // Nút mở danh sách voucher
                            IconButton(onClick = { viewModel.showPromoSheet() }) {
                                Icon(Icons.Default.Discount, contentDescription = "List", tint = AppTheme.colorScheme.primary)
                            }
                        }
                    )
                    Button(
                        onClick = { viewModel.onApplyVoucher() },
                        enabled = !uiState.isCheckingVoucher && uiState.voucherCode.isNotBlank(),
                        shape = MaterialTheme.shapes.small
                    ) {
                        if (uiState.isCheckingVoucher) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White)
                        } else {
                            Text("Apply")
                        }
                    }
                }
            } else {
                // Voucher đã áp dụng
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                    border = BorderStroke(1.dp, Color(0xFF4CAF50))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF4CAF50))
                            Spacer(Modifier.width(8.dp))
                            Column {
                                Text("Applied: ${uiState.appliedVoucherCode}", fontWeight = FontWeight.Bold, color = Color(0xFF2E7D32))
                                Text("-${formatVNCurrency(uiState.discountAmount)}", fontSize = 12.sp, color = Color(0xFF2E7D32))
                            }
                        }
                        IconButton(onClick = { viewModel.onRemoveVoucher() }) {
                            Icon(Icons.Default.Close, "Remove", tint = Color(0xFF2E7D32))
                        }
                    }
                }
            }
            // Voucher Message
            uiState.voucherMessage?.let { msg ->
                Text(
                    text = msg,
                    color = if (uiState.appliedVoucherCode != null) Color(0xFF4CAF50) else MaterialTheme.colorScheme.error,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // 4. Summary
            SectionTitle("Summary")
            PriceBreakdown(
                ticketType = uiState.selectedTicketType.name,
                pricePerTicket = uiState.ticketPrice,
                quantity = uiState.quantity,
                discount = uiState.discountAmount
            )

            uiState.errorMessage?.let { error ->
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

// --- MỚI: UI CHO BOTTOM SHEET ---
@Composable
fun PromotionListContent(
    promotions: List<Promotion>,
    onSelectPromotion: (Promotion) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
            .heightIn(max = 500.dp) // Giới hạn chiều cao
    ) {
        Text(
            "Available Promotions",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        if (promotions.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                Text("No promotions available for this event.", color = Color.Gray)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(promotions) { promo ->
                    PromotionItemRow(promo, onSelectPromotion)
                }
            }
        }
    }
}

@Composable
fun PromotionItemRow(promo: Promotion, onSelect: (Promotion) -> Unit) {
    Card(
        onClick = { onSelect(promo) },
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
        border = BorderStroke(1.dp, Color.LightGray)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon Ticket
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(AppTheme.colorScheme.primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.ConfirmationNumber, null, tint = AppTheme.colorScheme.primary)
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = promo.code,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = AppTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    val discountDisplay = if(promo.discountType == "percent")
                        "${(promo.discountValue * 100).toInt()}%"
                    else
                        formatVNCurrency(promo.discountValue)

                    Surface(color = Color(0xFFE8F5E9), shape = RoundedCornerShape(4.dp)) {
                        Text("-$discountDisplay", fontSize = 10.sp, color = Color(0xFF2E7D32), modifier = Modifier.padding(horizontal = 4.dp))
                    }
                }
                if (promo.description.isNotBlank()) {
                    Text(promo.description, fontSize = 12.sp, color = Color.Gray, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Text(
                    "Expires: ${formatDate(promo.validUntil)}",
                    fontSize = 10.sp,
                    color = Color.Gray
                )
            }

            Button(
                onClick = { onSelect(promo) },
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                modifier = Modifier.height(32.dp)
            ) {
                Text("Apply", fontSize = 12.sp)
            }
        }
    }
}

private fun formatDate(millis: Long): String {
    val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
    return sdf.format(Date(millis))
}

// ... (Các Composable cũ giữ nguyên: SectionTitle, TicketTypeSelector, QuantitySelector, PriceBreakdown, TicketPurchaseBottomBar) ...

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(bottom = 12.dp)
    )
}

@Composable
private fun TicketTypeSelector(
    ticketTypes: List<TicketType>,
    selectedType: TicketType,
    onTypeSelected: (TicketType) -> Unit
) {
    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        ticketTypes.forEach { type ->
            val isSelected = type.name == selectedType.name
            Button(
                onClick = { onTypeSelected(type) },
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp),
                shape = MaterialTheme.shapes.medium,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            ) {
                Text(type.name, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun QuantitySelector(
    quantity: Int,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit
) {
    OutlinedCard(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            IconButton(onClick = onDecrease) {
                Icon(Icons.Default.Remove, contentDescription = "Decrease Quantity")
            }
            Text(
                text = quantity.toString().padStart(2, '0'),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
            IconButton(onClick = onIncrease) {
                Icon(Icons.Default.Add, contentDescription = "Increase Quantity")
            }
        }
    }
}

@Composable
private fun PriceBreakdown(ticketType: String, pricePerTicket: Double, quantity: Int, discount: Double) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("$ticketType Ticket x $quantity", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(formatVNCurrency(pricePerTicket * quantity), fontWeight = FontWeight.Medium)
        }

        if (discount > 0) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Discount", color = Color(0xFF4CAF50))
                Text("-${formatVNCurrency(discount)}", color = Color(0xFF4CAF50), fontWeight = FontWeight.Medium)
            }
        }

        HorizontalDivider()

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("Total", fontWeight = FontWeight.Bold)
            Text(formatVNCurrency((pricePerTicket * quantity) - discount), fontWeight = FontWeight.Bold, color = AppTheme.colorScheme.primary)
        }
    }
}

@Composable
private fun TicketPurchaseBottomBar(
    totalPrice: Double,
    originalPrice: Double?,
    onContinueClick: () -> Unit,
    isLoading: Boolean
) {
    Surface(shadowElevation = 16.dp) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "Total Price",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 14.sp
                    )
                    if (originalPrice != null) {
                        Text(
                            formatVNCurrency(originalPrice),
                            fontWeight = FontWeight.Normal,
                            fontSize = 14.sp,
                            textDecoration = TextDecoration.LineThrough,
                            color = Color.Gray
                        )
                    }
                    Text(formatVNCurrency(totalPrice), fontWeight = FontWeight.Bold, fontSize = 22.sp, color = AppTheme.colorScheme.primary)
                }

                Button(
                    onClick = onContinueClick,
                    enabled = !isLoading,
                    modifier = Modifier
                        .height(50.dp)
                        .width(150.dp),
                    shape = MaterialTheme.shapes.medium,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF212121))
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("CONTINUE", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Preview(showSystemUi = true)
@Composable
fun BuyTicketScreenPreview() {
    EventingTheme {
        BuyTicketScreen(viewModel = viewModel(), navController = rememberNavController())
    }
}