plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.services) // Apply the Google services plugin
    id("org.jetbrains.kotlin.kapt")
    alias(libs.plugins.dagger.hilt)
    id("kotlin-parcelize")
}

hilt {
    enableAggregatingTask = false
}

android {
    namespace = "com.tdtuer.eventing_organizer"
    compileSdk {
        version = release(36)
    }

    defaultConfig {
        applicationId = "com.tdtuer.eventing_organizer"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.firebase.crashlytics.buildtools)
    implementation(libs.androidx.foundation)
    implementation(libs.androidx.compose.animation.core)
    implementation(libs.play.services.location)
    implementation(libs.androidx.compose.material3.adaptive.navigation.suite)
//    implementation(libs.androidx.compose.runtime.saveable)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)

    // DataStore for local storage
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Firebase
    implementation(platform(libs.firebase.bom)) // Đồng ộ version các thư viện fbase
    implementation(libs.firebase.firestore) // Thao tác với dữ liệu đám mây Firestore
    implementation(libs.firebase.analytics)
    implementation(libs.firebase.auth) // Đã sửa
    implementation(libs.play.services.auth)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.playservices)
    implementation(libs.googleid)
    implementation(libs.firebase.messaging)
    implementation("com.onesignal:OneSignal:[5.6.1,5.9.99]")

    //Facebook
    implementation(libs.facebook.login)

    // Hilt - SỬ DỤNG ALIAS ĐÚNG
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)

    // Navigation Compose
    implementation(libs.androidx.navigation.compose) // Điều hướng navigation trong Compose
    implementation(libs.hilt.navigation.compose) // Tích hợp Hilt với Navigation Compose

    // Icon mở rộng
    implementation(libs.material.icons.extended)

    // Biểu đồ
    implementation(libs.mpandroidchart) // line bar chart các kiểu
    implementation(libs.cloudinary.kotlin)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.lottie.compose)

    // Retrofit
    implementation(libs.retrofit)
    implementation(libs.converter.gson)
    implementation(libs.logging.interceptor)
    implementation(libs.okhttp)

    // Coil
    implementation(libs.coil.compose)

    // Accompanist
    implementation(libs.accompanist.permissions)
    implementation(libs.accompanist.swiperefresh)
//
//    // Zalo pay
//    implementation(fileTree(mapOf(
//        "dir" to "libs",
//        "include" to listOf("*.aar", "*.jar"),
//        "exclude" to listOf("")
//    )))

    // Zxing
    implementation(libs.zxing.core) // <-- THÊM THƯ VIỆN QR CODE

    implementation(libs.mapbox.android)
    implementation(libs.mapbox.compose)
    implementation("com.google.accompanist:accompanist-drawablepainter:0.34.0") // Dùng phiên bản mới nhất
    implementation("com.google.firebase:firebase-storage")

    implementation("androidx.hilt:hilt-work:1.0.0")
    kapt("androidx.hilt:hilt-compiler:1.0.0")
    implementation("androidx.work:work-runtime-ktx:2.8.1")

    // Media3 (ExoPlayer)
    val media3Version = "1.2.0" // Hoặc phiên bản mới nhất
    implementation("androidx.media3:media3-exoplayer:$media3Version")
    implementation("androidx.media3:media3-ui:$media3Version")
    implementation("androidx.media3:media3-common:$media3Version")

    implementation("androidx.compose.runtime:runtime-livedata") // Hoặc phiên bản phù hợp với compose của bạn

    // CameraX
    val cameraxVersion = "1.3.0" // Hoặc phiên bản mới nhất
    implementation("androidx.camera:camera-camera2:$cameraxVersion")
    implementation("androidx.camera:camera-lifecycle:$cameraxVersion")
    implementation("androidx.camera:camera-view:$cameraxVersion")

    // ML Kit Barcode Scanning
    implementation("com.google.mlkit:barcode-scanning:17.2.0")
}