package com.tdtuer.eventing.ui.screens.covid
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Circle
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your drawable resources
import com.tdtuer.eventing.ui.theme.EventingTheme
import androidx.compose.foundation.clickable
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CovidDeclarationScreen(viewModel: CovidDeclarationViewModel = viewModel()) {
    val uiState by viewModel.uiState.collectAsState()
    val sheetState = rememberModalBottomSheetState()

    // In a real app, this screen would show other content behind the sheet.
    // The sheet is shown or hidden by controlling the uiState.showSheet variable.
    if (uiState.showSheet) {
        ModalBottomSheet(
            onDismissRequest = { viewModel.onDismissSheet() },
            sheetState = sheetState,
        ) {
            CovidDeclarationContent(
                isConfirmed = uiState.isConfirmed,
                onConfirmationToggled = viewModel::onConfirmationToggled,
                onContinueClick = viewModel::onContinueClick
            )
        }
    }
}

@Composable
private fun CovidDeclarationContent(
    isConfirmed: Boolean,
    onConfirmationToggled: (Boolean) -> Unit,
    onContinueClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .padding(horizontal = 24.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            "Stay safe, be safe",
            fontSize = 18.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(vertical = 16.dp)
        )
        Image(
            painter = painterResource(id = R.drawable.group_34057), // Replace with your banner
            contentDescription = "Covid-19 Protection",
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.large)
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            "Covid-19 Self Health Declaration",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "Enjoy your favorite dish and a lovely your friend and family and have a great time. Food from local food trucks..",
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(24.dp))
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            ChecklistItem("Enjoy your favorite dish and a lovely your friends and family and have a great time.")
            ChecklistItem("I have not traveled internationally in the last 14 days")
        }
        Spacer(modifier = Modifier.height(24.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onConfirmationToggled(!isConfirmed) }
                .padding(vertical = 8.dp)
        ) {
            Checkbox(
                checked = isConfirmed,
                onCheckedChange = { onConfirmationToggled(it) }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("I confirm that I am healthy")
        }
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = onContinueClick,
            enabled = isConfirmed,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = MaterialTheme.shapes.medium,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF212121))
        ) {
            Text("CONTINUE", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun ChecklistItem(text: String) {
    Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(
            imageVector = Icons.Default.Circle,
            contentDescription = null, // Decorative
            modifier = Modifier
                .padding(top = 8.dp)
                .size(6.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(text, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Preview(showSystemUi = true)
@Composable
fun CovidDeclarationScreenPreview() {
    EventingTheme {
        // We can preview the content directly without the sheet for easier iteration
        CovidDeclarationContent(isConfirmed = true, onConfirmationToggled = {}, onContinueClick = {})
    }
}