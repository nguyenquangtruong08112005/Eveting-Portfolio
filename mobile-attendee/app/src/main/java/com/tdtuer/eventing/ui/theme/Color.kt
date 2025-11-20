package com.tdtuer.eventing.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush

// ==========================================================================
// LIGHT THEME COLORS (Giữ nguyên hoặc tinh chỉnh nhẹ nếu cần)
// ==========================================================================
val OrangePrimary = Color(0xFFF76B10)
val OrangePirmary_80 = Color(0xCCF56B11)
val OrangePrimary_60 = Color(0x99F56B11)
val OrangePrimary_40 = Color(0x66F56B11)
val OrangePrimary_20 = Color(0x33F56B11)

val YellowSecondary = Color(0xFFFBBE47)
val BlueSecondary = Color(0xFF3B82F7)
val GreenSecondary = Color(0xFF2D9687)
val DarkOrangeSecondary = Color(0xFF8C3700)
val WhiteSecondary = Color(0xFFFFFFFF)
val GreySecondary = Color(0xFFF0F0EE)
val Grey2Secondary = Color(0xFFE1E1E1)
val SoftDarkishSecondary = Color(0xFF494C55)

val OrangeLinear = Brush.verticalGradient(colors = listOf(Color(0xFFF76B10), Color(0xFFFF9C5B)))
val BlackLinear = Brush.horizontalGradient(colors = listOf(Color(0xFF171924), Color(0xFF20222C)))
val ButtonLinear = Brush.verticalGradient(colors = listOf(Color(0xFF20222C), Color(0xFF1A1C26)))
val DividerLinear = Brush.horizontalGradient(
    colorStops = arrayOf(
        0.0f to Color(0x2020222C),
        0.5f to Color(0x3320222C),
        1.0f to Color(0x2020222C)
    )
)

// Các màu Semantic cho Light Theme
val BlueInfo = Color(0xFF2F80ED)
val GreenSuccess = Color(0xFF27AE60)
val YellowWarning = Color(0xFFE2B93B)
val RedError = Color(0xFFEB5757)
val TextBlack = Color(0xFF20222C)
val TextWhite = Color(0xFFFDFDFD)

val BackgroundGrey = Color(0xFFF5F5F5)
val SurfaceWhite = Color(0xFFFDFDFD)


// ==========================================================================
// DARK THEME COLORS (HARMONIZED)
// ==========================================================================

// 1. Nền (Background & Surface)
// Sử dụng tông màu than chì pha chút xanh (Blue-Grey) để tạo cảm giác hiện đại, không dùng đen tuyền.
val DarkBackground = Color(0xFF12141A) // Tối hơn, sâu hơn
val DarkSurface = Color(0xFF1E212B)    // Sáng hơn nền một chút để nổi bật Card

// 2. Màu Chủ đạo (Primary)
// Chuyển từ Cam rực rỡ sang Cam Pastel (Coral/Peach) để dịu mắt trên nền tối.
val OrangePrimaryDark = Color(0xFFFF8F66) // Màu cam san hô dịu nhẹ

// 3. Các màu phụ (Secondary/Tertiary)
// Giảm độ bão hòa (Desaturate) các màu này
val YellowSecondaryDark = Color(0xFFFFD54F) // Vàng nhạt
val BlueSecondaryDark = Color(0xFF64B5F6)   // Xanh dương nhạt
val GreenSecondaryDark = Color(0xFF81C784)  // Xanh lá nhạt
val DarkOrangeSecondaryDark = Color(0xFFFFAB91) // Cam đất nhạt
val SoftDarkishSecondaryDark = Color(0xFF9FA2B4) // Màu xám xanh cho icon/text phụ

// 4. Màu trạng thái (Semantic)
// Dùng các tông màu pastel để không bị chói (Neon effect)
val BlueInfoDark = Color(0xFF64B5F6)
val GreenSuccessDark = Color(0xFF81C784)
val YellowWarningDark = Color(0xFFFFD54F)
val RedErrorDark = Color(0xFFE57373) // Đỏ nhạt

// 5. Màu chữ (Typography)
// Không dùng trắng tinh (0xFFFFFF) vì gây mỏi mắt. Dùng trắng ngà hoặc xám sáng.
val TextWhiteDark = Color(0xFFE8EAED) // Trắng dịu (High Emphasis)
val TextGreyDark = Color(0xFFB0B3B8)  // Xám sáng (Medium Emphasis)

// 6. Gradients cho Dark Theme
// Gradient nên nhẹ nhàng hơn, không quá gắt
val OrangeLinearDark = Brush.verticalGradient(
    colors = listOf(
        Color(0xFFFF8F66), // Cam san hô
        Color(0xFFFF7043)  // Cam đậm hơn chút
    )
)

// Button Gradient trong Dark mode nên sáng hơn nền một chút để nổi bật
val ButtonLinearDark = Brush.verticalGradient(
    colors = listOf(
        Color(0xFF2D313F),
        Color(0xFF242731)
    )
)

val DividerLinearDark = Brush.horizontalGradient(
    colorStops = arrayOf(
        0.0f to Color(0x00FFFFFF), // Trong suốt ở 2 đầu
        0.5f to Color(0x40FFFFFF), // Trắng mờ ở giữa
        1.0f to Color(0x00FFFFFF)
    )
)