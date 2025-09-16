package com.tdtuer.eventing.app

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost

// Định nghĩa hằng số cho các routes sử dụng trong ứng dụng =))
object Routes {
    const val HOME = "home" // Trang chủ
    const val EVENT_LIST = "event_list" // Danh sách sự kiện
    const val EVENT_DETAIL = "event_detail" // Chi tiết sự kiện
    const val EVENT_EDIT = "event_edit" // Tạo/Sửa sự kiện
    const val PROFILE = "profile" // Hồ sơ người dùng
    const val AUTH = "auth" // Xác thực (đăng nhập/đăng ký)
}

@Composable
fun AppNavigation(navController: NavHostController) {
//    NavHost quản lí màn hình dựa trn route, với màn hình khời đầu là HOME
    NavHost(navController = navController, startDestination = Routes.HOME) {

    }
}
