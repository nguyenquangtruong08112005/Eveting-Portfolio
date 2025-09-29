plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.services) // Apply the Google services plugin
    id("org.jetbrains.kotlin.kapt")
    alias(libs.plugins.dagger.hilt)
}

hilt{
    enableAggregatingTask = false
}

android {
    namespace = "com.tdtuer.eventing"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.tdtuer.eventing"
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
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    // Firebase
    implementation(platform(libs.firebase.bom)) // Đồng ộ version các thư viện fbase
    implementation(libs.firebase.firestore) // Thao tác với dữ liệu đám mây Firestore
    implementation("com.google.firebase:firebase-analytics")
    implementation("com.google.firebase:firebase-auth") // Đã sửa
    
    // Hilt
    implementation(libs.hilt.core) // core hilt
    kapt(libs.hilt.compiler) // Annotation processor cho Hilt

    // Navigation Compose
    implementation(libs.androidx.navigation.compose) // Điều hướng navigation trong Compose
    implementation(libs.hilt.navigation.compose) // Tích hợp Hilt với Navigation Compose

    // Icon mở rộng
    implementation("androidx.compose.material:material-icons-extended")

    // Biểu đồ
    implementation(libs.mpandroidchart) // line bar chart các kiểu
}