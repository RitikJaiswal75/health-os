package expo.modules.rncompatibility

import com.facebook.react.internal.featureflags.ReactNativeFeatureFlags as RNFeatureFlags

/**
 * Compatibility shim for expo-dev-menu-interface on React Native 0.77+.
 */
object ReactNativeFeatureFlags {
  val enableBridgelessArchitecture: Boolean
    get() = RNFeatureFlags.enableBridgelessArchitecture()
}
