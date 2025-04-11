import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  RefreshControl, // Added missing import
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";

const ExchangeCouponsScreen = () => {
  const [couponName, setCouponName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [matchingCoupons, setMatchingCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleSearch = async () => {
    if (!couponName.trim() || !category.trim() || !price.trim()) {
      Alert.alert("🚫 Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("🚫 Error", "Please log in to search coupons.");
        return;
      }

      const couponsRef = collection(db, "coupons");
      const q = query(couponsRef, where("userId", "!=", user.uid));
      const snapshot = await getDocs(q);

      const matchedCoupons = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (coupon) =>
            coupon.category === category ||
            parseFloat(coupon.value) === parseFloat(price)
        );

      setMatchingCoupons(matchedCoupons);
    } catch (error) {
      console.error("Error fetching coupons:", error.message);
      Alert.alert("❌ Error", "Failed to search coupons. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setCouponName("");
    setCategory("");
    setPrice("");
    setMatchingCoupons([]);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await handleSearch();
    setRefreshing(false);
  }, [couponName, category, price]);

  const renderCouponItem = ({ item }) => (
    <View style={styles.couponCard}>
      <Text style={styles.couponName}>🎟️ {item.name || "Unnamed"}</Text>
      <Text style={styles.couponDetail}>
        📂 Category: {item.category || "N/A"}
      </Text>
      <Text style={styles.couponDetail}>💰 Price: ₹{item.value || "N/A"}</Text>
      {item.expiryDate && (
        <Text style={styles.couponDetail}>
          ⏳ Expires: {new Date(item.expiryDate).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Searching coupons... 🔍</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Exchange Coupons</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>📝 Your Coupon Name</Text>
              <TextInput
                style={styles.input}
                value={couponName}
                onChangeText={setCouponName}
                placeholder="e.g., Amazon ₹100"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>📂 Coupon Category</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="e.g., Shopping, Food, Travel"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>💰 Coupon Price</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholder="e.g., 100"
                placeholderTextColor="#aaa"
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
              >
                <Text style={styles.buttonText}>🗑️ Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleSearch}
                disabled={loading}
              >
                <Text style={styles.buttonText}>🔍 Search Coupons</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.subHeading}>Matching Coupons</Text>
          <FlatList
            data={matchingCoupons}
            renderItem={renderCouponItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text style={styles.emptyText}>😕 No matching coupons found</Text>
            }
            contentContainerStyle={styles.listContent}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: "#6a5acd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  content: {
    marginTop: 70, // Offset for fixed header
    padding: 20,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
    color: "#111827",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  clearButton: {
    backgroundColor: "#EF4444",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    flex: 1,
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  subHeading: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 10,
  },
  couponCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  couponName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  couponDetail: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6B7280",
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default ExchangeCouponsScreen;
