package com.tdtuer.eventing.ui.screens.payment

import android.R.attr.onClick
import android.app.Activity
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.navigation.NavController
import androidx.navigation.compose.rememberNavController
import com.tdtuer.eventing.helpers.formatVNCurrency
import com.tdtuer.eventing.ui.navigation.Screen
import com.tdtuer.eventing.ui.theme.AppTheme
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
                    ZaloPaySDK.getInstance().payOrder(
                        context as Activity,
                        event.zpToken,
                        "zp-554://app",
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
                                viewModel.onPaymentCanceled()
                                Toast.makeText(context, "Payment canceled.", Toast.LENGTH_SHORT)
                                    .show()
                            }

                            override fun onPaymentError(
                                zaloPayError: ZaloPayError,
                                zpTransToken: String,
                                appTransID: String
                            ) {
                                viewModel.onPaymentErrorOccurred()
                                Toast.makeText(
                                    context,
                                    "Error: ${zaloPayError.name}",
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
                        popUpTo(Screen.Home.route) { inclusive = false }
                    }
                }

                is PaymentEvent.PendingConfirmation -> {
                    // Stay on payment screen — polling is active or pending
                }
            }
        }
    }

    // Bottom Sheet cho Add Card (Giữ nguyên UI)
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
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        }
    ) { innerPadding ->
        when {
            uiState.isConfirmingPayment || uiState.paymentStatus == "pending" -> {
                // Polling or pending-confirmation state
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        if (uiState.isConfirmingPayment) {
                            CircularProgressIndicator()
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "Confirming payment...",
                                fontWeight = FontWeight.Medium,
                                fontSize = 16.sp
                            )
                            Text(
                                "Attempt ${uiState.pollAttempts}/8",
                                fontSize = 12.sp,
                                color = Color.Gray
                            )
                        } else {
                            Text(
                                "Payment pending confirmation",
                                fontWeight = FontWeight.Medium,
                                fontSize = 16.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                uiState.paymentMessage ?: "",
                                fontSize = 13.sp,
                                color = Color.Gray
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Button(
                                onClick = { viewModel.onManualRefresh() },
                                enabled = !uiState.isConfirmingPayment,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary
                                )
                            ) {
                                Text("Refresh")
                            }
                        }
                    }
                }
            }
            uiState.isLoading && uiState.totalAmount == 0.0 -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(innerPadding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .padding(innerPadding)
                        .padding(horizontal = 24.dp)
                        .fillMaxSize()
                ) {
                    Spacer(modifier = Modifier.height(16.dp))

                    if (uiState.eventName.isNotEmpty()) {
                        Text(
                            text = uiState.eventName,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Payment Method", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        items(uiState.paymentMethods.size) { index ->
                            val method = uiState.paymentMethods[index]
                            val isSelected = uiState.selectedMethod?.id == method.id
                            PaymentOptionRow(
                                method = method,
                                isSelected = isSelected,
                                onClick = { viewModel.onPaymentMethodSelected(method) }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.weight(1f))

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color.White)
                            .padding(top = 16.dp, bottom = 24.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Total Amount", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                formatVNCurrency(uiState.totalAmount),
                                fontWeight = FontWeight.Bold,
                                fontSize = 20.sp,
                                color = AppTheme.colorScheme.primary
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = { viewModel.onCheckoutClick() },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            enabled = !uiState.isLoading && !uiState.paymentInProgress,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF212121))
                        ) {
                            if (uiState.isLoading) {
                                CircularProgressIndicator(
                                    color = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            } else {
                                Text("CHECK OUT", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

// --- Helper Composables (Giữ nguyên) ---
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
        Text(
            "Card Number",
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp
        )
        Spacer (modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value =
                uiState.newCardNumber,
            onValueChange = onCardNumberChange,
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.medium,
            colors = textFieldColors
        )
        Spacer(modifier = Modifier.height(16.dp))
        Row(
            horizontalArrangement =
                Arrangement.spacedBy(16.dp)
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    "Expires End",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value =
                        uiState.newCardExpiry,
                    onValueChange = onExpiryChange,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    colors = textFieldColors
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "CVV",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value =
                        uiState.newCardCvv,
                    onValueChange = onCvvChange,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    colors = textFieldColors
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        Row(
            verticalAlignment =
                Alignment.CenterVertically,
            modifier = Modifier.clickable { onSaveAsPrimaryChange(!uiState.saveAsPrimary) }) {
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
            onClick =
                onContinueClick,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = MaterialTheme.shapes.medium,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.White,
                contentColor = MaterialTheme.colorScheme.primary
            )
        ) {
            Text(
                "CONTINUE",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )
        }
    }
}

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
                    modifier = Modifier.size(32.dp) // Tăng kích thước logo chút
                )
                Spacer(modifier = Modifier.width(16.dp))
            }
            Text(
                method.name,
                modifier = Modifier.weight(1f),
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
            )
            RadioButton(selected = isSelected, onClick = onClick)
        }
    }
}