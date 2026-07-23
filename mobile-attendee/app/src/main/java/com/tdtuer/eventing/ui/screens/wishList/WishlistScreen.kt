package com.tdtuer.eventing.ui.screens.wishlist

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
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
import com.tdtuer.eventing.R // Note: Add your illustration to drawable resources
import com.tdtuer.eventing.ui.theme.EventingTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WishlistScreen(viewModel: WishlistViewModel) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Wish List", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { viewModel.onBackNavigationClick() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.onMoreOptionsClick() }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "More Options")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Color.White
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .fillMaxSize()
        ) {
            // Top Section with Illustration
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center
            ) {
                Image(
                    painter = painterResource(id = R.drawable.group_34057), // Replace with your actual drawable
                    contentDescription = "Empty Wishlist Illustration",
                    modifier = Modifier.size(180.dp)
                )
            }

            HorizontalDivider()

            // Bottom Section with Text and Button
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(horizontal = 32.dp, vertical = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Nothing on your wishlist yet",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor",
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 20.sp
                )
                Spacer(modifier = Modifier.weight(1f)) // Pushes the button to the bottom
                Button(
                    onClick = { viewModel.onExploreEventsClick() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = MaterialTheme.shapes.medium,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF212121), // Dark color from image
                        contentColor = Color.White
                    )
                ) {
                    Text(
                        text = "EXPLORE EVENTS",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun WishlistScreenPreview() {
    EventingTheme {
        WishlistScreen(viewModel = viewModel())
    }
}