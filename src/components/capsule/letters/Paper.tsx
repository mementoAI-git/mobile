import React, { useId } from "react";
import { Svg, G, Rect, Path, Defs, ClipPath, Pattern, Use, Image, SvgProps } from "react-native-svg";

const PAPER_ARTWORK = require('../../../../assets/images/capsule-themes/paper-1.png');

export const Paper: React.FC<SvgProps> = (props) => {
  const id = useId();
  const pattern0Id = `pattern0_paper_${id}`;
  const image0Id = `image0_paper_${id}`;

  return (
    <Svg
    width="100%"
    height="100%"
    preserveAspectRatio="xMidYMid slice"
    viewBox="0 0 560 697"
    fill="none"
    {...props}
  >
    <Rect width={560} height={697} rx={12} fill={`url(#${pattern0Id})`} />
    <Rect
      x={544.945}
      y={62.2773}
      width={2}
      height={47.4472}
      rx={0.999999}
      fill="black"
      fillOpacity={0.1}
    />
    <Defs>
      <Pattern
        id={pattern0Id}
        patternContentUnits="objectBoundingBox"
        width={1}
        height={1}
      >
        <Use
          href={`#${image0Id}`}
          transform="matrix(0.000925926 0 0 0.000743929 0 -0.00178013)"
        />
      </Pattern>
      <Image
        id={image0Id}
        width={1080}
        height={1349}
        preserveAspectRatio="none"
        href={PAPER_ARTWORK}
      />
    </Defs>
    </Svg>
  );
};

