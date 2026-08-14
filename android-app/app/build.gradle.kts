plugins {
    id("com.android.application")
}

android {
    namespace = "com.gusmarsan.confessoquebebi"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.gusmarsan.confessoquebebi"
        minSdk = 26
        targetSdk = 35
        versionCode = 9
        versionName = "0.7.2"
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
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
