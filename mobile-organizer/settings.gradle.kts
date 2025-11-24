pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()

 //        Thư viện MPAndroidChart không được phân phối qua Maven Central hoặc Google Maven, mà được hotst trên JitPack
//        Mặc định, Grandle không tìm được JitPack nên cần thêm JitPack vào danh sách repository
        maven("https://jitpack.io")

        maven {
            url = uri("https://api.mapbox.com/downloads/v2/releases/maven")
            authentication {
                create<BasicAuthentication>("basic")
            }
            credentials {
                // Luôn để username là "mapbox"
                username = "mapbox"
                password = "sk.eyJ1Ijoibmd1eWVucXVhbmd0cnVvbmcwODExMjAwNSIsImEiOiJjbWk0ZmhibjUxenpnMmxzNThqdDM4enBuIn0.w5iFZP_v1XgIzV4q8R0iXA"
            }
        }
    }
}

rootProject.name = "Eventing-Organizer"
include(":app")
