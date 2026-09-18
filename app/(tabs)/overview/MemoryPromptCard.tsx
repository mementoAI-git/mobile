import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Plus } from "lucide-react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { MemoryCardArtwork } from "./MemoryCardArtwork";
import { FONTS } from "@/constants/tokens";
import { TYPE } from "@/constants/typography";

const AnimatedPressable =
    Animated.createAnimatedComponent(Pressable);

type MemoryPromptCardProps = {
    onAddStory: () => void;
};

export function MemoryPromptCard({
    onAddStory,
}: MemoryPromptCardProps) {
    const pressed = useSharedValue(0);

    const buttonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            {
                scale: 1 - pressed.value * 0.015,
            },
        ],
    }));

    return (
        <LinearGradient
            colors={[
                "#0B8EEA",
                "#159EEA",
                "#54C5F5",
                "#79DDFB",
            ]}
            locations={[0, 0.34, 0.74, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.card}
        >
            <View style={styles.hero}>
                <MemoryCardArtwork />

                <Text
                    style={styles.heading}
                >
                    Write a memory, journal{"\n"}
                    entry, or quick note
                </Text>
            </View>

            <AnimatedPressable
                onPress={onAddStory}
                onPressIn={() => {
                    pressed.value = withTiming(1, {
                        duration: 100,
                    });
                }}
                onPressOut={() => {
                    pressed.value = withTiming(0, {
                        duration: 180,
                    });
                }}
                accessibilityRole="button"
                accessibilityLabel="Add new story"
                style={[
                    styles.button,
                    buttonAnimatedStyle,
                ]}
            >
                <Plus
                    size={21}
                    strokeWidth={2.25}
                    color="#28231F"
                />

                <Text
                    allowFontScaling={false}
                    style={styles.buttonText}
                >
                    Add new story
                </Text>
            </AnimatedPressable>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "100%",
        borderRadius: 18,
        overflow: "hidden",

        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 16,
    },

    hero: {
        height: 83,
        flexDirection: "row",
        alignItems: "flex-start",
    },

    heading: {
        flex: 1,

        marginLeft: 19,
        ...TYPE.cardTitle,
        marginTop: 9,

        color: "#FFFFFF",

        letterSpacing: -0.15,

        includeFontPadding: false,
    },

    button: {
        height: 40,

        borderRadius: 8,
        backgroundColor: "#FFFFFF",

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",

        gap: 9,
    },

    buttonText: {
        ...TYPE.button,

        color: "#28231F",

        letterSpacing: -0.2,

        includeFontPadding: false,
    },
});