import java.security.KeyStore
import java.security.MessageDigest
import java.util.HexFormat
import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
}

android {
    namespace = "com.mannlab.clef"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "com.mannlab.clef"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            keyAlias = keystoreProperties.getProperty("keyAlias")
            keyPassword = keystoreProperties.getProperty("keyPassword")
            storeFile = keystoreProperties.getProperty("storeFile")?.let { rootProject.file(it) }
            storePassword = keystoreProperties.getProperty("storePassword")
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

val verifyClefReleaseSigning = tasks.register("verifyClefReleaseSigning") {
    group = "verification"
    description = "Verify the existing Clef upload key without building an app."
    doLast {
        check(keystorePropertiesFile.isFile) { "Clef release requires android/key.properties." }
        fun requiredProperty(name: String): String =
            keystoreProperties.getProperty(name)?.takeIf { it.isNotBlank() }
                ?: error("Clef release signing property is missing: $name")
        val file = rootProject.file(requiredProperty("storeFile"))
        check(file.isFile) { "Clef release keystore file is missing." }
        val keys = KeyStore.getInstance(file, requiredProperty("storePassword").toCharArray())
        val alias = requiredProperty("keyAlias")
        check(keys.isKeyEntry(alias)) { "Clef release key alias is not a private key entry." }
        check(keys.getKey(alias, requiredProperty("keyPassword").toCharArray()) != null) {
            "Clef release private key is unavailable."
        }
        val certificate = keys.getCertificate(alias)
        val sha1 = HexFormat.ofDelimiter(":").withUpperCase().formatHex(
            MessageDigest.getInstance("SHA-1").digest(certificate.encoded),
        )
        check(sha1 == "4C:78:A9:1A:12:98:5C:CE:7B:CE:3E:C0:61:A9:CE:08:F1:7C:A1:B9") {
            "Clef release certificate does not match the recorded Play upload key: $sha1"
        }
        logger.lifecycle("Clef release upload certificate verified: $sha1")
    }
}

tasks.configureEach {
    if (name == "preReleaseBuild") dependsOn(verifyClefReleaseSigning)
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
