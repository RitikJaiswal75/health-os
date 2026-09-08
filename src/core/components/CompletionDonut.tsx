import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedProps, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { computeDonutRatio } from '../../core/dates/dateUtils';
import { tokens } from '../../core/theme/paperTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CompletionDonutProps {
  taken: number;
  scheduled: number;
  size?: number;
}

export function CompletionDonut({ taken, scheduled, size = 120 }: CompletionDonutProps) {
  const ratio = computeDonutRatio(taken, scheduled);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.round(ratio * 100);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: withTiming(circumference * (1 - ratio), { duration: 400 }),
  }));

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: scheduled, now: taken }}
      accessibilityLabel={`${taken} of ${scheduled} doses taken, ${percent} percent`}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#333"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ratio >= 1 ? '#4CAF50' : '#BB86FC'}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.label}>
        <Text variant="headlineSmall">{percent}%</Text>
        <Text variant="labelSmall">{taken}/{scheduled}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: tokens.spacing.md,
  },
  label: {
    position: 'absolute',
    alignItems: 'center',
  },
});
