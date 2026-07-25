import React, { useId } from "react";
import { Svg, G, Rect, Path, Defs, ClipPath, Pattern, Use, Image, SvgProps } from "react-native-svg";

const SAGE_ARTWORK = require('../../../../assets/images/capsule-themes/sage-1.png');

export const Sage: React.FC<SvgProps> = (props) => {
  const id = useId();
  const clipId = `clip0_sage_${id}`;
  const patternBId = `patternB_sage_${id}`;
  const patternCId = `patternC_sage_${id}`;
  const imageDId = `imageD_sage_${id}`;

  return (
    <Svg
      viewBox="0 0 560 697"
      width="100%"
      height="100%"
      fill="none"
      {...props}
    >
      <G clipPath={`url(#${clipId})`}>
        <Rect width={560} height={697} rx={12} fill="#F0FCD4" />
        <Path
          fill={`url(#${patternBId})`}
          d="M352.094 490.008H670.61v318.516H352.094z"
        />
        <Path
          transform="rotate(153.524 47.415 -87.58)scale(1 -1)"
          fill={`url(#${patternCId})`}
          d="M0 0h318.516v318.516H0z"
        />
        <Rect
          x={544.945}
          y={62.277}
          width={2}
          height={47.447}
          rx={1}
          fill="#b1c6a9"
        />
      </G>
      <Defs>
        <Pattern
          id={patternBId}
          patternContentUnits="objectBoundingBox"
          width={1}
          height={1}
        >
          <Use href={`#${imageDId}`} transform="scale(.00135)" />
        </Pattern>
        <Pattern
          id={patternCId}
          patternContentUnits="objectBoundingBox"
          width={1}
          height={1}
        >
          <Use href={`#${imageDId}`} transform="scale(.00135)" />
        </Pattern>
        <ClipPath id={clipId}>
          <Rect width={560} height={697} rx={12} fill="white" />
        </ClipPath>
        <Image
          id={imageDId}
          width={740}
          height={740}
          preserveAspectRatio="none"
          href={SAGE_ARTWORK}
        />
      </Defs>
    </Svg>
  );
};
