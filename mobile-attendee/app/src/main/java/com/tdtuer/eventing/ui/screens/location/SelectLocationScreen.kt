package com.tdtuer.eventing.ui.screens.selectlocation

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tdtuer.eventing.R // Note: Add your map image to drawables
import com.tdtuer.eventing.ui.theme.EventingTheme

@Composable
fun SelectLocationScreen(viewModel: SelectLocationViewModel) {
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        // NOTE: This is a placeholder. For a real app, replace this with
        // the GoogleMaps composable from the Maps Compose Library.
        Image(
            painter = painterResource(id = R.drawable.group_34057), // Replace with your map image
            contentDescription = "Map Background",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        // Center location pin
        Icon(
            painter = painterResource(id = R.drawable.group_34057), // Provide your own pin icon
            contentDescription = "Location Pin",
            modifier = Modifier
                .size(48.dp)
                .align(Alignment.Center),
            tint = Color.Unspecified // Use original icon colors
        )

        // Top Search Bar
        LocationSearchBar(
            query = uiState.searchQuery,
            onQueryChange = viewModel::onSearchQueryChange,
            onBackClick = viewModel::onBackClick,
            onSearchClick = viewModel::onSearchClick,
            onRecenterClick = viewModel::onRecenterClick,
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(16.dp)
        )

        // Bottom "ADD" Button
        Button(
            onClick = { viewModel.onAddClick() },
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .height(56.dp)
                .align(Alignment.BottomCenter),
            shape = MaterialTheme.shapes.medium,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF212121),
                contentColor = Color.White
            )
        ) {
            Text("ADD", fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LocationSearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    onBackClick: () -> Unit,
    onSearchClick: () -> Unit,
    onRecenterClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.extraLarge,
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBackClick) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            TextField(
                value = query,
                onValueChange = onQueryChange,
                placeholder = { Text("Search new address...") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                ),
                trailingIcon = {
                    IconButton(onClick = onSearchClick) {
                        Icon(Icons.Default.Search, contentDescription = "Search")
                    }
                }
            )
            VerticalDivider(
                modifier = Modifier
                    .height(32.dp)
                    .padding(horizontal = 8.dp)
            )
            IconButton(onClick = onRecenterClick) {
                Icon(Icons.Default.MyLocation, contentDescription = "Recenter")
            }
        }
    }
}


@Preview(showSystemUi = true)
@Composable
fun SelectLocationScreenPreview() {
    EventingTheme {
        SelectLocationScreen(viewModel = viewModel())
    }
}