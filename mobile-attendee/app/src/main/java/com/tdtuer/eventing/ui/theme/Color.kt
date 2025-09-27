package com.tdtuer.eventing.ui.theme

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush

// Light Theme Colors from Palette
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
val BlueInfo = Color(0xFF2F80ED)
val GreenSuccess = Color(0xFF27AE60)
val YellowWarning = Color(0xFFE2B93B)
val RedError = Color(0xFFEB5757)
val TextBlack = Color(0xFF20222C)
val TextWhite = Color(0xFFFDFDFD)

val BackgroundGrey = Color(0xFFFBFBFB)
val SurfaceWhite = Color(0xFFFDFDFD)
















//--------------------------------------------------------------------------------
// Dark Theme Colors (New & Beautiful!)
//--------------------------------------------------------------------------------

// Nền chính của Dark Theme, lấy từ màu chữ của Light Theme để tạo sự liên kết.
val DarkBackground = Color(0xFF171924)
// Nền cho các bề mặt (Card, Dialog), hơi sáng hơn nền chính một chút.
val DarkSurface = Color(0xFF20222C)

// Màu cam chủ đạo được làm dịu lại để không quá chói trên nền tối.
val OrangePrimaryDark = Color(0xFFF8813B)

// Các màu phụ được làm sáng hơn để đảm bảo độ tương phản.
val YellowSecondaryDark = Color(0xFFFCCB6B)
val BlueSecondaryDark = Color(0xFF639DFA)
val GreenSecondaryDark = Color(0xFF52B3A6)
val DarkOrangeSecondaryDark = Color(0xFFD4753D)
val SoftDarkishSecondaryDark = Color(0xFF7E828E)

// Màu trạng thái cũng được làm sáng và dịu hơn.
val BlueInfoDark = Color(0xFF5899F0)
val GreenSuccessDark = Color(0xFF4DCA7F)
val YellowWarningDark = Color(0xFFE9C561)
val RedErrorDark = Color(0xFFEE7878)

// Màu chữ cho nền tối.
val TextWhiteDark = Color(0xFFFDFDFD) // Chữ chính, độ tương phản cao.
val TextGreyDark = Color(0xFFA0A3AF) // Chữ phụ, độ tương phản thấp hơn.

// Gradients cho Dark Theme
val OrangeLinearDark = Brush.verticalGradient(colors = listOf(Color(0xFFF8813B), Color(0xFFFDA571)))
val ButtonLinearDark = Brush.verticalGradient(colors = listOf(Color(0xFF2A2D3A), Color(0xFF20222C)))
val DividerLinearDark = Brush.horizontalGradient(
    colorStops = arrayOf(
        0.0f to Color(0x20A0A3AF),
        0.5f to Color(0x33A0A3AF),
        1.0f to Color(0x20A0A3AF)
    )
)

