import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, GestureResponderEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, FONTS } from '@/constants/tokens';
import * as Haptics from 'expo-haptics';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

interface ChartPoint {
  label: string;
  value: number;
}

interface SplineChartProps {
  data?: ChartPoint[];
  height?: number;
}

const DEFAULT_DATA: ChartPoint[] = [
  { label: 'Mon', value: 2 },
  { label: 'Tue', value: 4 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 7 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 9 },
  { label: 'Sun', value: 6 },
];

export function SplineChart({ 
  data = DEFAULT_DATA, 
  height = 180, 
}: SplineChartProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  
  // Initial width dynamically computed: screen width minus external margins (48px) and card padding (40px)
  const initialWidth = Dimensions.get('window').width - 88;
  const [containerWidth, setContainerWidth] = useState(initialWidth);

  // Measure the available inner width directly from the layout wrapper
  const handleLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  const paddingLeft = scale(30);
  const paddingRight = scale(15);
  const paddingTop = verticalScale(20);
  const paddingBottom = verticalScale(30);

  const chartWidth = containerWidth - paddingLeft - paddingRight;
  const chartHeight = verticalScale(height) - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.value), 10);
  const minVal = 0;

  // Calculate coordinates
  const coords = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  // Generate cubic bezier curve path
  let pathD = '';
  if (coords.length > 0) {
    pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      // Smooth control points
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + (2 * (p1.x - p0.x)) / 3;
      const cp2y = p1.y;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
  }

  // Generate path for the filled gradient area underneath the spline
  const fillD = coords.length > 0 
    ? `${pathD} L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} L ${coords[0].x} ${paddingTop + chartHeight} Z`
    : '';

  const handleTouch = (event: GestureResponderEvent) => {
    const touchX = event.nativeEvent.locationX;
    // Find closest index
    let closestIdx = 0;
    let minDiff = Infinity;
    coords.forEach((coord, i) => {
      const diff = Math.abs(coord.x - touchX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });

    if (closestIdx !== activeIdx) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveIdx(closestIdx);
    }
  };

  const handleTouchRelease = () => {
    setActiveIdx(null);
  };

  // Touch responder setup
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: handleTouch,
    onPanResponderMove: handleTouch,
    onPanResponderRelease: handleTouchRelease,
    onPanResponderTerminate: handleTouchRelease,
  });

  const activePoint = activeIdx !== null ? coords[activeIdx] : null;

  return (
    <View className="bg-white border border-stroke-weaker rounded-3xl p-5 shadow-sm overflow-hidden">
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xs text-text-weak font-medium uppercase tracking-wider" style={{ fontFamily: FONTS.sansMedium }}>
            Memory Activity
          </Text>
          <Text className="text-lg font-bold text-text-strong mt-0.5" style={{ fontFamily: FONTS.sansBold }}>
            Story Trends
          </Text>
        </View>
        
        {activePoint ? (
          <View className="bg-brand/10 border border-brand/20 px-3 py-1 rounded-full">
            <Text className="text-xs font-bold text-brand" style={{ fontFamily: FONTS.sansBold }}>
              {activePoint.value} {activePoint.value === 1 ? 'story' : 'stories'} on {activePoint.label}
            </Text>
          </View>
        ) : (
          <View className="bg-fill-weaker px-3 py-1 rounded-full">
            <Text className="text-[10px] text-text-weak font-semibold uppercase tracking-wider" style={{ fontFamily: FONTS.sansBold }}>
              Touch & drag to inspect
            </Text>
          </View>
        )}
      </View>

      {/* Measure the inner available width directly on the SVG wrapper view */}
      <View 
        {...panResponder.panHandlers} 
        className="relative w-full"
        onLayout={handleLayout}
      >
        <Svg height={verticalScale(height)} width={containerWidth}>
          <Defs>
            <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={COLORS.brand} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={COLORS.brand} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>
 
          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = paddingTop + p * chartHeight;
            const val = Math.round(maxVal - p * (maxVal - minVal));
            return (
              <React.Fragment key={i}>
                <Line 
                  x1={paddingLeft} 
                  y1={y} 
                  x2={containerWidth - paddingRight} 
                  y2={y} 
                  stroke={COLORS.strokeWeaker} 
                  strokeWidth={scale(1)} 
                  strokeDasharray={`${scale(4)} ${scale(4)}`}
                />
                <SvgText 
                  x={paddingLeft - scale(8)} 
                  y={y + verticalScale(3)}
                  textAnchor="end"
                  fill={COLORS.textMuted}
                  fontSize={moderateScale(9)}
                  fontFamily={FONTS.sansMedium}
                >
                  {val}
                </SvgText>
              </React.Fragment>
            );
          })}
 
          {/* Fill path under curve */}
          {fillD ? <Path d={fillD} fill="url(#chartGradient)" /> : null}
 
          {/* Spline line curve */}
          {pathD ? (
            <Path 
              d={pathD} 
              fill="none" 
              stroke={COLORS.brand} 
              strokeWidth={scale(3.5)} 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          ) : null}
 
          {/* Node dots */}
          {coords.map((coord, i) => (
            <Circle 
              key={i} 
              cx={coord.x} 
              cy={coord.y} 
              r={scale(4.5)} 
              fill="white" 
              stroke={COLORS.brand} 
              strokeWidth={scale(2.5)} 
            />
          ))}
 
          {/* Touch-interactive guide lines and indicators */}
          {activePoint && (
            <React.Fragment>
              {/* Vertical line guide */}
              <Line 
                x1={activePoint.x} 
                y1={paddingTop} 
                x2={activePoint.x} 
                y2={paddingTop + chartHeight} 
                stroke={COLORS.brand} 
                strokeWidth={scale(1.5)} 
              />
              {/* Pulsing focal circle dot */}
              <Circle 
                cx={activePoint.x} 
                cy={activePoint.y} 
                r={scale(7.5)} 
                fill={COLORS.brand} 
                opacity="0.3"
              />
              <Circle 
                cx={activePoint.x} 
                cy={activePoint.y} 
                r={scale(4.5)} 
                fill={COLORS.brand} 
              />
            </React.Fragment>
          )}
 
          {/* X Axis Labels */}
          {coords.map((coord, i) => (
            <SvgText 
              key={i} 
              x={coord.x} 
              y={paddingTop + chartHeight + verticalScale(18)}
              textAnchor="middle"
              fill={activeIdx === i ? COLORS.brand : COLORS.textMuted}
              fontSize={moderateScale(9)}
              fontFamily={activeIdx === i ? FONTS.sansBold : FONTS.sansMedium}
            >
              {coord.label}
            </SvgText>
          ))}
        </Svg>
      </View>
    </View>
  );
}
