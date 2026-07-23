package com.tdtuer.eventing.ui.screens.paymentconfirmation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your drawable resources
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentConfirmationScreen(viewModel: PaymentConfirmationViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackClick() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            Button(
                onClick = { viewModel.onConfirmClick() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(56.dp),
                shape = MaterialTheme.shapes.medium,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF212121))
            ) {
                Text("CONFIRM", fontWeight = FontWeight.Bold)
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(16.dp)
                .fillMaxSize()
        ) {
            Text("Payment Method", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(modifier = Modifier.height(16.dp))
            uiState.selectedCard?.let { card ->
                PaymentCard(cardDetails = card)
            }
            Spacer(modifier = Modifier.height(24.dp))

            Text("Voucher", fontWeight = FontWeight.Bold, fontSize = 18.sp)
            Spacer(modifier = Modifier.height(16.dp))
            AnimatedVisibility(visible = uiState.appliedVoucher != null) {
                uiState.appliedVoucher?.let { voucher ->
                    AppliedVoucher(
                        voucher = voucher,
                        onRemove = { viewModel.onRemoveVoucherClick() }
                    )
                }
            }
        }
    }
}

// --- Custom Composables for this Screen ---

@Composable
fun PaymentCard(cardDetails: CardDetails) {
    Card(shape = MaterialTheme.shapes.large) {
        Column {
            // Top gradient part of the card
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        brush = Brush.horizontalGradient(
                            colors = listOf(Color(0xFF2C7CF7), Color(0xFF703DF1))
                        )
                    )
                    .padding(20.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Image(painter = painterResource(id = cardDetails.providerLogoRes), contentDescription = null, modifier = Modifier.height(24.dp))
                        Text(cardDetails.brandName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    Text(cardDetails.maskedNumber, color = Color.White, fontSize = 18.sp, letterSpacing = 2.sp)
                }
            }
            // Bottom solid part of the card
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFFE452CE))
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(cardDetails.cardholderName, color = Color.White, fontWeight = FontWeight.Medium)
                Text(cardDetails.expiryDate, color = Color.White, fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
private fun AppliedVoucher(voucher: Voucher, onRemove: () -> Unit) {
    Card(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("APPLIED VOUCHER CODE", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(voucher.code, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Surface(
                        color = Color(0xFFFEF3E7),
                        shape = MaterialTheme.shapes.small
                    ) {
                        Text(
                            text = voucher.discount,
                            color = Color(0xFFF57C00),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Close, contentDescription = "Remove Voucher")
            }
        }
    }
}

@Preview(showSystemUi = true)
@Composable
fun PaymentConfirmationScreenPreview() {
    EventingTheme {
        PaymentConfirmationScreen(viewModel = viewModel())
    }
}