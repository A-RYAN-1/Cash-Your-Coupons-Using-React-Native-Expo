// App.js
import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "./firebase";
import LoginScreen from "./screens/LoginScreen";
import SellCouponsScreen from "./screens/SellCouponsScreen";
import BuyCouponsScreen from "./screens/BuyCouponsScreen";
import ExchangeCouponsScreen from "./screens/ExchangeCouponsScreen";
import ProfileScreen from "./screens/ProfileScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === "Sell") iconName = "pricetag";
        else if (route.name === "Buy") iconName = "cart";
        else if (route.name === "Exchange") iconName = "swap-horizontal";
        else if (route.name === "Profile") iconName = "person";
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: "#007AFF",
      tabBarInactiveTintColor: "#666",
      tabBarStyle: { backgroundColor: "#fff", paddingBottom: 5, height: 60 },
      headerShown: false, // Ensure no header interferes with keyboard
    })}
  >
    <Tab.Screen
      name="Sell"
      component={SellCouponsScreen}
      options={{
        title: "Sell Coupons",
        keyboardHandlingEnabled: true, // Enable keyboard handling
      }}
    />
    <Tab.Screen
      name="Buy"
      component={BuyCouponsScreen}
      options={{
        title: "Buy Coupons",
        keyboardHandlingEnabled: true,
      }}
    />
    <Tab.Screen
      name="Exchange"
      component={ExchangeCouponsScreen}
      options={{
        title: "Exchange Coupons",
        keyboardHandlingEnabled: true,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        title: "Profile",
        keyboardHandlingEnabled: true,
      }}
    />
  </Tab.Navigator>
);

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? "Main" : "Login"}
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
          keyboardHandlingEnabled: true, // Enable keyboard handling at stack level
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
