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
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  doc,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { Picker } from "@react-native-picker/picker";

const BuyCouponsScreen = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");

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

      await runTransaction(db, async (transaction) => {
        const couponRef = doc(db, "coupons", coupon.id);
        const couponDoc = await transaction.get(couponRef);

        if (!couponDoc.exists()) {
          throw new Error("Coupon no longer exists.");
        }

        const couponData = couponDoc.data();
        if (
          couponData.expiryDate &&
          new Date(couponData.expiryDate) <= new Date()
        ) {
          throw new Error("This coupon has expired.");
        }

        const data = {
          couponId: coupon.id,
          couponName: couponData.name,
          couponValue: couponData.value,
          buyerId: user.uid,
          buyerEmail: user.email,
          sellerId: couponData.userId,
          sellerEmail: couponData.userEmail,
          type: "buy",
          createdAt: new Date(),
        };

        // Use deterministic transaction ID: buyerId_couponId
        const transactionRef = doc(
          db,
          "transactions",
          `${user.uid}_${coupon.id}`
        );
        transaction.set(transactionRef, data);
        transaction.delete(couponRef);
      });

      Alert.alert(
        "✅ Success",
        `You bought 🎟️ ${coupon.name} for ₹${coupon.value}`
      );
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
    } catch (error) {
      console.error("Error buying coupon:", error.message);
      Alert.alert("❌ Error", error.message || "Could not complete purchase.");
    }
  }, []);

  const categorizeCoupons = useCallback(() => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const oneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    let filteredCoupons = coupons;

    if (searchQuery) {
      filteredCoupons = filteredCoupons.filter((coupon) =>
        coupon.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

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

    if (filter !== "All") {
      const filteredSection = sections.find(
        (section) => section.title === filter
      );
      return filteredSection ? [filteredSection] : [];
    }

    return sections.filter((section) => section.data.length > 0);
  }, [coupons, searchQuery, filter]);

  const renderCouponItem = useCallback(
    ({ item }) => {
      const isExpiringSoon =
        item.expiryDate &&
        new Date(item.expiryDate) - new Date() < 7 * 24 * 60 * 60 * 1000 &&
        new Date(item.expiryDate) > new Date();
      const isExpired =
        item.expiryDate && new Date(item.expiryDate) <= new Date();

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
            {isExpired && (
              <Text style={styles.expiredText}>⚠️ This coupon has expired</Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.buyButton, isExpired && styles.disabledButton]}
            onPress={() => !isExpired && handleBuyCoupon(item)}
            disabled={isExpired || !item.name || !item.value}
          >
            <Text style={styles.buyText}>{isExpired ? "Expired" : "Buy"}</Text>
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
    backgroundColor: "#4F46E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  headerText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: "System",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontFamily: "System",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expiringCard: {
    borderColor: "#F87171",
    borderWidth: 2,
    backgroundColor: "#FFF5F5",
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
    fontFamily: "System",
  },
  cardDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    fontFamily: "System",
  },
  expiredText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    marginTop: 6,
    fontFamily: "System",
  },
  buyButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  buyText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "System",
  },
  emptyState: {
    textAlign: "center",
    fontSize: 16,
    color: "#6B7280",
    marginTop: 48,
    fontFamily: "System",
  },
  sectionHeader: {
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "System",
  },
  filterContainer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    fontSize: 16,
    color: "#1F2937",
    marginBottom: 12,
    fontFamily: "System",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  picker: {
    height: 48,
    fontFamily: "System",
  },
});

export default BuyCouponsScreen;
