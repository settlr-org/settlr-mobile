import { Platform } from "react-native";
export const colors = {
  ink: "#18312b",
  muted: "#687972",
  cream: "#f3f5ef",
  paper: "#fffefa",
  sage: "#dcece4",
  teal: "#176b54",
  coral: "#bd4e54",
  line: "#d9e1da",
  gold: "#eea946",
  white: "#ffffff",
} as const;
export const type = {
  title: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "Georgia",
  }),
};
export const shadow = {
  shadowColor: "#18312b",
  shadowOpacity: 0.08,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
} as const;
