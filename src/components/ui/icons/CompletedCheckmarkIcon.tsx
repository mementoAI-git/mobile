import { COLORS } from "@/constants/tokens";
import Check from 'lucide-react-native/icons/check';
import { View } from "react-native";

type CompletedCheckmarkIconProps = {
  size?: number;
  strokeWidth?: number;
  containerSize?: number;
};

export const CompletedCheckmarkIcon = ({
  size = 12,
  strokeWidth = 3,
  containerSize = size + 16,
}: CompletedCheckmarkIconProps) => (
  <View
    style={{
      width: containerSize,
      height: containerSize,
      borderRadius: containerSize / 2,
      backgroundColor: "#4ADE80",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Check
      size={size}
      color={COLORS.textInverse}
      strokeWidth={strokeWidth}
    />
  </View>
);