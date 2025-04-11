import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Picker } from "@react-native-picker/picker";

const SellCouponsScreen = () => {
  const [couponName, setCouponName] = useState("");
  const [couponValue, setCouponValue] = useState("");
  const [couponDetails, setCouponDetails] = useState("");
  const [category, setCategory] = useState("");
  const [expiryDate, setExpiryDate] = useState(""); // Changed to string for DD-MM-YYYY input
  const [coupons, setCoupons] = useState([]); // Kept for potential future use, but not displayed here

  const couponNameRef = useRef(null);
  const couponValueRef = useRef(null);
  const couponDetailsRef = useRef(null);

  const categories = [
    "🍕 Food",
    "👗 Clothes",
    "✈️ Travel",
    "💻 Electronics",
    "🎮 Online Gaming",
    "💄 Beauty",
    "🧘 Health & Wellness",
    "📦 Others",
  ];

  useEffect(() => {
    getCoupons();
  }, []);

  const getCoupons = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "coupons"));
      const couponsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCoupons(couponsList.filter((coupon) => coupon.type === "sell"));
    } catch (error) {
      console.error("Error fetching coupons:", error.message);
      Alert.alert(
        "❌ Error",
        "Failed to fetch coupons. Please try again later."
      );
    }
  };

  const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split("-").map(Number);
    if (
      !day ||
      !month ||
      !year ||
      day < 1 ||
      day > 31 ||
      month < 1 ||
      month > 12 ||
      year < 2025 ||
      year > 2100
    ) {
      return null;
    }
    const date = new Date(year, month - 1, day, 23, 59, 59); // Set to 23:59:59
    return date > new Date() ? date : null; // Ensure future date
  };

  const handleAddCoupon = async () => {
    if (
      !couponName ||
      !couponValue ||
      !couponDetails ||
      !category ||
      !expiryDate
    ) {
      Alert.alert("⚠️ Incomplete", "Please fill in all fields");
      return;
    }

    const parsedDate = parseDate(expiryDate);
    if (!parsedDate) {
      Alert.alert(
        "⚠️ Invalid Date",
        "Please enter a valid future date in DD-MM-YYYY format (e.g., 11-04-2025)"
      );
      return;
    }

    try {
      const user = auth.currentUser;
      const expiryDateISO = parsedDate.toISOString();
      await addDoc(collection(db, "coupons"), {
        name: couponName,
        value: parseFloat(couponValue),
        details: couponDetails,
        expiryDate: expiryDateISO,
        category,
        type: "sell",
        userId: user.uid,
        userEmail: user.email,
        createdAt: new Date(),
      });
      setCoupons([
        ...coupons,
        {
          id: Math.random().toString(),
          name: couponName,
          value: couponValue,
          details: couponDetails,
          expiryDate: expiryDateISO,
          category,
        },
      ]);
      setCouponName("");
      setCouponValue("");
      setCouponDetails("");
      setCategory("");
      setExpiryDate("");
      Alert.alert("✅ Success", "Coupon listed for sale!");
      if (couponNameRef.current) couponNameRef.current.focus();
    } catch (error) {
      console.error("Error adding coupon:", error.message);
      Alert.alert(
        "❌ Error",
        "Failed to add coupon. Check permissions or try again."
      );
    }
  };

  const renderForm = () => (
    <KeyboardAvoidingView
      style={styles.formContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <Text style={styles.label}>📝 Title</Text>
      <TextInput
        ref={couponNameRef}
        style={styles.input}
        placeholder="Enter the name of the brand"
        value={couponName}
        onChangeText={setCouponName}
        returnKeyType="next"
        onSubmitEditing={() => couponValueRef.current?.focus()}
        blurOnSubmit={false}
        autoFocus={true}
      />

      <Text style={styles.label}>📂 Category</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={category}
          onValueChange={setCategory}
          style={styles.picker}
        >
          <Picker.Item label="Select a category" value="" enabled={false} />
          {categories.map((cat, index) => (
            <Picker.Item key={index} label={cat} value={cat} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>💰 Price (₹)</Text>
      <TextInput
        ref={couponValueRef}
        style={styles.input}
        placeholder="Enter price at which you want to sell"
        value={couponValue}
        onChangeText={setCouponValue}
        keyboardType="numeric"
        returnKeyType="next"
        onSubmitEditing={() => couponDetailsRef.current?.focus()}
        blurOnSubmit={false}
      />

      <Text style={styles.label}>📅 Expiry Date</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter expiry date (DD-MM-YYYY)"
        value={expiryDate}
        onChangeText={setExpiryDate}
        keyboardType="numeric"
        maxLength={10} // DD-MM-YYYY format
        returnKeyType="next"
        onSubmitEditing={() => couponDetailsRef.current?.focus()}
        blurOnSubmit={false}
      />

      <Text style={styles.label}>📝 Description</Text>
      <TextInput
        ref={couponDetailsRef}
        style={[styles.input, styles.multilineInput]}
        placeholder="Enter coupon details like percentage off, terms, etc."
        value={couponDetails}
        onChangeText={setCouponDetails}
        multiline
        numberOfLines={4}
        returnKeyType="done"
        onSubmitEditing={handleAddCoupon}
        blurOnSubmit={false}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleAddCoupon}>
        <Text style={styles.buttonText}>📤 Submit</Text>
      </TouchableOpacity>

      <View style={styles.divider} />
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Sell Coupons</Text>
      </View>
      <View style={styles.content}>{renderForm()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
    flex: 1,
  },
  formContainer: {
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
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
    color: "#111827",
    marginBottom: 15,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: "top",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  picker: {
    height: 50,
  },
  submitButton: {
    backgroundColor: "#32cd32",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 20,
  },
});

export default SellCouponsScreen;
