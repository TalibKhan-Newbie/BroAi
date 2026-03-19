import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Dimensions,
  Modal,
  Animated,
  Linking,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

const TokenWalletModal = ({ visible, onClose, navigation }) => {
  /* ────────────────────── STATE ────────────────────── */
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [tokens, setTokens] = useState(0);
  const [isAccountIdExpanded, setIsAccountIdExpanded] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [isJoining, setIsJoining] = useState(false);
  const [telegramJoined, setTelegramJoined] = useState(false);
  const [dataControlEnabled, setDataControlEnabled] = useState(false);

  const predefinedAmounts = [15, 50, 100, 200, 350, 500];

  /* ────────────────────── USE-EFFECTS ────────────────────── */
  useEffect(() => {
    const checkTelegramStatus = async () => {
      const joined = await AsyncStorage.getItem('telegram_joined');
      if (joined === 'true') setTelegramJoined(true);
    };
    checkTelegramStatus();
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setRefreshing(false);
      setCustomAmount('');
      setIsAccountIdExpanded(false);
      setIsJoining(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      AsyncStorage.getItem('userData').then(userData => {
        if (!userData) {
          Alert.alert('Login Required', 'Please login to access your wallet');
          handleClose();
        } else {
          fetchUserData();
        }
      });
    } else {
      fadeAnim.setValue(0);
      setLoading(false);
      setRefreshing(false);
    }
  }, [visible]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      
      const storedUserData = await AsyncStorage.getItem('userData');
      
      if (!storedUserData) {
        Alert.alert('Error', 'Please login to view your wallet');
        handleClose();
        return;
      }
      
      const { uid } = JSON.parse(storedUserData);
      
      if (!uid) {
        Alert.alert('Error', 'Invalid user session. Please login again.');
        handleClose();
        return;
      }
      
      const { data } = await axios.post(
        'api/getUserData.php',
        { user_id: uid },
        { timeout: 10000 }
      );
      
      if (data.success) {
        const apiUser = data.user;
        setUserData(apiUser);
        setTokens(parseFloat(apiUser.tokens) || 0);
        
        await AsyncStorage.setItem('userData', JSON.stringify(apiUser));
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch user data');
      }
    } catch (e) {
      console.error('Fetch user data error:', e);
      Alert.alert('Error', 'Failed to load wallet data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ────────────────────── TELEGRAM JOIN ────────────────────── */
  const handleJoinTelegram = async () => {
    setIsJoining(true);
    
    try {
      const canOpen = await Linking.canOpenURL('https://t.me/');
      
      if (!canOpen) {
        Alert.alert(
          'Cannot Open Link',
          'Please install Telegram or open this link manually: https://t.me/'
        );
        setIsJoining(false);
        return;
      }
      
      await Linking.openURL('https://t.me/');
      
      setTimeout(async () => {
        try {
          const stored = await AsyncStorage.getItem('userData');
          
          if (!stored) {
            Alert.alert('Error', 'User session not found');
            setIsJoining(false);
            return;
          }
          
          const { uid } = JSON.parse(stored);
          
          if (!uid) {
            Alert.alert('Error', 'Invalid user ID');
            setIsJoining(false);
            return;
          }
          
          const { data } = await axios.post(
            'api/adstoken.php',
            { user_id: uid, tokens: 1000 },
            { timeout: 10000 }
          );
          
          if (data.success) {
            await AsyncStorage.setItem('telegram_joined', 'true');
            setTelegramJoined(true);
            Alert.alert('Success', '1,000 tokens added! Thank you for joining! 🎉');
            fetchUserData();
          } else {
            Alert.alert('Error', data.message || 'Failed to add tokens');
          }
        } catch (e) {
          console.error('Telegram reward error:', e);
          Alert.alert('Error', 'Failed to add tokens. Please contact support.');
        } finally {
          setIsJoining(false);
        }
      }, 20000);
      
    } catch (e) {
      console.error('Telegram link error:', e);
      Alert.alert(
        'Error',
        'Failed to open Telegram. Please open manually: https://t.me/'
      );
      setIsJoining(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  /* ────────────────────── DEPOSIT HANDLERS ────────────────────── */
  const handleDeposit = (amount) => {
    Alert.alert(
      'Deposit Confirmation',
      `You are about to deposit ₹${amount} (${amount * 50} tokens)`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => console.log('Deposit:', amount) }]
    );
  };

  const handleCustomDeposit = () => {
    const amount = parseFloat(customAmount);
    if (amount < 15 || amount > 500) {
      Alert.alert('Invalid Amount', 'Amount must be between ₹15 and ₹500');
      return;
    }
    handleDeposit(amount);
    setCustomAmount('');
  };

  const handleClose = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(onClose);
  };

  /* ────────────────────── OPEN LINK ────────────────────── */
  const openLink = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot open link', `No app can handle ${url}`);
    }
  };

  /* ────────────────────── RENDER CONTENT ────────────────────── */
  const renderContent = () => {
    if (loading && !userData) {
      return (
        <Animated.View style={[styles.centerContainer, { opacity: fadeAnim }]}>
          <ActivityIndicator size="large" color="#FF9F0A" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={handleClose}>
                <Image source={require('./assets/x.png')} style={[styles.iconSmall, { tintColor: '#000' }]} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Wallet</Text>
              <View style={styles.headerRight}>
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                  <Image source={require('./assets/refresh.png')} style={[styles.iconSmall, { tintColor: '#000' }]} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.profileHeader}>
                {userData?.photoURL ? (
                  <Image 
                    source={{ uri: userData.photoURL }} 
                    style={styles.profileImage}
                    defaultSource={require('./assets/logo.png')}
                  />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <Text style={styles.profileInitial}>
                      {userData?.displayName?.charAt(0).toUpperCase() || 
                       userData?.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {userData?.displayName || userData?.email?.split('@')[0] || 'User'}
                  </Text>
                  <Text style={styles.profileId}>
                    {userData?.email || 'No email'}
                  </Text>
                </View>
              </View>
              <View style={styles.tokenSection}>
                <View style={styles.tokenDisplay}>
                  <Image source={require('./assets/toll.png')} style={[styles.iconMedium, { tintColor: '#FF9F0A' }]} />
                  <Text style={styles.balanceAmount}>{tokens.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Telegram Section */}
            <View style={styles.telegramSection}>
              <Text style={styles.sectionTitle}>Join Telegram Community</Text>
              <TouchableOpacity
                style={[styles.telegramButton, (isJoining || telegramJoined) && styles.disabledButton]}
                onPress={handleJoinTelegram}
                disabled={isJoining || telegramJoined}
              >
                <View style={styles.telegramButtonContent}>
                  <Image
                    source={require('./assets/send.png')}
                    style={[styles.iconMedium, { tintColor: telegramJoined ? '#8E8E93' : '#0088cc' }]}
                  />
                  <View style={styles.telegramButtonText}>
                    <Text style={[styles.telegramButtonTitle, telegramJoined && { color: '#8E8E93' }]}>
                      {telegramJoined ? 'Already Joined' : 'Join @telegramurl'}
                    </Text>
                    <Text style={[styles.telegramButtonSubtitle, telegramJoined && { color: '#8E8E93' }]}>
                      {telegramJoined ? 'Thank you for joining!' : 'Get 1000 Tokens '}
                    </Text>
                  </View>
                  {isJoining && <ActivityIndicator size="small" color="#0088cc" style={styles.telegramLoading} />}
                </View>
              </TouchableOpacity>
            </View>

            {/* About Section */}
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>About</Text>

              {/* Data Control Switch */}
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Data Control</Text>
                <Switch
                  trackColor={{ false: '#767577', true: '#FF9F0A' }}
                  thumbColor={dataControlEnabled ? '#FFFFFF' : '#f4f3f4'}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={setDataControlEnabled}
                  value={dataControlEnabled}
                />
              </View>

              {/* Links */}
              <TouchableOpacity
                style={styles.aboutLinkRow}
                onPress={() => openLink('terms.php')}
              >
                <Text style={styles.aboutLinkText}>Terms & Conditions</Text>
                <Image source={require('./assets/chevron-right.png')} style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aboutLinkRow}
                onPress={() => openLink('privacypolicy.php')}
              >
                <Text style={styles.aboutLinkText}>Privacy Policy</Text>
                <Image source={require('./assets/chevron-right.png')} style={styles.chevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.aboutLinkRow}
                onPress={() => navigation.navigate('Licence')}
              >
                <Text style={styles.aboutLinkText}>License</Text>
                <Image source={require('./assets/chevron-right.png')} style={styles.chevron} />
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>{renderContent()}</View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
    opacity: 0.5,
  },
  telegramLoading: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -8,
  },
  modalContainer: {
    width: isDesktop ? 768 : '95%',
    height: isDesktop ? '90%' : '95%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  centerContainer: {
    width: isDesktop ? 768 : '95%',
    height: isDesktop ? '90%' : '95%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9F0A',
  },
  iconSmall: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  iconMedium: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
  },
  refreshButton: {
    padding: 8,
  },
  balanceCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF9F0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  profileId: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tokenSection: {
    alignItems: 'center',
  },
  tokenDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  telegramSection: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  telegramButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0088cc',
    padding: 16,
  },
  telegramButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  telegramButtonText: {
    flex: 1,
    marginLeft: 12,
  },
  telegramButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  telegramButtonSubtitle: {
    fontSize: 12,
    color: '#0088cc',
  },
  aboutSection: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  aboutLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  aboutLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  aboutLinkText: {
    fontSize: 16,
    color: '#007AFF',
  },
  chevron: {
    width: 16,
    height: 16,
    tintColor: '#8E8E93',
  },
});

export default TokenWalletModal;