plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.services) // Apply the Google services plugin
    id("org.jetbrains.kotlin.kapt")
    alias(libs.plugins.dagger.hilt)
    id("jacoco")
}

hilt {
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
        debug {
            enableUnitTestCoverage = true
        }
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
    implementation(libs.androidx.foundation)
    implementation(libs.androidx.compose.animation.core)
    implementation(libs.play.services.location)
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

    implementation(libs.play.services.auth)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.playservices)
    implementation(libs.googleid)
    implementation("com.onesignal:OneSignal:5.6.1")

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

    // Zalo pay
    implementation(fileTree(mapOf(
        "dir" to "libs",
        "include" to listOf("*.aar", "*.jar"),
        "exclude" to listOf("")
    )))

    // Zxing
    implementation(libs.zxing.core) // <-- THÊM THƯ VIỆN QR CODE

    implementation(libs.mapbox.android)
    implementation(libs.mapbox.compose)
    implementation("com.google.accompanist:accompanist-drawablepainter:0.34.0") // Dùng phiên bản mới nhất

    implementation("androidx.hilt:hilt-work:1.0.0")
    kapt("androidx.hilt:hilt-compiler:1.0.0")
    implementation("androidx.work:work-runtime-ktx:2.8.1")

    // Media3 (ExoPlayer)
    val media3Version = "1.2.0" // Hoặc phiên bản mới nhất
    implementation("androidx.media3:media3-exoplayer:$media3Version")
    implementation("androidx.media3:media3-ui:$media3Version")
    implementation("androidx.media3:media3-common:$media3Version")

    val roomVersion = "2.8.4"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion") // Hỗ trợ Coroutines/Flow
    kapt("androidx.room:room-compiler:$roomVersion") // Annotation Processor
}

// ---------------------------------------------------------------------------
// JaCoCo – unit-test code coverage (HTML + XML reports, 80% minimum gate)
// ---------------------------------------------------------------------------
jacoco {
    toolVersion = "0.8.12"
}

tasks.withType<Test> {
    configure<JacocoTaskExtension> {
        isIncludeNoLocationClasses = true
        excludes = listOf("jdk.internal.*")
    }
}

val fileFilter = listOf(
    // Android generated
    "**/R.class",
    "**/R$*.class",
    "**/BuildConfig.*",
    "**/Manifest*.*",
    "**/*Test*.*",
    // Hilt / Dagger generated
    "**/dagger/hilt/**",
    "**/hilt_aggregated_deps/**",
    "**/*_HiltModules*.*",
    "**/*_HiltComponents*.*",
    "**/*Hilt_*.*",
    "**/*_Factory*.*",
    "**/*_MembersInjector*.*",
    "**/*_GeneratedInjector*.*",
    "**/*_ComponentTreeDeps*.*",
    "*.Hilt_*",
    // Room generated
    "**/*_Impl*.*",
    // Compose compiler generated
    "**/*ComposableSingletons*.*",
    // Data-binding / view-binding
    "**/databinding/*",
    "**/DataBinderMapperImpl*",
    "**/DataBindingInfo*",
    "**/*BindingImpl*",
    "**/*Binding*.*",
    // kapt stubs & metadata
    "**/kapt/**"
)

tasks.register<JacocoReport>("jacocoTestReport") {
    dependsOn("testDebugUnitTest")

    reports {
        xml.required.set(true)
        html.required.set(true)
    }

    val debugTree = fileTree(layout.buildDirectory.dir("tmp/kotlin-classes/debug")) {
        exclude(fileFilter)
    } + fileTree(layout.buildDirectory.dir("intermediates/javac/debug")) {
        exclude(fileFilter)
    }

    val mainSrc = files("src/main/java", "src/main/kotlin")

    sourceDirectories.setFrom(mainSrc)
    classDirectories.setFrom(debugTree)
    executionData.setFrom(fileTree(layout.buildDirectory) {
        include(
            "outputs/unit_test_code_coverage/debugUnitTest/testDebugUnitTest.exec",
            "jacoco/testDebugUnitTest.exec"
        )
    })
}

tasks.register<JacocoCoverageVerification>("jacocoTestCoverageVerification") {
    dependsOn("testDebugUnitTest")

    val debugTree = fileTree(layout.buildDirectory.dir("tmp/kotlin-classes/debug")) {
        exclude(fileFilter)
    } + fileTree(layout.buildDirectory.dir("intermediates/javac/debug")) {
        exclude(fileFilter)
    }

    val mainSrc = files("src/main/java", "src/main/kotlin")

    sourceDirectories.setFrom(mainSrc)
    classDirectories.setFrom(debugTree)
    executionData.setFrom(fileTree(layout.buildDirectory) {
        include(
            "outputs/unit_test_code_coverage/debugUnitTest/testDebugUnitTest.exec",
            "jacoco/testDebugUnitTest.exec"
        )
    })

    violationRules {
        rule {
            limit {
                counter = "INSTRUCTION"
                value = "COVEREDRATIO"
                minimum = "0.80".toBigDecimal()
            }
            limit {
                counter = "BRANCH"
                value = "COVEREDRATIO"
                minimum = "0.80".toBigDecimal()
            }
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                minimum = "0.80".toBigDecimal()
            }
            limit {
                counter = "METHOD"
                value = "COVEREDRATIO"
                minimum = "0.80".toBigDecimal()
            }
        }
    }
}
