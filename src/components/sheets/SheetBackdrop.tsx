import { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useResolvedAppearance } from '@/hooks/use-theme-colors';
import { SHEET_BACKDROP } from '@/features/layout/sheet-presentation';

/**
 * Backdrop dimming behind bottom sheets, matching web `--overlay-backdrop`:
 * light rgba(94,94,94,0.5); dark and Deep Sky rgba(64,66,76,0.55).
 */
export const SHEET_BACKDROP_OPACITY = {
  light: SHEET_BACKDROP.light.opacity,
  dark: SHEET_BACKDROP.dark.opacity,
} as const;

type SheetBackdropProps = BottomSheetBackdropProps &
  Partial<Pick<React.ComponentProps<typeof BottomSheetBackdrop>, 'pressBehavior' | 'onPress' | 'enableTouchThrough'>>;

/** Shared themed backdrop: pass directly as `backdropComponent={SheetBackdrop}`. */
export function SheetBackdrop(props: SheetBackdropProps) {
  const appearance = useResolvedAppearance();
  const backdrop = SHEET_BACKDROP[appearance];
  return (
    <BottomSheetBackdrop
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior="close"
      {...props}
      style={[props.style, { backgroundColor: backdrop.color }]}
      opacity={backdrop.opacity}
    />
  );
}
