import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { C, SANS } from "@/lib/design";
import { isValidDateKey, localDateKey } from "@/lib/format";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function parseDateKey(value: string) {
  return isValidDateKey(value) ? new Date(`${value}T12:00:00`) : null;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

function formatLongDate(value: string) {
  const date = parseDateKey(value);
  return date ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(date) : "";
}

export function DatePickerField({ label, value, onChange, placeholder = "Toque para escolher uma data", clearable = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; clearable?: boolean }) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseDateKey(value) ?? new Date()));
  const todayKey = localDateKey();
  const monthTitle = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(visibleMonth);
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12).getDay();
  const mondayOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0, 12).getDate();
  const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
  const selectedLabel = formatLongDate(value);

  const toggleCalendar = () => {
    if (!open) setVisibleMonth(startOfMonth(parseDateKey(value) ?? new Date()));
    setOpen((current) => !current);
  };

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12));
  };

  const chooseDay = (day: number) => {
    const selectedDate = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day, 12, 0, 0, 0);
    onChange(localDateKey(selectedDate));
    setOpen(false);
  };

  const chooseToday = () => {
    const today = new Date();
    onChange(todayKey);
    setVisibleMonth(startOfMonth(today));
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {clearable && value ? <Pressable onPress={() => onChange("")} accessibilityRole="button" accessibilityLabel={`Limpar ${label.toLocaleLowerCase("pt-BR")}`} hitSlop={8}><Text style={styles.clearText}>Limpar</Text></Pressable> : null}
      </View>
      <Pressable
        onPress={toggleCalendar}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel || "sem data selecionada"}. ${open ? "Fechar" : "Abrir"} calendário.`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.valueButton, { opacity: pressed ? 0.78 : 1 }]}
      >
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={C.blue} />
        <Text style={[styles.valueText, !selectedLabel ? styles.placeholder : null]}>{selectedLabel || placeholder}</Text>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={19} color={C.muted} />
      </Pressable>

      {open ? <View style={styles.calendar}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => changeMonth(-1)} accessibilityRole="button" accessibilityLabel="Mês anterior" hitSlop={8} style={styles.monthButton}><MaterialCommunityIcons name="chevron-left" size={22} color={C.ink} /></Pressable>
          <Text accessibilityRole="header" style={styles.monthTitle}>{monthTitle.charAt(0).toLocaleUpperCase("pt-BR") + monthTitle.slice(1)}</Text>
          <Pressable onPress={() => changeMonth(1)} accessibilityRole="button" accessibilityLabel="Mês seguinte" hitSlop={8} style={styles.monthButton}><MaterialCommunityIcons name="chevron-right" size={22} color={C.ink} /></Pressable>
        </View>
        <View style={styles.weekdays}>{WEEKDAYS.map((weekday, index) => <Text key={`${weekday}-${index}`} accessibilityLabel={weekday} style={styles.weekday}>{weekday}</Text>)}</View>
        <View style={styles.daysGrid}>
          {Array.from({ length: cellCount }, (_, index) => {
            const day = index - mondayOffset + 1;
            if (day < 1 || day > daysInMonth) return <View key={`blank-${index}`} style={styles.dayCell} />;
            const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day, 12, 0, 0, 0);
            const dateKey = localDateKey(date);
            const selected = dateKey === value;
            const today = dateKey === todayKey;
            const spokenDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
            return <Pressable
              key={dateKey}
              onPress={() => chooseDay(day)}
              accessibilityRole="button"
              accessibilityLabel={`Escolher ${spokenDate}`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.dayCell, selected ? styles.selectedDay : null, !selected && today ? styles.todayDay : null, { opacity: pressed ? 0.72 : 1 }]}
            ><Text style={[styles.dayText, selected ? styles.selectedDayText : null, !selected && today ? styles.todayDayText : null]}>{day}</Text></Pressable>;
          })}
        </View>
        <Pressable onPress={chooseToday} accessibilityRole="button" accessibilityLabel="Escolher hoje" style={({ pressed }) => [styles.todayButton, { opacity: pressed ? 0.75 : 1 }]}>
          <MaterialCommunityIcons name="calendar-today" size={16} color={C.greenDark} />
          <Text style={styles.todayButtonText}>Hoje</Text>
        </Pressable>
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 7 },
  labelRow: { minHeight: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  label: { color: C.ink, fontFamily: SANS, fontWeight: "700", fontSize: 13 },
  clearText: { color: C.blue, fontFamily: SANS, fontWeight: "700", fontSize: 12, paddingHorizontal: 3 },
  valueButton: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: C.line, backgroundColor: "#FCFBF8", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  valueText: { flex: 1, color: C.ink, fontFamily: SANS, fontSize: 14 },
  placeholder: { color: C.muted },
  calendar: { backgroundColor: C.surface, borderRadius: 17, borderWidth: 1, borderColor: C.line, padding: 13, gap: 11 },
  monthHeader: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  monthButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  monthTitle: { flex: 1, textAlign: "center", color: C.ink, fontFamily: SANS, fontWeight: "700", fontSize: 15 },
  weekdays: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 1 },
  weekday: { width: "13.6%", textAlign: "center", color: C.muted, fontFamily: SANS, fontWeight: "700", fontSize: 10 },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 5 },
  dayCell: { width: "13.6%", aspectRatio: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  selectedDay: { backgroundColor: C.green, borderWidth: 1, borderColor: C.green },
  todayDay: { backgroundColor: C.blueSoft, borderWidth: 1, borderColor: C.blue },
  dayText: { color: C.ink, fontFamily: SANS, fontWeight: "600", fontSize: 13 },
  selectedDayText: { color: "#FFFFFF", fontWeight: "800" },
  todayDayText: { color: C.blueDark, fontWeight: "800" },
  todayButton: { alignSelf: "flex-end", minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, backgroundColor: C.greenSoft, paddingHorizontal: 12 },
  todayButtonText: { color: C.greenDark, fontFamily: SANS, fontWeight: "700", fontSize: 12 },
});
