import { Image, StyleSheet, View } from 'react-native';

/** Full-bleed branded splash shown while the app initializes. */
export function AppLaunchScreen() {
  return (
    <View style={styles.root} accessibilityLabel="Loading Health OS">
      <Image
        source={require('../../../assets/images/Splash_Screen.png')}
        style={styles.image}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
