import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

type TabIcon = React.ComponentProps<typeof Ionicons>["name"];

const TAB_SCREENS: {
  name: string;
  title: string;
  icon: TabIcon;
  iconFocused: TabIcon;
}[] = [
  { name: "home", title: "Inicio", icon: "home-outline", iconFocused: "home" },
  {
    name: "operaciones",
    title: "Operaciones",
    icon: "swap-horizontal-outline",
    iconFocused: "swap-horizontal",
  },
  {
    name: "portafolio",
    title: "Portafolio",
    icon: "pie-chart-outline",
    iconFocused: "pie-chart",
  },
  { name: "pagos", title: "Pagos", icon: "cash-outline", iconFocused: "cash" },
  {
    name: "perfil",
    title: "Perfil",
    icon: "person-outline",
    iconFocused: "person",
  },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1FA774",
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
        tabBarStyle: {
          backgroundColor: "#080E0B",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.06)",
          elevation: 0,
          shadowColor: "transparent",
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      {TAB_SCREENS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
