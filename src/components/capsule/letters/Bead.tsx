import React, { useId } from 'react';
import { Svg, G, Rect, Defs, ClipPath, Pattern, Use, Image, SvgProps } from 'react-native-svg';

const BEAD_ARTWORK_1 = require('../../../../assets/images/capsule-themes/bead-1.png');
const BEAD_ARTWORK_2 = require('../../../../assets/images/capsule-themes/bead-2.png');

export const Bead: React.FC<SvgProps> = (props) => {
  const id = useId();
  const clipId = `clip0_bead_${id}`;
  const pattern0Id = `pattern0_bead_${id}`;
  const pattern1Id = `pattern1_bead_${id}`;
  const image0Id = `image0_bead_${id}`;
  const image1Id = `image1_bead_${id}`;

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 560 697"
      fill="none"
      {...props}
    >
      <G clipPath={`url(#${clipId})`}>
        <Rect width={560} height={697} rx={12} fill="#FFE3F7" />
        <Rect
          x={357.797}
          y={574.359}
          width={267.66}
          height={209.779}
          transform="rotate(-13.3714 357.797 574.359)"
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
          x={-0.527344}
          y={30.9531}
          width={184.444}
          height={150.379}
          transform="rotate(49.4023 -0.527344 30.9531)"
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
          <Use href={`#${image0Id}`} transform="scale(0.00125 0.0015949)" />
        </Pattern>
        <Pattern
          id={pattern1Id}
          patternContentUnits="objectBoundingBox"
          width={1}
          height={1}
        >
          <Use
            href={`#${image1Id}`}
            transform="scale(0.000831947 0.00102041)"
          />
        </Pattern>
        <ClipPath id={clipId}>
          <Rect width={560} height={697} rx={12} fill="white" />
        </ClipPath>
        <Image
          id={image0Id}
          width={800}
          height={627}
          preserveAspectRatio="none"
          href={BEAD_ARTWORK_1}
        />
        <Image
          id={image1Id}
          width={1202}
          height={980}
          preserveAspectRatio="none"
          href={BEAD_ARTWORK_2}
        />
      </Defs>
    </Svg>
  );
};

