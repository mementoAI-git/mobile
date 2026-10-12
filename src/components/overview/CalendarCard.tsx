import React, { useMemo } from "react";
import {
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Pressable } from "@/components/ui/Touchable";
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import * as Haptics from "expo-haptics";
import { COLORS } from "@/constants/tokens";
import { TYPE } from "@/constants/typography";

const WEEKDAYS = [
    "SUN",
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
];

export type CalendarCardProps = {
    month: Date;
    selectedDate?: number | null;
    eventDates?: number[];

    time?: string;

    onPreviousMonth?: () => void;
    onNextMonth?: () => void;
    onMonthPress?: () => void;
    onDatePress?: (day: number) => void;
    onTimePress?: () => void;
};

export function CalendarCard({
    month,
    selectedDate,
    eventDates = [],
    time = "9:41 AM",

    onPreviousMonth,
    onNextMonth,
    onMonthPress,
    onDatePress,
    onTimePress,
}: CalendarCardProps) {
    const eventSet = useMemo(
        () => new Set(eventDates),
        [eventDates],
    );

    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const monthName = month.toLocaleString("en-US", {
        month: "long",
    });

    const today = useMemo(() => new Date(), []);
    const isCurrentMonth =
        year === today.getFullYear() && monthIndex === today.getMonth();
    const todayDate = isCurrentMonth ? today.getDate() : null;

    const daysInMonth = new Date(
        year,
        monthIndex + 1,
        0,
    ).getDate();

    const firstWeekday = new Date(
        year,
        monthIndex,
        1,
    ).getDay();

    const weeks = useMemo(() => {
        const cells: Array<number | null> = [
            ...Array(firstWeekday).fill(null),
            ...Array.from(
                { length: daysInMonth },
                (_, index) => index + 1,
            ),
        ];

        while (cells.length % 7 !== 0) {
            cells.push(null);
        }

        const result: Array<Array<number | null>> = [];

        for (let i = 0; i < cells.length; i += 7) {
            result.push(cells.slice(i, i + 7));
        }

        return result;
    }, [firstWeekday, daysInMonth]);

    const handlePrevious = () => {
        Haptics.selectionAsync();
        onPreviousMonth?.();
    };

    const handleNext = () => {
        Haptics.selectionAsync();
        onNextMonth?.();
    };

    const handleDatePress = (day: number) => {
        Haptics.selectionAsync();
        onDatePress?.(day);
    };

    const handleMonthPress = () => {
        Haptics.selectionAsync();
        onMonthPress?.();
    };

    const handleTimePress = () => {
        Haptics.selectionAsync();
        onTimePress?.();
    };

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={handleMonthPress}
                    hitSlop={8}
                    style={styles.monthButton}
                >
                    <Text style={styles.month}>
                        {monthName} {year}
                    </Text>

                    <ChevronRight
                        size={18}
                        color={COLORS.brand}
                        strokeWidth={2.4}
                    />
                </Pressable>

                <View style={styles.navigation}>
                    <Pressable
                        onPress={handlePrevious}
                        hitSlop={12}
                        style={styles.navigationButton}
                        accessibilityLabel="Previous month"
                    >
                        <ChevronLeft
                            size={24}
                            color={COLORS.brand}
                            strokeWidth={2.4}
                        />
                    </Pressable>

                    <Pressable
                        onPress={handleNext}
                        hitSlop={12}
                        style={styles.navigationButton}
                        accessibilityLabel="Next month"
                    >
                        <ChevronRight
                            size={24}
                            color={COLORS.brand}
                            strokeWidth={2.4}
                        />
                    </Pressable>
                </View>
            </View>

            {/* Weekday labels */}
            <View style={styles.weekdays}>
                {WEEKDAYS.map((weekday) => (
                    <View
                        key={weekday}
                        style={styles.weekdayCell}
                    >
                        <Text style={styles.weekday}>
                            {weekday}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Calendar */}
            <View style={styles.calendar}>
                {weeks.map((week, weekIndex) => (
                    <View
                        key={weekIndex}
                        style={styles.week}
                    >
                        {week.map((day, columnIndex) => {
                            if (!day) {
                                return (
                                    <View
                                        key={`blank-${columnIndex}`}
                                        style={styles.dayCell}
                                    />
                                );
                            }

                            const isToday = day === todayDate;
                            const isSelected = selectedDate != null && day === selectedDate && !isToday;
                            const hasEvent = eventSet.has(day);

                            return (
                                <Pressable
                                    key={day}
                                    onPress={() => handleDatePress(day)}
                                    hitSlop={3}
                                    style={styles.dayCell}
                                >
                                    <View
                                        style={[
                                            styles.dayNumberContainer,
                                            isToday && styles.todayDay,
                                            isSelected && styles.selectedDay,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dayNumber,
                                                isToday && styles.todayDayNumber,
                                                isSelected && styles.selectedDayNumber,
                                            ]}
                                        >
                                            {day}
                                        </Text>
                                    </View>

                                    {hasEvent && (
                                        <View style={styles.eventDot} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.timeLabel}>
                    Time
                </Text>

                <Pressable
                    onPress={handleTimePress}
                    style={styles.timeButton}
                >
                    <Text style={styles.timeText}>
                        {time}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: "100%",

        backgroundColor: COLORS.card,

        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.strokeWeaker,

        overflow: "hidden",

        paddingHorizontal: 16,
        paddingTop: 24,
        paddingBottom: 16,
    },

    // ─────────────────────────────
    // Header
    // ─────────────────────────────

    header: {
        height: 24,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    monthButton: {
        height: 24,

        flexDirection: "row",
        alignItems: "center",

        gap: 6,
    },

    month: {
        // ...TYPE.uiTitle,
        color: COLORS.textStrong,
        letterSpacing: -0.3,
        includeFontPadding: false,
    },

    navigation: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
    },

    navigationButton: {
        width: 24,
        height: 24,

        alignItems: "center",
        justifyContent: "center",
    },

    // ─────────────────────────────
    // Weekday header
    // ─────────────────────────────

    weekdays: {
        height: 18,

        flexDirection: "row",

        marginTop: 18,
    },

    weekdayCell: {
        flex: 1,

        alignItems: "center",
        justifyContent: "flex-start",
    },

    weekday: {
        ...TYPE.bodySmall,
        color: COLORS.textWeak,
        letterSpacing: -0.1,
        includeFontPadding: false,
    },

    // ─────────────────────────────
    // Dates
    // ─────────────────────────────

    calendar: {
        marginTop: 8,
    },

    week: {
        height: 46,

        flexDirection: "row",
    },

    dayCell: {
        flex: 1,
        height: 46,

        position: "relative",

        alignItems: "center",
    },

    dayNumberContainer: {
        width: 40,
        height: 40,

        borderRadius: 20,

        alignItems: "center",
        justifyContent: "center",

        position: "absolute",
        top: 0,
    },

    dayNumber: {
        // ...TYPE.uiTitle,
        ...TYPE.body,
        color: COLORS.textStrong,
        letterSpacing: -0.35,
        includeFontPadding: false,
    },

    todayDay: {
        backgroundColor: COLORS.brand,
    },

    todayDayNumber: {
        ...TYPE.stat,
        color: COLORS.textInverse,
    },

    selectedDay: {
        borderWidth: 1.5,
        borderColor: COLORS.brand,
        backgroundColor: COLORS.brandSubtle,
    },

    selectedDayNumber: {
        ...TYPE.stat,
        color: COLORS.brand,
    },

    eventDot: {
        position: "absolute",
        top: 40,

        width: 4,
        height: 4,

        borderRadius: 2,

        backgroundColor: COLORS.linkPreview,
    },

    // ─────────────────────────────
    // Time
    // ─────────────────────────────

    footer: {
        height: 34,

        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",

        marginTop: 14,
    },

    timeLabel: {
        ...TYPE.button,
        color: COLORS.textStrong,
        letterSpacing: -0.25,
        includeFontPadding: false,
    },

    timeButton: {
        height: 34,
        paddingHorizontal: 14,

        borderRadius: 10,

        backgroundColor: COLORS.fillWeak,

        alignItems: "center",
        justifyContent: "center",
    },

    timeText: {
        ...TYPE.body,
        color: COLORS.textStrong,
        letterSpacing: -0.35,
        includeFontPadding: false,
    },
});