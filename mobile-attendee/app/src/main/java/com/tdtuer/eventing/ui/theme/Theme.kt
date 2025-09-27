package com.tdtuer.eventing.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

// --- 1. Định nghĩa ColorScheme cho Light & Dark Theme ---

private val LightColorScheme = lightColorScheme(
    primary = OrangePrimary,
    onPrimary = WhiteSecondary, // Chữ trên nền màu primary
    secondary = YellowSecondary,
    onSecondary = TextBlack, // Chữ trên nền màu secondary
    tertiary = BlueSecondary,
    onTertiary = WhiteSecondary,
    background = BackgroundGrey,
    onBackground = TextBlack,
    surface = SurfaceWhite,
    onSurface = TextBlack,
    onSurfaceVariant = SoftDarkishSecondary, // Màu cho text/icon phụ
    outline = Grey2Secondary, // Màu cho viền
    error = RedError,
    onError = WhiteSecondary
)

private val DarkColorScheme = darkColorScheme(
    primary = OrangePrimaryDark,
    onPrimary = TextBlack,
    secondary = YellowSecondaryDark,
    onSecondary = TextBlack,
    tertiary = BlueSecondaryDark,
    onTertiary = WhiteSecondary,
    background = DarkBackground,
    onBackground = TextWhiteDark,
    surface = DarkSurface,
    onSurface = TextWhiteDark,
    onSurfaceVariant = TextGreyDark, // Màu cho text/icon phụ
    outline = SoftDarkishSecondaryDark, // Màu cho viền
    error = RedErrorDark,
    onError = TextBlack
)

// --- 2. Hệ thống màu mở rộng (cho Gradients và các màu không có trong ColorScheme) ---

data class ExtendedColors(
    val success: Color,
    val onSuccess: Color,
    val warning: Color,
    val onWarning: Color,
    val info: Color,
    val onInfo: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val orangeLinear: Brush,
    val blackLinear: Brush,
    val buttonLinear: Brush,
    val dividerLinear: Brush
)

private val extendedLightColors = ExtendedColors(
    success = GreenSuccess,
    onSuccess = WhiteSecondary,
    warning = YellowWarning,
    onWarning = TextBlack,
    info = BlueInfo,
    onInfo = WhiteSecondary,
    textPrimary = TextBlack,
    textSecondary = SoftDarkishSecondary,
    orangeLinear = OrangeLinear,
    blackLinear = BlackLinear,
    buttonLinear = ButtonLinear,
    dividerLinear = DividerLinear
)

private val extendedDarkColors = ExtendedColors(
    success = GreenSuccessDark,
    onSuccess = TextBlack,
    warning = YellowWarningDark,
    onWarning = TextBlack,
    info = BlueInfoDark,
    onInfo = WhiteSecondary,
    textPrimary = TextWhiteDark,
    textSecondary = TextGreyDark,
    orangeLinear = OrangeLinearDark,
    blackLinear = BlackLinear, // Giả sử dark theme vẫn dùng black linear, nếu không hãy tạo mới
    buttonLinear = ButtonLinearDark,
    dividerLinear = DividerLinearDark
)

// Cung cấp ExtendedColors thông qua CompositionLocal
private val LocalExtendedColors = staticCompositionLocalOf {
    extendedLightColors // Giá trị mặc định
}


// --- 3. Đối tượng truy cập Theme (cách tốt nhất để sử dụng) ---

object AppTheme {
    val colorScheme: androidx.compose.material3.ColorScheme
        @Composable
        @ReadOnlyComposable
        get() = MaterialTheme.colorScheme

    val typography: Typography
        @Composable
        @ReadOnlyComposable
        get() = MaterialTheme.typography

    val extendedColors: ExtendedColors
        @Composable
        @ReadOnlyComposable
        get() = LocalExtendedColors.current
}


// --- 4. Composable Theme chính ---

@Composable
fun EventingTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Tắt dynamic color để ưu tiên design system của bạn
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    val extendedColors = if (darkTheme) extendedDarkColors else extendedLightColors

    // Cung cấp cả MaterialTheme và ExtendedColors cho Composable con
    CompositionLocalProvider(LocalExtendedColors provides extendedColors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = AppTypography, // Sử dụng AppTypography đã tạo
            content = content
        )
    }
}