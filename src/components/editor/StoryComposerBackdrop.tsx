import React from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useResolvedAppearance } from '@/hooks/use-theme-colors';
import { storyComposerPaperFrame } from '@/features/editor/story-composer-paper';

const ALBUM_LIGHT = require('../../../assets/images/story-composer/album-light.webp');
const ALBUM_DARK = require('../../../assets/images/story-composer/album-dark.webp');
const PAPER_GRAIN = require('../../../assets/images/story-composer/paper-grain.png');

/**
 * The add-story page's album paper, matching web's mobile story composer
 * (`.story-composer-paper`): light or dark artwork by appearance, plus a
 * 10% paper grain on light. Sits behind the page content.
 */
export const StoryComposerBackdrop = React.memo(function StoryComposerBackdrop() {
  const appearance = useResolvedAppearance();
  const { width, height } = useWindowDimensions();
  const frame = storyComposerPaperFrame(width, height);
  const dark = appearance === 'dark';

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image
        testID="story-composer-album"
        source={dark ? ALBUM_DARK : ALBUM_LIGHT}
        resizeMode="stretch"
        style={[styles.paper, frame]}
      />
      {!dark && (
        <Image
          source={PAPER_GRAIN}
          resizeMode="repeat"
          style={[styles.grain, { width, height: frame.height }]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  paper: {
    position: 'absolute',
    top: 0,
  },
  grain: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0.1,
  },
});
