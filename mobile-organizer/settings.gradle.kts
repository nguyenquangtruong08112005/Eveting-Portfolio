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

    }
}

rootProject.name = "Eventing-Organizer"
include(":app")
