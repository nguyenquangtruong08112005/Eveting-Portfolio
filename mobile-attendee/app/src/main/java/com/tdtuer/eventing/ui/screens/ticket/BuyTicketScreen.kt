package com.tdtuer.eventing.ui.screens.buyticket

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.ui.theme.EventingTheme
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuyTicketScreen(viewModel: BuyTicketViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Ticket", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackClick() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onMoreOptionsClick() }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More Options")
                    }
                }
            )
        },
        bottomBar = {
            TicketPurchaseBottomBar(
                totalPrice = uiState.totalPrice,
                onContinueClick = { viewModel.onContinueClick() }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(16.dp)
                .fillMaxSize()
        ) {
            SectionTitle("Ticket Type")
            TicketTypeSelector(
                ticketTypes = uiState.ticketTypes,
                selectedType = uiState.selectedTicketType,
                onTypeSelected = viewModel::onTicketTypeSelected
            )

            Spacer(modifier = Modifier.height(24.dp))

            SectionTitle("Seat")
            QuantitySelector(
                quantity = uiState.quantity,
                onIncrease = viewModel::onIncreaseQuantity,
                onDecrease = viewModel::onDecreaseQuantity
            )

            Spacer(modifier = Modifier.height(24.dp))

            SectionTitle("Ticket Price")
            PriceBreakdown(
                ticketType = uiState.selectedTicketType.name,
                pricePerTicket = uiState.ticketPrice,
                quantity = uiState.quantity
            )
        }
    }
}

// --- Custom Composables for this Screen ---

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
private fun PriceBreakdown(ticketType: String, pricePerTicket: Double, quantity: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("$ticketType Ticket", color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(formatCurrency(pricePerTicket), fontWeight = FontWeight.Medium)
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            Text(
                text = "$quantity x ${formatCurrency(pricePerTicket)}",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 14.sp
            )
        }
    }
}


@Composable
private fun TicketPurchaseBottomBar(totalPrice: Double, onContinueClick: () -> Unit) {
    Surface(shadowElevation = 8.dp) {
        Column(modifier = Modifier.padding(16.dp)) {
            HorizontalDivider()
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Total Price", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 16.sp)
                Text(formatCurrency(totalPrice), fontWeight = FontWeight.Bold, fontSize = 22.sp)
            }
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = onContinueClick,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = MaterialTheme.shapes.medium,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF212121))
            ) {
                Text("CONTINUE", fontWeight = FontWeight.Bold)
            }
        }
    }
}

// Helper function to format currency
private fun formatCurrency(amount: Double): String {
    return NumberFormat.getCurrencyInstance(Locale("en", "US")).format(amount)
}

@Preview(showSystemUi = true)
@Composable
fun BuyTicketScreenPreview() {
    EventingTheme {
        BuyTicketScreen(viewModel = viewModel())
    }
}