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

        externalNativeBuild {
            cmake {
                cppFlags.add("-Wl,-z,max-page-size=16384")
            }
        }
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
    packaging {
        jniLibs {
            useLegacyPackaging = false
        }
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
    implementation("androidx.core:core-splashscreen:1.0.1")
}
