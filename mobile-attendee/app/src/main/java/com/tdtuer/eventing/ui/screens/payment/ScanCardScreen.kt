package com.tdtuer.eventing.ui.screens.scancard

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.ui.screens.paymentconfirmation.CardDetails
import com.tdtuer.eventing.ui.screens.paymentconfirmation.PaymentCard // Reusing the card from the other screen
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScanCardScreen(viewModel: ScanCardViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Scan Card", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackClick() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        bottomBar = {
            Button(
                onClick = { /* Scanning is in progress, so this might be disabled or have other logic */ },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(56.dp),
                enabled = uiState.isScanning, // Button is active while "scanning"
                shape = MaterialTheme.shapes.medium,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF212121))
            ) {
                // You could add a CircularProgressIndicator here for a better scanning effect
                Text("SCANNING", fontWeight = FontWeight.Bold)
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(16.dp)
                .fillMaxSize()
        ) {
            Text(
                "Please hold the card inside the frame to start the card scanning",
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            // This Box simulates the camera view and the frame overlay
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(vertical = 32.dp),
                contentAlignment = Alignment.Center
            ) {
                // In a real app, the CameraX view would be here as the background.
                // The green border represents the frame where the user should place their card.
                Card(
                    modifier = Modifier.padding(16.dp),
                    border = BorderStroke(4.dp, Brush.verticalGradient(listOf(Color(0xFF80FF72), Color(0xFF7EE8FA)))),
                    shape = MaterialTheme.shapes.large
                ) {
                    // We reuse the PaymentCard composable to show a "detected" card, as in the design.
                    uiState.detectedCard?.let {
                        PaymentCard(cardDetails = it)
                    }
                }
            }
        }
    }
}

@Preview(showSystemUi = true)
@Composable
fun ScanCardScreenPreview() {
    EventingTheme {
        ScanCardScreen(viewModel = viewModel())
    }
}