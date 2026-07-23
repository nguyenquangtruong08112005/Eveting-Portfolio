package com.tdtuer.eventing_organizer.ui.screens.location

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.mapbox.geojson.Point
import com.mapbox.maps.extension.compose.MapboxMap
import com.mapbox.maps.extension.compose.animation.viewport.rememberMapViewportState
import com.tdtuer.eventing_organizer.helpers.getAddressDetailsFromCoordinates
import com.tdtuer.eventing_organizer.ui.model.LocationResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationPickerScreen(navController: NavController) {
    val context = LocalContext.current

    // Vị trí mặc định (TP.HCM)
    val defaultPoint = Point.fromLngLat(106.7009, 10.7769)

    val mapViewportState = rememberMapViewportState {
        setCameraOptions {
            center(defaultPoint)
            zoom(15.0)
        }
    }

    // State lưu tọa độ và địa chỉ hiện tại đang trỏ tới
    var selectedPoint by remember { mutableStateOf(defaultPoint) }
    var selectedAddress by remember { mutableStateOf("Đang lấy địa chỉ...") }

    // Lưu trữ các thành phần địa chỉ để trả về
    var selectedComponents by remember { mutableStateOf<com.tdtuer.eventing_organizer.helpers.AddressComponents?>(null) }

    var isGeocoding by remember { mutableStateOf(false) }

    // Lắng nghe sự thay đổi camera để lấy tọa độ tâm
    LaunchedEffect(mapViewportState.cameraState) {
        val center = mapViewportState.cameraState?.center // Lấy center từ state
        if (center != null) {
            selectedPoint = center
            isGeocoding = true

            // Gọi hàm helper mới trong background thread
            val addressComp = withContext(Dispatchers.IO) {
                getAddressDetailsFromCoordinates(
                    context,
                    center.latitude(),
                    center.longitude()
                )
            }
            selectedComponents = addressComp
            selectedAddress = addressComp.fullAddress
            isGeocoding = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chọn Vị Trí", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        }
    ) { padding ->
        Box(modifier = Modifier
            .padding(padding)
            .fillMaxSize()) {
            // 1. Mapbox
            MapboxMap(
                modifier = Modifier.fillMaxSize(),
                mapViewportState = mapViewportState
            )

            // 2. Pin cố định ở giữa màn hình (Marker)
            Icon(
                imageVector = Icons.Default.LocationOn,
                contentDescription = "Center Pin",
                modifier = Modifier
                    .size(48.dp)
                    .align(Alignment.Center)
                    .offset(y = (-24).dp), // Đẩy lên để mũi kim trỏ đúng tâm
                tint = Color.Red
            )

            // 3. Card hiển thị thông tin địa chỉ và nút chọn
            Card(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(4.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Vị trí đã chọn:",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.Gray
                    )
                    Spacer(modifier = Modifier.height(4.dp))

                    if (isGeocoding) {
                        LinearProgressIndicator(modifier = Modifier
                            .fillMaxWidth()
                            .height(2.dp))
                    }

                    Text(
                        text = selectedAddress,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Button(
                        onClick = {
                            // TRẢ DỮ LIỆU VỀ MÀN HÌNH TRƯỚC
                            val comps = selectedComponents
                            if (comps != null) {
                                navController.previousBackStackEntry?.savedStateHandle?.set(
                                    "location_data", LocationResult(
                                        lat = selectedPoint.latitude(),
                                        lng = selectedPoint.longitude(),
                                        address = comps.fullAddress,
                                        street = comps.street,
                                        ward = comps.ward,
                                        district = comps.district,
                                        city = comps.city
                                    )
                                )
                            }
                            navController.popBackStack()
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Xác nhận vị trí này")
                    }
                }
            }
        }
    }
}