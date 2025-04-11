import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SectionList,
  TextInput,
} from "react-native";
import { collection, getDocs, query, where, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Picker } from "@react-native-picker/picker";

const BuyCouponsScreen = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All"); // Filter state: "All", "Today", "Week", "Month", "Remaining", "Expired"

  const fetchCoupons = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("🚫 Error", "Please log in to view coupons.");
        return;
      }

      const q = query(
        collection(db, "coupons"),
        where("userId", "!=", user.uid),
        where("type", "==", "sell")
      );

      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const sorted = fetched.sort(
        (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
      );

      setCoupons(sorted);
    } catch (error) {
      console.error("Error fetching coupons:", error.message);
      Alert.alert("⚠️ Error", "Something went wrong while fetching coupons.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleBuyCoupon = useCallback(async (coupon) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("🚫 Error", "You must be logged in to buy coupons.");
        return;
      }

      const data = {
        couponId: coupon.id,
        couponName: coupon.name,
        couponValue: coupon.value,
        buyerId: user.uid,
        buyerEmail: user.email,
        sellerId: coupon.userId,
        sellerEmail: coupon.userEmail,
        type: "buy",
        createdAt: new Date(),
      };

      await addDoc(collection(db, "transactions"), data);

      Alert.alert(
        "✅ Success",
        `You bought 🎟️ ${coupon.name} for ₹${coupon.value}`
      );
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
    } catch (error) {
      console.error("Error buying coupon:", error.message);
      Alert.alert("❌ Error", "Could not complete purchase.");
    }
  }, []);

  const categorizeCoupons = useCallback(() => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    let filteredCoupons = coupons;

    // Apply search filter
    if (searchQuery) {
      filteredCoupons = filteredCoupons.filter((coupon) =>
        coupon.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    const sections = [
      {
        title: "Expiring Today",
        data: filteredCoupons.filter((coupon) => {
          if (!coupon.expiryDate) return false;
          const expiry = new Date(coupon.expiryDate);
          return expiry.toDateString() === today.toDateString();
        }),
      },
      {
        title: "Expiring Within a Week",
        data: filteredCoupons.filter((coupon) => {
          if (!coupon.expiryDate) return false;
          const expiry = new Date(coupon.expiryDate);
          return expiry > today && expiry <= oneWeek;
        }),
      },
      {
        title: "Expiring Within a Month",
        data: filteredCoupons.filter((coupon) => {
          if (!coupon.expiryDate) return false;
          const expiry = new Date(coupon.expiryDate);
          return expiry > oneWeek && expiry <= oneMonth;
        }),
      },
      {
        title: "Remaining Coupons",
        data: filteredCoupons.filter((coupon) => {
          if (!coupon.expiryDate) return false;
          const expiry = new Date(coupon.expiryDate);
          return expiry > oneMonth;
        }),
      },
      {
        title: "Expired Coupons",
        data: filteredCoupons.filter((coupon) => {
          if (!coupon.expiryDate) return false;
          const expiry = new Date(coupon.expiryDate);
          return expiry < today;
        }),
      },
    ];

    // If filter is not "All", return only the selected section
    if (filter !== "All") {
      const filteredSection = sections.find(
        (section) => section.title === filter
      );
      return filteredSection ? [filteredSection] : [];
    }

    // Filter out empty sections for "All" view
    return sections.filter((section) => section.data.length > 0);
  }, [coupons, searchQuery, filter]);

  const renderCouponItem = useCallback(
    ({ item }) => {
      const isExpiringSoon =
        item.expiryDate &&
        new Date(item.expiryDate) - new Date() < 7 * 24 * 60 * 60 * 1000;

      return (
        <View style={[styles.card, isExpiringSoon && styles.expiringCard]}>
          <View style={styles.cardLeft}>
            <Text style={styles.cardTitle}>🎟️ {item.name || "Unnamed"}</Text>
            <Text style={styles.cardDetail}>💰 ₹{item.value ?? "N/A"}</Text>
            <Text style={styles.cardDetail}>
              📝 {item.details || "No details"}
            </Text>
            <Text style={styles.cardDetail}>
              ⏳{" "}
              {item.expiryDate
                ? new Date(item.expiryDate).toLocaleDateString()
                : "N/A"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => handleBuyCoupon(item)}
            disabled={!item.name || !item.value}
          >
            <Text style={styles.buyText}>Buy</Text>
          </TouchableOpacity>
        </View>
      );
    },
    [handleBuyCoupon]
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const onRefresh = useCallback(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading coupons... 🎟️</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Buy Coupons</Text>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by coupon name..."
          placeholderTextColor="#aaa"
        />
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filter}
            onValueChange={(itemValue) => setFilter(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="All" value="All" />
            <Picker.Item label="Expiring Today" value="Expiring Today" />
            <Picker.Item
              label="Expiring Within a Week"
              value="Expiring Within a Week"
            />
            <Picker.Item
              label="Expiring Within a Month"
              value="Expiring Within a Month"
            />
            <Picker.Item label="Remaining Coupons" value="Remaining Coupons" />
            <Picker.Item label="Expired Coupons" value="Expired Coupons" />
          </Picker>
        </View>
      </View>

      <SectionList
        sections={categorizeCoupons()}
        renderItem={renderCouponItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyState}>
            😕 No coupons available right now. Check back later!
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    padding: 16,
    backgroundColor: "#6a5acd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#6B7280",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  expiringCard: {
    borderColor: "#F87171",
    borderWidth: 1.5,
    backgroundColor: "#FFF1F2",
  },
  cardLeft: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardDetail: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 2,
  },
  buyButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buyText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    textAlign: "center",
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 40,
  },
  sectionHeader: {
    backgroundColor: "#E5E7EB",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
    color: "#111827",
    marginBottom: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
  },
});

export default BuyCouponsScreen;
