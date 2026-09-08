import Svg, { Circle, G } from 'react-native-svg';
import { computeDonutRatio } from '../dates/dateUtils';

interface DateCompletionRingProps {
  taken: number;
  scheduled: number;
  selected?: boolean;
  size?: number;
}

export function DateCompletionRing({
  taken,
  scheduled,
  selected = false,
  size = 40,
}: DateCompletionRingProps) {
  const ratio = computeDonutRatio(taken, scheduled);
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  const center = size / 2;
  const progressColor = ratio >= 1 ? '#4CAF50' : '#BB86FC';
  const hasProgress = scheduled > 0;
  const showSelectedFill = selected && !hasProgress;

  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${center}, ${center}`}>
        {showSelectedFill && (
          <Circle cx={center} cy={center} r={radius - 0.5} fill="#3A3A3C" />
        )}
        {hasProgress && (
          <>
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="#3A3A3C"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </>
        )}
      </G>
    </Svg>
  );
}
