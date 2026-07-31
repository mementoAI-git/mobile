import React, { useId } from "react";
import { Svg, G, Rect, Path, Defs, ClipPath, Pattern, Use, Image, SvgProps } from "react-native-svg";

const MODERN_ARTWORK_1 = require('../../../../assets/images/capsule-themes/modern-1.png');
const MODERN_ARTWORK_2 = require('../../../../assets/images/capsule-themes/modern-2.png');

export const Modern: React.FC<SvgProps> = (props) => {
  const id = useId();
  const clipId = `clip0_modern_${id}`;
  const pattern0Id = `pattern0_modern_${id}`;
  const pattern1Id = `pattern1_modern_${id}`;
  const image0Id = `image0_modern_${id}`;
  const image1Id = `image1_modern_${id}`;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 560 697"
      fill="none"
      {...props}
    >
      <G clipPath={`url(#${clipId})`}>
        <Rect width={560} height={697} rx={12} fill="#D4F4FC" />
        <Rect
          x={378.426}
          y={572.406}
          width={249.348}
          height={215.585}
          fill={`url(#${pattern0Id})`}
        />
        <Rect
          x={544.945}
          y={62.2773}
          width={2}
          height={47.4472}
          rx={0.999999}
          fill="#B1C6A9"
        />
        <Rect
          x={-21.5508}
          y={14.457}
          width={149.171}
          height={149.171}
          transform="rotate(24.3661 -21.5508 14.457)"
          fill={`url(#${pattern1Id})`}
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
            transform="matrix(0.000810304 0 0 0.000937207 -0.107728 0)"
          />
        </Pattern>
        <Pattern
          id={pattern1Id}
          patternContentUnits="objectBoundingBox"
          width={1}
          height={1}
        >
          <Use href={`#${image1Id}`} transform="scale(0.00159744)" />
        </Pattern>
        <ClipPath id={clipId}>
          <Rect width={560} height={697} rx={12} fill="white" />
        </ClipPath>
        <Image
          id={image0Id}
        width={1500}
        height={1067}
        preserveAspectRatio="none"
        href={MODERN_ARTWORK_1}
      />
      <Image
        id={image1Id}
        width={626}
        height={626}
        preserveAspectRatio="none"
        href={MODERN_ARTWORK_2}
      />
    </Defs>
    </Svg>
  );
};

