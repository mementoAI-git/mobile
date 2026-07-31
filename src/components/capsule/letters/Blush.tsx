import React, { useId } from "react";
import { Svg, G, Rect, Path, Defs, ClipPath, Pattern, Use, Image, SvgProps } from "react-native-svg";

const BLUSH_ARTWORK = require('../../../../assets/images/capsule-themes/blush-1.png');

export const Blush: React.FC<SvgProps> = (props) => {
  const id = useId();
  const clipId = `clip0_peach_${id}`;
  const pattern0Id = `pattern0_peach_${id}`;
  const pattern1Id = `pattern1_peach_${id}`;
  const image0Id = `image0_peach_${id}`;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 560 697"
      fill="none"
      {...props}
    >
      <G clipPath={`url(#${clipId})`}>
        <Rect width={560} height={697} rx={12} fill="#FFE5D9" />
        <Rect
          x={377.094}
          y={418.328}
          width={279.777}
          height={395.436}
          fill={`url(#${pattern0Id})`}
        />
        <Rect
          x={-154.113}
          y={-220.551}
          width={334.003}
          height={472.078}
          transform="rotate(14.0256 -154.113 -220.551)"
          fill={`url(#${pattern1Id})`}
        />
        <Rect
          x={544.945}
          y={62.2773}
          width={2}
          height={47.4472}
          rx={0.999999}
          fill="#B1C6A9"
        />
      </G>
      <Defs>
        <Pattern
          id={pattern0Id}
          patternContentUnits="objectBoundingBox"
          width={1}
          height={1}
        >
          <Use
            href={`#${image0Id}`}
            transform="scale(0.00230947 0.00163399)"
          />
        </Pattern>
        <Pattern
          id={pattern1Id}
          patternContentUnits="objectBoundingBox"
          width={1}
          height={1}
        >
          <Use
            href={`#${image0Id}`}
            transform="scale(0.00230947 0.00163399)"
          />
        </Pattern>
        <ClipPath id={clipId}>
          <Rect width={560} height={697} rx={12} fill="white" />
        </ClipPath>
        <Image
          id={image0Id}
          width={433}
          height={612}
          preserveAspectRatio="none"
          href={BLUSH_ARTWORK}
        />
      </Defs>
    </Svg>
  );
};
