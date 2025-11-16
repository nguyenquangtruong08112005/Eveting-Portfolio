package com.tdtuer.eventing.ui.screens.payment

import android.app.Activity
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ShoppingBasket
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.tdtuer.eventing.ui.navigation.Screen
//import com.tdtuer.eventing.ui.screens.payment.PaymentViewModel.PaymentEvent // <-- (2) Import
import com.tdtuer.eventing.ui.theme.EventingTheme
import kotlinx.coroutines.flow.collectLatest
import vn.zalopay.sdk.ZaloPayError
import vn.zalopay.sdk.ZaloPaySDK
import vn.zalopay.sdk.listeners.PayOrderListener

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentScreen(
    viewModel: PaymentViewModel = hiltViewModel(),
    navController: NavController
) {
    val uiState by viewModel.uiState.collectAsState()
    val sheetState = rememberModalBottomSheetState()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.paymentEvent.collectLatest { event ->
            when (event) {
                is PaymentEvent.RequestZaloPay -> {
                    // CÓ TOKEN! GỌI ZALOPAY SDK
                    // (Logic này lấy từ file merchantDemo/MainActivity.java của bạn)
                    ZaloPaySDK.getInstance().payOrder(
                        context as Activity, // SDK yêu cầu một Activity
                        event.zpToken,
                        "zp-554://app", // Scheme của bạn (với AppID 554)
                        object : PayOrderListener {
                            override fun onPaymentSucceeded(
                                transactionId: String,
                                transToken: String,
                                appTransID: String
                            ) {
                                viewModel.onPaymentSuccess()
                            }

                            override fun onPaymentCanceled(
                                zpTransToken: String,
                                appTransID: String
                            ) {
                                Toast.makeText(context, "Thanh toán bị hủy.", Toast.LENGTH_SHORT)
                                    .show()
                            }

                            override fun onPaymentError(
                                zaloPayError: ZaloPayError,
                                zpTransToken: String,
                                appTransID: String
                            ) {
                                Toast.makeText(
                                    context,
                                    "Lỗi thanh toán: ${zaloPayError.name}",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        }
                    )
                }

                is PaymentEvent.PaymentError -> {
                    Toast.makeText(context, event.message, Toast.LENGTH_LONG).show()
                }

                is PaymentEvent.PaymentSuccess -> {
                    navController.navigate(Screen.Ticket.createRoute(event.ticketId)) {
                        popUpTo(Screen.Home.route) {
                            inclusive = false
                        }
                    }
                }
            }
        }
    }
    // Show the bottom sheet when the state is true
    if (uiState.showAddNewCardSheet) {
        ModalBottomSheet(
            onDismissRequest = { viewModel.onDismissAddNewCardSheet() },
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.primary
        ) {
            AddNewCardSheetContent(
                uiState = uiState,
                onCardNumberChange = viewModel::onNewCardNumberChange,
                onExpiryChange = viewModel::onNewCardExpiryChange,
                onCvvChange = viewModel::onNewCardCvvChange,
                onSaveAsPrimaryChange = viewModel::onSaveAsPrimaryChange,
                onContinueClick = viewModel::onSaveCardContinueClick
            )
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackClick() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onCartClick() }) {
                        Icon(Icons.Default.ShoppingBasket, contentDescription = "Basket")
                    }
                }
            )
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .padding(innerPadding)
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            item { Spacer(modifier = Modifier.height(0.dp)) }

            item {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Payment Method", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        TextButton(onClick = { viewModel.onAddNewCardClick() }) {
                            Text("Add New Card")
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        uiState.paymentMethods.forEach { method ->
                            val isSelected = uiState.selectedMethod?.id == method.id
                            if (method.cardDetails == null) {
                                PaymentOptionRow(
                                    method = method,
                                    isSelected = isSelected,
                                    onClick = { viewModel.onPaymentMethodSelected(method) }
                                )
                            } else {
                                CreditCardPaymentOption(
                                    method = method,
                                    isSelected = isSelected,
                                    onClick = { viewModel.onPaymentMethodSelected(method) }
                                )
                            }
                        }
                    }
                }
            }

            item {
                Column {
                    Text("Add Voucher", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = uiState.voucherCode,
                            onValueChange = viewModel::onVoucherCodeChanged,
                            label = { Text("VOUCHER CODE") },
                            modifier = Modifier.weight(1f)
                        )
                        Button(onClick = { viewModel.onApplyVoucherClick() }) {
                            Text("APPLY")
                        }
                    }
                }
            }

            item {
                Button(
                    onClick = { viewModel.onCheckoutClick() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .padding(top = 16.dp)
                ) {
                    Text("CHECKOUT", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }
            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }
}

// --- Composables for the Add New Card Bottom Sheet ---
@Composable
private fun AddNewCardSheetContent(
    uiState: PaymentUiState,
    onCardNumberChange: (String) -> Unit,
    onExpiryChange: (String) -> Unit,
    onCvvChange: (String) -> Unit,
    onSaveAsPrimaryChange: (Boolean) -> Unit,
    onContinueClick: () -> Unit
) {
    val textFieldColors = TextFieldDefaults.colors(
        focusedContainerColor = Color.White.copy(alpha = 0.2f),
        unfocusedContainerColor = Color.White.copy(alpha = 0.2f),
        focusedTextColor = Color.White,
        unfocusedTextColor = Color.White,
        focusedLabelColor = Color.White.copy(alpha = 0.7f),
        unfocusedLabelColor = Color.White.copy(alpha = 0.7f),
        cursorColor = Color.White,
        focusedIndicatorColor = Color.Transparent,
        unfocusedIndicatorColor = Color.Transparent
    )

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(24.dp)
    ) {
        Text("Card Number", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = uiState.newCardNumber,
            onValueChange = onCardNumberChange,
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.medium,
            colors = textFieldColors
        )
        Spacer(modifier = Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Expires End",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = uiState.newCardExpiry,
                    onValueChange = onExpiryChange,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    colors = textFieldColors
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text("CVV", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = uiState.newCardCvv,
                    onValueChange = onCvvChange,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    colors = textFieldColors
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.clickable { onSaveAsPrimaryChange(!uiState.saveAsPrimary) }
        ) {
            Checkbox(
                checked = uiState.saveAsPrimary,
                onCheckedChange = { onSaveAsPrimaryChange(it) },
                colors = CheckboxDefaults.colors(
                    checkedColor = Color.White,
                    uncheckedColor = Color.White.copy(alpha = 0.7f),
                    checkmarkColor = MaterialTheme.colorScheme.primary
                )
            )
            Text("Save as a primary card", color = Color.White)
        }
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = onContinueClick,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = MaterialTheme.shapes.medium,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.White,
                contentColor = MaterialTheme.colorScheme.primary
            )
        ) {
            Text("CONTINUE", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
    }
}


// --- Other Composables for the Main Screen ---
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PaymentOptionRow(
    method: PaymentMethod,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    OutlinedCard(
        onClick = onClick,
        border = BorderStroke(
            1.dp,
            if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
        ),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            method.logoRes?.let {
                Image(
                    painter = painterResource(id = it),
                    contentDescription = method.name,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(16.dp))
            }
            Text(method.name, modifier = Modifier.weight(1f))
            RadioButton(selected = isSelected, onClick = onClick)
        }
    }
}

@Composable
private fun CreditCardPaymentOption(
    method: PaymentMethod,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Column {
        PaymentOptionRow(
            method = method.copy(logoRes = null),
            isSelected = isSelected,
            onClick = onClick
        )
        AnimatedVisibility(visible = isSelected) {
            OutlinedCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
            ) {
                Row(
                    modifier = Modifier
                        .padding(16.dp)
                        .fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    method.logoRes?.let {
                        Image(
                            painter = painterResource(id = it),
                            contentDescription = "Card Brand",
                            modifier = Modifier.height(24.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                    }
                    Text(method.cardDetails ?: "")
                }
            }
        }
    }
}

@Preview(showSystemUi = true)
@Composable
fun PaymentScreenPreview() {
    EventingTheme {
        PaymentScreen(viewModel = viewModel(), navController = rememberNavController())
    }
}