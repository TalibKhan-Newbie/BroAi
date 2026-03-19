// Report.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

// === CONFIGURATION ===
const API_URL = 'api/submit_report.php'; // <-- USE THE SAME API YOU USE FOR SAVE_CHAT

// Helper: Generate random 3-digit number (100–999) – only for demo users
const getFallbackUserId = () => {
  return Math.floor(Math.random() * 900) + 100;
};

const Report = () => {
  const route = useRoute();
  const navigation = useNavigation();

  // --------------------------------------------------------------
  // 1. READ PARAMS – reportId is now the primary identifier
  // --------------------------------------------------------------
  const {
    item,
    userId: passedUserId,
    reportId: passedReportId,   // <-- NEW
    taskId: passedTaskId,      // keep old name for backward compatibility
  } = route.params || {};
 console.log('=== REPORT PARAMS ===');
  console.log('item:', item);
  console.log('passedReportId:', passedReportId);
  console.log('passedTaskId:', passedTaskId);
  console.log('item.reportId:', item?.reportId);
  console.log('item.taskUUID:', item?.taskUUID);
  console.log('=====================');
  // Use passed userId, otherwise a random demo id
  const userId = passedUserId ?? getFallbackUserId();

  // Use reportId if it exists, otherwise fall back to taskId
  const reportId = passedReportId ?? passedTaskId ?? null;

  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // --------------------------------------------------------------
  // 2. GUARD – no item to report
  // --------------------------------------------------------------
  if (!item) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>No item to report</Text>
        </View>
      </View>
    );
  }

  const isImage = item.content?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const contentType = isImage ? 'image' : 'text';

  // --------------------------------------------------------------
  // 3. SUBMIT HANDLER – send report_id (not task_id)
  // --------------------------------------------------------------
 const handleSubmit = async () => {
    if (!reason.trim() || !category) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!reportId) {
      Alert.alert('Error', 'Missing report identifier. Cannot submit.');
      return;
    }

    setLoading(true);

    const payload = {
      action: 'submit_report',          // PHP script का action
      user_id: userId,
      report_id: reportId,              // ✅ taskUUID या reportId
      reason: category,                 // Picker value
      details: reason.trim(),           // Textarea value
    };

    console.log('Sending payload:', payload); // Debug

    try {
      const response = await axios.post(API_URL, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      console.log('Response:', response.data); // Debug

      if (response.data.success) {
        setSubmitted(true);
        Alert.alert('Success', 'Report submitted successfully!');

        setTimeout(() => {
          setReason('');
          setCategory('');
          setSubmitted(false);
          navigation.goBack();
        }, 2000);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('Report submission error:', error);
      const message =
        error.response?.data?.message ||
        error.message ||
        'Network error. Please try again.';
      Alert.alert('Submission Failed', message);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------
  // 4. RENDER (unchanged except for a tiny debug line)
  // --------------------------------------------------------------
  return (
    <ScrollView style={styles.container}>
      <SafeAreaView style={styles.containers}>

        {/* Debug – you can delete this line later */}
        {/* <Text style={{ margin: 16, color: '#666' }}>reportId: {reportId ?? '—'}</Text> */}

        {/* Content Preview Card */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>CONTENT PREVIEW</Text>

          {isImage ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.content }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <Text style={styles.imageText}>Image: {item.content}</Text>
            </View>
          ) : (
            <View style={styles.textContainer}>
              <Text style={styles.previewText} numberOfLines={8}>
                {item.content}
              </Text>
            </View>
          )}

          {item.type && (
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>Type: {item.type}</Text>
            </View>
          )}
        </View>

        {/* Report Form */}
        <View style={styles.formContainer}>
          {/* Category Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Report Category <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select a category..." value="" />
                <Picker.Item label="Malware/Malicious Code" value="malware" />
                <Picker.Item label="AI-Generated Harmful Content" value="ai_generated" />
                <Picker.Item label="Explicit/NSFW" value="explicit" />
                <Picker.Item label="Harassment/Abuse" value="harassment" />
                <Picker.Item label="Spam" value="spam" />
                <Picker.Item label="Misinformation" value="misinformation" />
                <Picker.Item label="Copyright Violation" value="copyright" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
          </View>

          {/* Reason Text Area */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Detailed Reason <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textarea}
              placeholder="Explain why you're reporting this content..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              value={reason}
              onChangeText={(text) => setReason(text.slice(0, 500))}
              textAlignVertical="top"
            />
            <Text style={styles.charCounter}>{reason.length}/500</Text>
          </View>

          {/* Confirmation */}
          <View style={styles.checkboxContainer}>
            <Text style={styles.checkboxText}>
              I confirm this information is accurate and will be reviewed by our moderation team.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!reason || !category || loading || submitted) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!reason || !category || loading || submitted}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {submitted ? 'Report Submitted' : 'Submit Report'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Success Message */}
        {submitted && (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Report Submitted Successfully</Text>
            <Text style={styles.successMessage}>
              Thank you! Our team will review this content shortly.
            </Text>
          </View>
        )}
      </SafeAreaView>
    </ScrollView>
  );
};

// === STYLES (unchanged) ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  containers: { flex: 1, backgroundColor: '#f9fafb' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
  previewCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  previewLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 12, letterSpacing: 0.5 },
  imageContainer: { marginBottom: 12 },
  previewImage: { width: '100%', height: 250, borderRadius: 8, marginBottom: 8, backgroundColor: '#f3f4f6' },
  imageText: { fontSize: 13, color: '#6b7280' },
  textContainer: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  previewText: { fontSize: 12, color: '#374151', lineHeight: 18, fontFamily: 'Courier New' },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  typeBadgeText: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  formContainer: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 8 },
  required: { color: '#dc2626' },
  pickerContainer: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' },
  picker: { height: 50, width: '100%' },
  textarea: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 14, color: '#1f2937', height: 120, backgroundColor: '#fff' },
  charCounter: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  checkboxContainer: { marginBottom: 20, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#f0fdf4', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#22c55e' },
  checkboxText: { fontSize: 13, color: '#166534', lineHeight: 18 },
  submitButton: { backgroundColor: '#dc2626', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { backgroundColor: '#9ca3af' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  successContainer: { margin: 16, padding: 16, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#86efac' },
  successTitle: { fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 4 },
  successMessage: { fontSize: 13, color: '#22863a' },
});

export default Report;