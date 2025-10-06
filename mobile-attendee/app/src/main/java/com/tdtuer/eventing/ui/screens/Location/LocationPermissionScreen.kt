package com.tdtuer.eventing.ui.screens.locationpermission

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your location pin icon
import com.tdtuer.eventing.ui.theme.EventingTheme

@Composable
fun LocationPermissionScreen(viewModel: LocationPermissionViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    // This screen would show your main content,
    // and the dialog will appear on top of it when showDialog is true.
    if (uiState.showDialog) {
        LocationPermissionDialog(
            onTurnOnClicked = { viewModel.onTurnOnClick() },
            onDismiss = { viewModel.onNoThanksClick() }
        )
    }
}

@Composable
private fun LocationPermissionDialog(
    onTurnOnClicked: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {}, // We use a custom layout, so this is empty
        dismissButton = {}, // We use a custom layout, so this is empty
        shape = MaterialTheme.shapes.extraLarge,
        containerColor = MaterialTheme.colorScheme.surface,
        text = {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.group_34057), // Replace with your icon
                    contentDescription = "Location Pin",
                    modifier = Modifier.size(80.dp),
                    tint = Color.Unspecified
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Location Services",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Please get your current location to start exploring events around you",
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = onTurnOnClicked,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = MaterialTheme.shapes.medium,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF212121),
                        contentColor = Color.White
                    )
                ) {
                    Text("TURN ON", fontWeight = FontWeight.Bold)
                }
                TextButton(onClick = onDismiss) {
                    Text("No Thanks", color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    )
}

@Preview(showBackground = true)
@Composable
fun LocationPermissionDialogPreview() {
    EventingTheme {
        // To preview the dialog, we just call it directly
        LocationPermissionDialog(
            onTurnOnClicked = {},
            onDismiss = {}
        )
    }
}