import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Image,
  RefreshControl,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import SyntaxHighlighter from 'react-syntax-highlighter';
import Tts from 'react-native-tts'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { RewardedInterstitialAd, TestIds, RewardedAdEventType } from 'react-native-google-mobile-ads';

import MiniLoader from './miniloader';
import TokenWalletModal from './MemberShip';
const adUnitId = __DEV__
  ? TestIds.REWARDED_INTERSTITIAL
  : 'ca-app-pub-9636036667573295/9336381576';

const rewardedInterstitial = RewardedInterstitialAd.createForAdRequest(adUnitId, {
  keywords: [
    'fashion','clothing','AI fashion','smart clothing','tech wear','AI style',
    'digital fashion','fashion technology','wearable tech','AI outfit generator',
    'virtual try-on','AI trends','smart fabrics','AI fashion design',
    'tech fashion brands',
  ],
});
const boosterAdUnitId = __DEV__
  ? TestIds.REWARDED_INTERSTITIAL
  : 'ca-app-pub-9636036667573295/XXXXX'; // ⬅️ Replace with your BOOSTER ad unit

const boosterRewardedAd = RewardedInterstitialAd.createForAdRequest(boosterAdUnitId, {
  keywords: [
    'productivity', 'AI tools', 'tech', 'software', 'apps',
    'booster', 'premium features', 'upgrades'
  ],
});
const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const Home = ({ navigation }) => {
  const [chats, setChats] = useState({});
    const [tokens, setTokens] = useState(0);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [adLoaded, setAdLoaded] = useState(false);
  const [showingAd, setShowingAd] = useState(false); // ← ADD THIS
  const [adLoadingInitially, setAdLoadingInitially] = useState(true); // ← ADD THIS
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userTokens, setUserTokens] = useState(0);
  const [showTokenAlert, setShowTokenAlert] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [typingMessage, setTypingMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');
  const [isWalletVisible, setIsWalletVisible] = useState(false);
  const [hasInitializedChat, setHasInitializedChat] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-nano');
  const [isBoosterLoading, setIsBoosterLoading] = useState(false);
  const [boosterUsageCount, setBoosterUsageCount] = useState(0);
  const [lastBoosterResetDate, setLastBoosterResetDate] = useState(null);
  const [isBoosterAdLoading, setIsBoosterAdLoading] = useState(false); // ✅ NEW
const [boosterAdLoaded, setBoosterAdLoaded] = useState(false); // ✅ NEW
const [showingBoosterAd, setShowingBoosterAd] = useState(false); // ✅ NEW
  const [isGenerating, setIsGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollViewRef = useRef(null);
  const textareaRef = useRef(null);
  const sidebarAnimatedValue = useRef(new Animated.Value(0)).current;
  const abortControllerRef = useRef(null);
  const [mainText, setMainText] = useState('');
  const [noTokenText, setNoTokenText] = useState('');
  const API_BASE = '/api/';
  const OPENAI_API_KEY = '';
  const GEMINI_API_KEY = '';

  const handleRefresh = async () => {
  setRefreshing(true);
  try {
    await loadChatsFromServer();
    if (user?.uid) {
      await getUserTokens();
    }
  } catch (error) {
    console.error('Error refreshing:', error);
  } finally {
    setRefreshing(false);
  }
};
  const models = {
    'gpt-4o-nano': { 
      id: 'gpt-4o-nano', 
      name: 'Modal name 1', 
      description: '',
      apiName: 'gpt-4.1'
    },
    'gpt-4o-mini': { 
      id: 'gpt-4o-mini', 
      name: 'Modal Name2', 
      description: '',
      apiName: 'gpt-4o'
    }
  };

// Define a pool of prompts
const promptPool = [
  "Write a Python function",
];

const fetchUserData = async () => {
  try {
    setLoading(true);
    setRefreshing(true);
    
    // ⬇️ CHANGED: Use 'userData' instead of 'user'
    const storedUserData = await AsyncStorage.getItem('userData');
    
    if (!storedUserData) {
      Alert.alert('Error', 'Please login to view your wallet');
      handleClose(); // Close modal if no user
      return;
    }
    
    const { uid } = JSON.parse(storedUserData);
    
    if (!uid) {
      Alert.alert('Error', 'Invalid user session. Please login again.');
      handleClose();
      return;
    }
    
    const { data } = await axios.post(
      '/api/getUserData.php',
      { user_id: uid },
      { timeout: 10000 } // Add timeout
    );
    
    if (data.success) {
      const apiUser = data.user;
      setUserData(apiUser);
      setUserTokens(parseFloat(apiUser.tokens) || 0);
      
      // Update cached userData
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
// State for dynamic quick prompts
const [quickPrompts, setQuickPrompts] = useState([]);

// Function to select random prompts
const getRandomPrompts = () => {
  const shuffled = [...promptPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4); // Select 4 random prompts
};
const mainTextOptions = [
  "I",
  "H",
  "G",
  "F",
  "E",
];


const noTokenTextOptions = [
  "A",
  "B",
  "C",
  "D",
  "E",
];
useEffect(() => {
  let isMounted = true;

  // ========== TOKEN AD LISTENERS ==========
  const unsubscribeTokenLoaded = rewardedInterstitial.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => {
      setAdLoaded(true);
      setAdLoadingInitially(false);
      setShowingAd(false);
    }
  );

  const unsubscribeTokenEarned = rewardedInterstitial.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    (reward) => handleRewardEarned(reward.amount || 10000)
  );

  // ========== ✅ NEW: BOOSTER AD LISTENERS ==========
  const unsubscribeBoosterLoaded = boosterRewardedAd.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => {
      console.log('🎯 Booster Ad Loaded');
      setBoosterAdLoaded(true);
      setIsBoosterAdLoading(false);
      setShowingBoosterAd(false);
    }
  );

  const unsubscribeBoosterEarned = boosterRewardedAd.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    (reward) => handleBoosterRewardEarned()
  );

  // Load both ads initially
  rewardedInterstitial.load();
  boosterRewardedAd.load();

  return () => {
    unsubscribeTokenLoaded();
    unsubscribeTokenEarned();
    unsubscribeBoosterLoaded(); // ✅ NEW
    unsubscribeBoosterEarned(); // ✅ NEW
  };
}, []);

const handleBoosterRewardEarned = async () => {
  try {
    console.log('🎉 Booster Reward Earned!');
    
    // 1. Reset ad states
    setBoosterAdLoaded(false);
    setIsBoosterAdLoading(true);
    setShowingBoosterAd(false);

    // 2. Reset booster count to 0 (giving 2 new boosters)
    const today = new Date().toDateString();
    setBoosterUsageCount(0);
    setLastBoosterResetDate(today);
    
    await AsyncStorage.setItem('boosterUsageCount', '0');
    await AsyncStorage.setItem('lastBoosterResetDate', today);

    // 3. Show success message
    Alert.alert(
      '🚀 Boosters Recharged!',
      'You got 2 new Booster uses! Use them wisely.',
      [{ text: 'Awesome!', style: 'default' }]
    );

    // 4. Reload ad for next time
    boosterRewardedAd.load();
    
  } catch (error) {
    console.error('Booster reward error:', error);
    Alert.alert('Error', 'Failed to process booster reward. Try again.');
    
    // Ensure ad reloads
    setBoosterAdLoaded(false);
    setIsBoosterAdLoading(true);
    setShowingBoosterAd(false);
    boosterRewardedAd.load();
  }
};
const showBoosterRewardAd = async () => {
  if (showingBoosterAd || isBoosterAdLoading) {
    console.log('⏳ Booster ad already loading/showing');
    return;
  }
  
  if (!boosterAdLoaded) {
    Alert.alert('Ad Not Ready', 'Loading booster ad, please wait...');
    setIsBoosterAdLoading(true);
    boosterRewardedAd.load();
    
    // Auto-retry after 8 seconds
    setTimeout(() => {
      if (!boosterAdLoaded) {
        setIsBoosterAdLoading(false);
        Alert.alert('Ad Not Available', 'Booster ad unavailable. Try again later.');
      }
    }, 8000);
    return;
  }

  try {
    setShowingBoosterAd(true);
    const showResult = await boosterRewardedAd.show();
    
    if (!showResult) {
      setShowingBoosterAd(false);
      setBoosterAdLoaded(false);
      Alert.alert('Ad Error', 'Booster ad not ready. Please try again.');
      boosterRewardedAd.load();
    }
  } catch (error) {
    console.error('Error showing booster ad:', error);
    setShowingBoosterAd(false);
    setBoosterAdLoaded(false);
    Alert.alert('Ad Error', 'Failed to show booster ad. Please try again.');
    boosterRewardedAd.load();
  }
};
const showRewardAd = async () => {
  if (showingAd || isAdLoading) return;
  
  if (!adLoaded) {
    Alert.alert('Ad Not Ready', 'Please wait while the ad loads...');
    setIsAdLoading(true);
    rewardedInterstitial.load();
    
    // Auto-retry after 8 seconds
    setTimeout(() => {
      if (!adLoaded) {
        setAdLoadingInitially(false);
        Alert.alert('Ad Not Available', 'Unable to load ad. Try again later.');
      }
    }, 8000);
    return;
  }

  try {
    setShowingAd(true);
    const showResult = await rewardedInterstitial.show();
    
    if (!showResult) {
      // If show() returns false, the ad wasn't ready
      setShowingAd(false);
      setAdLoaded(false);
      Alert.alert('Ad Error', 'Ad not ready. Please try again.');
      rewardedInterstitial.load();
    }
  } catch (error) {
    console.error('Error showing ad:', error);
    setShowingAd(false);
    setAdLoaded(false);
    Alert.alert('Ad Error', 'Failed to show ad. Please try again.');
    
    // Reload ad after error
    rewardedInterstitial.load();
  }
};
const handleRewardEarned = async (rewardAmount) => {
  try {
    // 1. Ad wapas ready hone ka status set karo (turant)
    setAdLoaded(false); 
    setAdLoadingInitially(true);
    setShowingAd(false);

    // 2. User Data Check (Fix: 'userData' use kar rahe hain)
    const stored = await AsyncStorage.getItem('userData');
    
    if (!stored) {
      Alert.alert('Error', 'User session not found');
      rewardedInterstitial.load(); // Reload ad for next time
      return;
    }
    
    const { uid } = JSON.parse(stored);
    
    if (!uid) {
      Alert.alert('Error', 'Invalid user ID');
      rewardedInterstitial.load(); // Reload ad for next time
      return;
    }

    // 3. Server call to add tokens
    const { data } = await axios.post(
      'adstoken.php',
      { user_id: uid, tokens: 10000 },
      { timeout: 10000 }
    );

if (data.success) {
  // ← YE DO LINES ADD KARO (optimistic update)
  setUserTokens(prev => prev + 10000);
  
  // Existing line – keep it (accurate data + storage sync ke liye)
  await fetchUserData();
  
  Alert.alert('Success', '10,000 tokens added to your wallet! 🎉');
}
    
    // 5. Load ad for next use
    rewardedInterstitial.load();
    
  } catch (e) {
    console.error('Reward error:', e);
    Alert.alert('Error', 'Failed to process reward. Please try again.');
    
    // Ensure ad loads again even if error occurs
    setAdLoaded(false);
    setAdLoadingInitially(true);
    setShowingAd(false);
    rewardedInterstitial.load();
  }
};

  // 8️⃣ ADD HELPER FUNCTIONS
  const isAdButtonDisabled = () => showingAd || isAdLoading;
  
const getAdButtonText = () => {
  if (showingAd) return 'Watching...';
  if (isAdLoading) return 'Loading...';
  if (!adLoaded) return 'Loading';
  return 'Get Tokens';
};
  useEffect(() => {
    // function to change text randomly every 3 seconds
    const changeTexts = () => {
      const randomMain = mainTextOptions[Math.floor(Math.random() * mainTextOptions.length)];
      const randomNoToken = noTokenTextOptions[Math.floor(Math.random() * noTokenTextOptions.length)];
      setMainText(randomMain);
      setNoTokenText(randomNoToken);
    };

    changeTexts(); // initial call
    const interval = setInterval(changeTexts, 2000); // change every 3 sec

    return () => clearInterval(interval);
  }, []);
// Update quick prompts on app reload
useEffect(() => {
  setQuickPrompts(getRandomPrompts());
}, []); // Empty dependency array ensures it runs on mount
  useEffect(() => {
    initializeApp();
    loadBoosterUsage();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chats, currentChatId, typingMessage]);

  useEffect(() => {
    if (user?.uid && !isInitialLoad) {
      getUserTokens();
      loadChatsFromServer().then(() => {
        if (!hasInitializedChat) {
          handleChatInitialization();
          setHasInitializedChat(true);
        }
      });
    }
  }, [user, isInitialLoad]);

useEffect(() => {
  Animated.timing(sidebarAnimatedValue, {
    toValue: sidebarOpen ? 1 : 0,
    duration: 300,        // ← 250 → 300 (thoda slow = premium feel)
    useNativeDriver: true, // ← TRUE KAR DE (performance boost)
  }).start();
}, [sidebarOpen]);

  const loadBoosterUsage = async () => {
    try {
      const storedCount = await AsyncStorage.getItem('boosterUsageCount');
      const storedDate = await AsyncStorage.getItem('lastBoosterResetDate');
      const today = new Date().toDateString();
      
      if (storedDate !== today) {
        // Reset daily counter
        setBoosterUsageCount(0);
        setLastBoosterResetDate(today);
        await AsyncStorage.setItem('boosterUsageCount', '0');
        await AsyncStorage.setItem('lastBoosterResetDate', today);
      } else {
        setBoosterUsageCount(parseInt(storedCount) || 0);
        setLastBoosterResetDate(storedDate);
      }
    } catch (error) {
      console.error('Error loading booster usage:', error);
    }
  };

  const updateBoosterUsage = async () => {
    const newCount = boosterUsageCount + 1;
    setBoosterUsageCount(newCount);
    await AsyncStorage.setItem('boosterUsageCount', newCount.toString());
  };

  const truncateTitle = (title, maxLength = 25) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

const MarkdownRenderer = ({ content }) => {
  const parts = content.split(/(```[\w]*\n[\s\S]*?```)/g);

  return (
    <View>
      {parts.map((part, idx) => {
        if (part.startsWith('```')) {
          const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
          const lang = (match?.[1] || 'text').toLowerCase();
          const code = match?.[2] || '';

          return (
            <View key={idx} style={{ marginVertical: 10, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1E1E1E' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#252525' }}>
                <Text selectable={true} style={{ color: '#888', fontSize: 13 }}>{lang}</Text>
                <Pressable onPress={() => Clipboard.setString(code)} style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                  <Image source={require('./assets/copy.png')} style={{ width: 16, height: 16, tintColor: '#fff' }} />
                  <Text selectable={true} style={{ color: '#0A84FF', fontSize: 13 }}>Copy</Text>
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={!isSelecting}>
                <SyntaxHighlighter
                  language={lang}
                  style={oneDark}
                  customStyle={{ padding: 16, margin: 0, backgroundColor: 'transparent' }}
                  fontSize={14}
                  lineProps={{ style: { wordBreak: 'break-all', whiteSpace: 'pre-wrap' } }}
                  wrapLines
                  scrollEnabled={false}
                  selectable={true} // ← ADD THIS
                >
                  {code.trim()}
                </SyntaxHighlighter>
              </ScrollView>
            </View>
          );
        }

        return <SimpleMarkdownText key={idx} text={part} />;
      })}
    </View>
  );
};

const SimpleMarkdownText = ({ text }) => {
  const tokens = [];
  let lastIndex = 0;
  const regex = /\*\*(.*?)\*\*|__(.*?)__|`(.*?)`|\[(.*?)\]\((.*?)\)|(https?:\/\/[^\s]+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) tokens.push({ type: 'bold', content: match[1] });
    else if (match[2] !== undefined) tokens.push({ type: 'bold', content: match[2] });
    else if (match[3] !== undefined) tokens.push({ type: 'code', content: match[3] });
    else if (match[4] && match[5]) tokens.push({ type: 'link', text: match[4], url: match[5] });
    else if (match[6]) tokens.push({ type: 'url', url: match[6] });

    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return (
    <Text 
      selectable={true} // ← ALREADY HAI, GOOD
      style={{ fontSize: 16, lineHeight: 24, color: '#000000' }}
    >
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'bold':
            return <Text key={i} selectable={true} style={{ fontWeight: 'bold', color: '#000000' }}>{token.content}</Text>;
          case 'code':
            return (
              <Text key={i} selectable={true} style={{
                backgroundColor: '#F0F0F0',
                paddingHorizontal: 6,
                paddingVertical: 3,
                borderRadius: 6,
                fontFamily: 'Courier',
                fontSize: 14,
                color: '#D40000'
              }}>
                {token.content}
              </Text>
            );
          case 'link':
            return (
              <Text key={i} selectable={true} style={{ color: '#0066CC', textDecorationLine: 'underline' }}
                    onPress={() => Linking.openURL(token.url)}>
                {token.text}
              </Text>
            );
          case 'url':
            return (
              <Text key={i} selectable={true} style={{ color: '#0066CC', textDecorationLine: 'underline' }}
                    onPress={() => Linking.openURL(token.url)}>
                {token.url}
              </Text>
            );
          default:
            return <Text key={i} selectable={true}>{token.content}</Text>;
        }
      })}
    </Text>
  );
};

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setIsGenerating(false);
    setIsTyping(false);
    setTypingMessage('');
  };

  const regenerateMessage = async (messageIndex) => {
    if (!currentChatId || !chats[currentChatId] || userTokens <= 0) return;
    
    const currentChat = chats[currentChatId];
    const messages = currentChat.messages.slice(0, messageIndex);
    const lastUserMessage = messages.slice().reverse().find(msg => msg.role === 'user');
    
    if (!lastUserMessage) return;

    // Remove the AI message that we're regenerating
    const updatedMessages = messages.filter((_, index) => index !== messageIndex);
    
    setChats(prev => ({
      ...prev,
      [currentChatId]: {
        ...prev[currentChatId],
        messages: updatedMessages
      }
    }));

    // Regenerate response
    await sendMessage(lastUserMessage.content, true);
  };

  const initializeApp = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadUser();
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsInitialLoad(false);
    }
  };

const loadUser = async () => {
  try {
    const storedUser = await AsyncStorage.getItem('userData'); // ⬅️ 'user' ki jagah 'userData' use karo
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      await getUserTokens();
    } else {
      // Check if coming from login (to prevent loop)
      const isFromLogin = await AsyncStorage.getItem('isFromLogin');
      if (!isFromLogin) {
        navigation.replace('Login');
      }
    }
  } catch (error) {
    console.error('Error loading user:', error);
    navigation.replace('Login');
  }
};

const getUserTokens = async () => {
  if (!user?.uid) return;
  
  try {
    const data = await safeJsonFetch(`${API_BASE}/chat_api.php?action=user_tokens&uid=${user.uid}`);
    
    if (data.success) {
      setUserTokens(data.tokens || 0); // ⬅️ Default 0 rakho
    } else {
      console.error('Error fetching tokens:', data.error);
      setUserTokens(0);
    }
  } catch (error) {
    console.error('Error fetching tokens:', error);
    setUserTokens(0);
  }
};


  const handleChatInitialization = async () => {
    const chatIds = Object.keys(chats);
    const sortedChats = Object.values(chats).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const mostRecentChat = sortedChats[0];
    
    if (mostRecentChat) {
      setCurrentChatId(mostRecentChat.id);
      await loadChatMessages(mostRecentChat.id);
    }
  };
const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // Handle scroll to show/hide scroll to bottom button
  const handleScroll = (event) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentOffset.y >= contentSize.height - layoutMeasurement.height - 50;
    setShowScrollToBottom(!isAtBottom);
  };

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (currentMessages.length > 0 || isTyping || isLoading) {
      scrollToBottom();
    }
  }, [currentMessages, isTyping, isLoading]);

  const generateChatTitle = (message) => {
    const words = message.split(' ').slice(0, 6).join(' ');
    return words.length > 50 ? words.substring(0, 50) + '...' : words || 'New Chat';
  };

const safeJsonFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} - ${url}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    
    if (!text || text.trim() === '') {
      console.error('Empty response from:', url);
      return { success: false, error: 'Empty response' };
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error('Fetch error:', error, 'URL:', url);
    return { success: false, error: error.message };
  }
};

// ============ LOAD CHATS ============
const loadChatsFromServer = async () => {
  if (!user?.uid) return;
  
  try {
    const data = await safeJsonFetch(`${API_BASE}/chat_api.php?action=chats&uid=${user.uid}`);
    
    if (data.success && data.chats) {
      setChats(prevChats => {
        const updatedChats = { ...prevChats };
        
        data.chats.forEach(chat => {
          if (updatedChats[chat.id]) {
            updatedChats[chat.id] = {
              ...updatedChats[chat.id],
              title: chat.title,
              updatedAt: chat.updated_at,
              messageCount: chat.message_count || 0
            };
          } else {
            updatedChats[chat.id] = {
              id: chat.id,
              title: chat.title,
              messages: [],
              createdAt: chat.created_at,
              updatedAt: chat.updated_at,
              messageCount: chat.message_count || 0
            };
          }
        });
        
        return updatedChats;
      });
    } else {
      console.error('Error loading chats:', data.error);
    }
  } catch (error) {
    console.error('Error loading chats:', error);
  }
};
useEffect(() => {
  // Check if voice module is available


  // Initialize TTS
  Tts.setDefaultLanguage('en-US');
  Tts.setDefaultRate(0.5);
  Tts.setDefaultPitch(1.0);
  
  Tts.addEventListener('tts-start', () => {
    console.log('🔊 TTS Started');
    setIsSpeaking(true);
  });
  
  Tts.addEventListener('tts-finish', () => {
    console.log('✅ TTS Finished');
    setIsSpeaking(false);
  });
  
  Tts.addEventListener('tts-cancel', () => {
    console.log('⏹️ TTS Cancelled');
    setIsSpeaking(false);
  });

 


}, []);



// Speak AI Response
const speakResponse = async (text) => {
  try {
    if (isSpeaking) {
      await Tts.stop();
      setIsSpeaking(false);
      return;
    }

    // Clean text for better speech
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (cleanText.length > 0) {
      console.log('🔊 Speaking text:', cleanText.substring(0, 50) + '...');
      await Tts.speak(cleanText, {
        iosVoiceId: 'com.apple.ttsbundle.Samantha-compact',
        rate: 0.5,
        pitch: 1.0,
      });
    }
  } catch (error) {
    console.error('TTS error:', error);
    setIsSpeaking(false);
    Alert.alert('TTS Error', 'Failed to speak text');
  }
};



const loadChatMessages = async (chatId) => {
  if (!user?.uid) return;
  
  try {
    const data = await safeJsonFetch(
      `${API_BASE}/chat_api.php?action=chat&chat_id=${chatId}&uid=${user.uid}`
    );
    
    if (data.success && data.messages) {
      setChats(prev => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
          messages: data.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
            tokens_used: msg.tokens_used,
            model: msg.model,
            isBooster: msg.is_booster || false,
            isReported: msg.isReported === 1 || msg.is_reported === 1 ? 1 : 0, // FIX: Check both fields
            reportId: msg.report_id
          }))
        }
      }));
    } else {
      console.error('Error loading messages:', data.error);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  }
};

 const createNewChat = async () => {
  if (!user?.uid) return;
  
  if (currentChatId && chats[currentChatId] && chats[currentChatId].messages.length === 0) {
    setSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
    return;
  }
  
  try {
    const data = await safeJsonFetch(`${API_BASE}/chat_api.php?action=create_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        title: 'New Chat',
        model: selectedModel
      })
    });
    
    if (data.success) {
      const newChat = {
        id: data.chat_id,
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0
      };
      
      setChats(prev => ({ [data.chat_id]: newChat, ...prev }));
      setCurrentChatId(data.chat_id);
      setSidebarOpen(false);
      
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      console.error('Error creating chat:', data.error);
    }
  } catch (error) {
    console.error('Error creating new chat:', error);
  }
};


  const openMembershipScreen = () => {
    setSidebarOpen(false);
    navigation.navigate('MemberShip');
  };

  const ImageOpenScreen = () => {
    setSidebarOpen(false);
    navigation.navigate('ImageScreen');
  };
  const AssignOpenScreen = () => {
    setSidebarOpen(false);
    navigation.navigate('Assignment');
  };
  const getBroAIResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('who are you') || lowerMessage.includes('what are you') || 
        lowerMessage.includes('your name') || lowerMessage.includes('about you') ||
        lowerMessage.includes('tell me about yourself')) {
      return "I'm **BroAI**, an advanced AI assistant developed by **Rotara Labs**.";
    }
    
    if (lowerMessage.includes('who made you') || lowerMessage.includes('who created you') ||
        lowerMessage.includes('developer') || lowerMessage.includes('creator')) {
      return "I was developed by **Rotara Labs**. Our team has worked hard to create an AI assistant that can help users with a wide variety of tasks while maintaining high standards of accuracy and helpfulness.";
    }
    
    if (lowerMessage.includes('company') || lowerMessage.includes('rotara labs') ||
        lowerMessage.includes('organization')) {
      return "I'm developed by **Rotara Labs**, a technology company focused on creating advanced AI solutions. Our team, is dedicated to building AI tools that are both powerful and accessible to users.";
    }
    
    return null;
  };

  const typeMessage = (message, callback) => {
    setIsTyping(true);
    setTypingMessage('');
    const words = message.split(/\s+/);
    let index = 0;
    
    const typeInterval = setInterval(() => {
      if (index < words.length && !abortControllerRef.current?.signal.aborted) {
        const wordsToAdd = Math.min(5 + Math.floor(Math.random() * 3), words.length - index);
        const newWords = words.slice(index, index + wordsToAdd).join(' ');
        setTypingMessage(prev => prev + (prev ? ' ' : '') + newWords);
        index += wordsToAdd;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setTypingMessage('');
        callback();
      }
    }, 150);
  };

const callAI = async (messages) => {
  try {
    const apiName = models[selectedModel].apiName;
    if (apiName.startsWith('gpt')) {
      return await callOpenAI(messages);
    } else {
      throw new Error('Unsupported model');
    }
  } catch (error) {
    console.error('AI API Error:', error);
    
    // Handle specific API errors
    if (error.message.includes('insufficient_quota') || error.message.includes('billing')) {
      throw new Error('API quota exceeded. Please contact support.');
    } else if (error.message.includes('rate_limit')) {
      throw new Error('Rate limit exceeded. Please wait a moment and try again.');
    } else if (error.message.includes('invalid_api_key')) {
      throw new Error('API configuration error. Please contact support.');
    } else {
      throw new Error('Failed to get AI response. Please try again.');
    }
  }
};

// Enhanced callOpenAI with better error handling
const callOpenAI = async (messages) => {
  abortControllerRef.current = new AbortController();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: models[selectedModel].apiName,
        messages: messages,
        max_tokens: Math.min(1000, Math.floor(userTokens * 0.8)), // Use 80% of available tokens max
        temperature: 0.7,
      }),
      signal: abortControllerRef.current.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        throw new Error('rate_limit');
      } else if (response.status === 401) {
        throw new Error('invalid_api_key');
      } else if (response.status === 402) {
        throw new Error('insufficient_quota');
      } else {
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
    }

    const data = await response.json();
    
    if (data.choices && data.choices[0]) {
      return {
        content: data.choices[0].message.content,
        tokens_used: data.usage?.total_tokens || 0,
      };
    } else {
      throw new Error('Invalid OpenAI response format');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Generation was stopped');
    }
    
    console.error('OpenAI API Error:', error);
    throw error;
  }
};

const callGeminiBooster = async (messages) => {
  if (boosterUsageCount >= 2) {
    throw new Error('Daily booster limit reached (2/2)');
  }

  abortControllerRef.current = new AbortController();
  
  try {
    if (!GEMINI_API_KEY) {
      throw new Error(' API key is not configured');
    }

    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: formattedMessages,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: Math.min(1000, Math.floor(userTokens * 0.8)),
          },
          tools: [{ googleSearch: {} }],
        }),
        signal: abortControllerRef.current.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      
      if (response.status === 429) {
        throw new Error('Booster rate limit exceeded. Please try again later.');
      } else if (response.status === 400) {
        throw new Error('Invalid booster request. Please try a different query.');
      } else if (response.status === 403) {
        throw new Error('Booster access denied. Please contact support.');
      } else {
        throw new Error(`Booster error: HTTP ${response.status}`);
      }
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content?.parts?.[0]?.text) {
      console.error('Invalid response:', data);
      
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Content was blocked by safety filters. Please try a different query.');
      } else if (data.candidates?.[0]?.finishReason === 'RECITATION') {
        throw new Error('Content contains recitation. Please try rephrasing your query.');
      } else {
        throw new Error('Booster returned an empty response. Please try again.');
      }
    }

    return {
      content: data.candidates[0].content.parts[0].text,
      tokens_used: data.usageMetadata?.totalTokenCount || 0,
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Booster generation was stopped');
    }
    
    console.error(' Booster Error:', error);
    throw error;
  }
};

  const requiresRealTimeInfo = (message) => {
    const lowerMessage = message.toLowerCase();
    const realTimeKeywords = [
      'today', 'current', 'latest', 'recent', 'now', 'currently',
      'news', 'weather', 'stock', 'price', 'update', 'what happened',
      'breaking', 'live', 'real-time', 'this week', 'this month',
      '2025', 'yesterday', 'tomorrow'
    ];
    const realTimePhrases = [
      'what is the weather',
      'current news',
      'latest news',
      'stock price',
      'what happened today',
      'recent developments',
      'current events',
      'breaking news',
      'live updates'
    ];
    
    return realTimeKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           realTimePhrases.some(phrase => lowerMessage.includes(phrase));
  };
const handleKeyDown = (e) => {
  const { key } = e.nativeEvent;

  if (key === 'Enter') {
    if (e.nativeEvent.shiftKey) {
      // Shift + Enter → send karo
      e.preventDefault();
      sendMessage();  // jo bhi tumhara send function hai
    } else {
      // Sirf Enter → new line, send mat karo
      e.preventDefault();
      // kuch mat karo, TextInput khud new line daal dega
    }
  }
};
  // Modified sendMessage function to handle booster suggestion
  const sendMessage = async (messageText = inputText, isRegeneration = false) => {
    if (!messageText.trim() || isLoading || !user?.uid) return;

    if (userTokens <= 0) {
      setShowTokenAlert(true);
      return;
    }

    setIsLoading(true);
    setIsGenerating(true);
    let chatId = currentChatId;

    if (!chatId) {
      try {
        
        const response = await fetch(`${API_BASE}/chat_api.php?action=create_chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            title: generateChatTitle(messageText),
            model: selectedModel
          })
        });

        const data = await response.json();

        if (data.success) {
          chatId = data.chat_id;
          const newChat = {
            id: chatId,
            title: generateChatTitle(messageText),
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: 0,
            responseCache: {}
          };

          setChats(prev => ({ [chatId]: newChat, ...prev }));
          setCurrentChatId(chatId);
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error('Error creating chat:', error);
        setIsLoading(false);
        setIsGenerating(false);
        return;
      }
    }

    if (!isRegeneration) {
      const userMessage = {
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString()
      };

      setChats(prev => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
          messages: [...(prev[chatId]?.messages || []), userMessage],
          title: prev[chatId]?.title === 'New Chat' ? generateChatTitle(messageText) : prev[chatId]?.title,
          updatedAt: new Date().toISOString()
        }
      }));

      setInputText('');
    }
    try {
      // === MODERATION CHECK BEFORE ANYTHING ===
      const moderation = await moderatePrompt(messageText);
      if (moderation.blocked) {
        const safeResponse = moderation.safe;

        typeMessage(safeResponse, () => {
          const blockedMsg = {
            role: 'assistant',
            content: safeResponse,
            timestamp: new Date().toISOString(),
            tokens_used: 0,
            model: selectedModel,
            isBooster: false,
            isBlocked: true
          };

          setChats(prev => ({
            ...prev,
            [chatId]: {
              ...prev[chatId],
              messages: [...prev[chatId].messages, blockedMsg],
              updatedAt: new Date().toISOString()
            }
          }));

          // Save blocked response to server (optional)
          saveMessageToServer(chatId, messageText, safeResponse, 0, false);
        });

        setIsLoading(false);
        setIsGenerating(false);
        return;
      }

      // === PROCEED WITH ORIGINAL MESSAGE (now safe) ===
      const broAIResponse = getBroAIResponse(messageText);
      let aiResponse;
      let tokensUsed = 0;
      let needsBooster = false;

      if (broAIResponse) {
        aiResponse = broAIResponse;
        tokensUsed = 0;
      } else {
        if (requiresRealTimeInfo(messageText)) {
          needsBooster = true;
          const suggestion = {
            role: 'assistant',
            content: `This query requires real-time information. Would you like to use the Booster feature for the most current data?`,
            timestamp: new Date().toISOString(),
            tokens_used: 0,
            model: selectedModel,
            isBooster: false,
            showBoosterSuggestion: true
          };

          setChats(prev => ({
            ...prev,
            [chatId]: {
              ...prev[chatId],
              messages: [...(prev[chatId]?.messages || []), suggestion],
              updatedAt: new Date().toISOString()
            }
          }));

          setIsLoading(false);
          setIsGenerating(false);
          return;
        }

        const systemPrompt = 'You are BroAI.';
        const currentChat = chats[chatId] || { messages: [], responseCache: {} };
        const conversationMessages = [
          { role: 'system', content: systemPrompt },
          ...(currentChat?.messages || []).filter(msg => !msg.showBoosterSuggestion).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: messageText }
        ];

        let totalInputTokens = 0;
        conversationMessages.forEach(msg => {
          totalInputTokens += Math.ceil(msg.content.length / 1.5);
        });

        const conversationHash = conversationMessages.map(m => m.content).join('|');
        const cacheKey = conversationHash;
        const cachedResponse = currentChat?.responseCache?.[cacheKey];
        let aiResult;

        if (cachedResponse) {
          aiResult = cachedResponse;
          tokensUsed = 0;
        } else {
          try {
            aiResult = await callAI(conversationMessages);
          } catch (error) {
  // ✅ ANY API FAILURE → Show booster option
  console.error('OpenAI failed:', error);
  
  needsBooster = true;
  const suggestion = {
    role: 'assistant',
    content: `⚠️ **API Error**: ${error.message}\n\nWould you like to use the **Booster** feature to get a response?`,
    timestamp: new Date().toISOString(),
    tokens_used: 0,
    model: selectedModel,
    isBooster: false,
    showBoosterSuggestion: true
  };

  setChats(prev => ({
    ...prev,
    [chatId]: {
      ...prev[chatId],
      messages: [...prev[chatId].messages, suggestion],
      updatedAt: new Date().toISOString()
    }
  }));

  setIsLoading(false);
  setIsGenerating(false);
  return; // ⬅️ STOP HERE - Don't throw error
}

          const outputTokens = Math.ceil(aiResult.content.length / 1.5);
          tokensUsed = totalInputTokens + outputTokens;

          setChats(prev => ({
            ...prev,
            [chatId]: {
              ...prev[chatId],
              responseCache: {
                ...prev[chatId].responseCache,
                [cacheKey]: aiResult
              }
            }
          }));
        }

        aiResponse = aiResult.content.replace(/OpenAI/gi, 'BroAI');

        if (tokensUsed > 0) {
          const tokenUpdate = await updateUserTokens(tokensUsed);
          if (!tokenUpdate.success) {
            console.warn('Token update failed but response received');
          }
        }
      }

      typeMessage(aiResponse, () => {
        const aiMessage = {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
          tokens_used: tokensUsed,
          model: selectedModel,
          isBooster: false,
          reportId: reportId
        };

        setChats(prev => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            messages: [...prev[chatId].messages, aiMessage],
            updatedAt: new Date().toISOString()
          }
        }));

        if (!isRegeneration) {
          saveMessageToServer(chatId, messageText, aiResponse, tokensUsed, false, reportId);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      if (error.message !== 'Generation was stopped') {
        const errorMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Would you like to try the Booster feature?',
          timestamp: new Date().toISOString(),
          tokens_used: 0,
          showBoosterSuggestion: true
        };

        setChats(prev => ({
          ...prev,
          [chatId]: {
            ...prev[chatId],
            messages: [...(prev[chatId]?.messages || []), errorMessage],
            updatedAt: new Date().toISOString()
          }
        }));
      }
    }

    setIsLoading(false);
    setIsGenerating(false);
  };
// ADD THIS FUNCTION — Paste above sendMessage or in helpers
const moderatePrompt = async (text) => {
  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`, // Yes, still exposed — fix later
      },
      body: JSON.stringify({
        input: text,
        model: 'omni-moderation-latest'
      })
    });

    const data = await response.json();
    const result = data.results[0];

    if (result.flagged) {
      // SILENT REWRITE — no alert, no OpenAI error
      const safe = neutralizeContent(text, result.categories);
      return { blocked: true, safe };
    }

    return { blocked: false, safe: text };
  } catch (err) {
    console.warn('Moderation failed, allowing (fail open):', err);
    return { blocked: false, safe: text }; // Fail open — risky, but no crash
  }
};

// Silent rewrite logic
const neutralizeContent = (original, categories) => {
  if (categories.harassment || categories['harassment/threatening']) {
    return "Let's keep it respectful.";
  }
  if (categories.hate || categories['hate/threatening']) {
    return "I don't respond to hate.";
  }
  if (categories.self_harm) {
    return "Please seek help from a professional.";
  }
  if (categories.sexual || categories['sexual/minors']) {
    return "I can't assist with that.";
  }
  if (categories.violence || categories['violence/graphic']) {
    return "I don't discuss violence.";
  }
  return "This content is not allowed.";
};
  // Modified useBooster to only be called when explicitly triggered
  const useBooster = async () => {
    if (!currentChatId || !chats[currentChatId] || userTokens <= 0 || boosterUsageCount >= 2) return;

    setIsBoosterLoading(true);
    setIsGenerating(true);

    try {
      const currentChat = chats[currentChatId];
      const lastUserMessage = currentChat.messages.slice().reverse().find(msg => msg.role === 'user');

      if (!lastUserMessage) {
        setIsBoosterLoading(false);
        setIsGenerating(false);
        return;
      }

      const systemPrompt = 'You are BroAI assistant with access to real-time information.';
      const userInput = `${lastUserMessage.content}\n\nPlease provide the most current and up-to-date information about this topic, including any recent developments or changes that might have occurred.`;
      
      const inputTokens = Math.ceil((systemPrompt.length + userInput.length) / 1.5);
      const cacheKey = userInput;
      const cachedResponse = currentChat.responseCache?.[cacheKey];
      let boosterResult;
      let totalTokensUsed = 0;

      if (cachedResponse) {
        boosterResult = cachedResponse;
        totalTokensUsed = 0;
      } else {
        const boosterMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ];

        boosterResult = await callGeminiBooster(boosterMessages);
        const outputTokens = Math.ceil(boosterResult.content.length / 1.5);
        totalTokensUsed = inputTokens + outputTokens;

        setChats(prev => ({
          ...prev,
          [currentChatId]: {
            ...prev[currentChatId],
            responseCache: {
              ...prev[currentChatId].responseCache,
              [cacheKey]: boosterResult
            }
          }
        }));
      }

      const processedContent = boosterResult.content.replace(/OpenAI/gi, 'BroAI');

      if (totalTokensUsed > 0) {
        const tokenUpdate = await updateUserTokens(totalTokensUsed);
        if (!tokenUpdate.success) {
          console.warn('Token deduction failed for booster');
        }
      }

      if (!cachedResponse) {
        await updateBoosterUsage();
      }

      typeMessage(processedContent, () => {
        const boosterMessage = {
          role: 'assistant',
          content: processedContent,
          timestamp: new Date().toISOString(),
          tokens_used: totalTokensUsed,
          model: 'booster',
          isBooster: true
        };

        setChats(prev => ({
          ...prev,
          [currentChatId]: {
            ...prev[currentChatId],
            messages: [...prev[currentChatId].messages, boosterMessage],
            updatedAt: new Date().toISOString()
          }
        }));

        saveMessageToServer(currentChatId, '', processedContent, totalTokensUsed, true);
      });
    } catch (error) {
      console.error('Error with booster:', error);
      const errorMessage = {
        role: 'assistant',
        content: `Booster Error: ${error.message}. Please try again.`,
        timestamp: new Date().toISOString(),
        tokens_used: 0,
        model: 'booster',
        isBooster: false
      };

      setChats(prev => ({
        ...prev,
        [currentChatId]: {
          ...prev[currentChatId],
          messages: [...prev[currentChatId].messages, errorMessage],
          updatedAt: new Date().toISOString()
        }
      }));
    }

    setIsBoosterLoading(false);
    setIsGenerating(false);
  };



const updateUserTokens = async (tokensToUse) => {
  if (!user?.uid) return { success: false, remainingTokens: userTokens || 0, tokensUsed: 0 };
  
  const actualTokensUsed = Math.min(tokensToUse, userTokens);
  
  if (actualTokensUsed <= 0) {
    return { success: true, remainingTokens: userTokens, tokensUsed: 0 };
  }
  
  try {
    const data = await safeJsonFetch(`${API_BASE}/chat_api.php?action=update_tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        tokens_used: actualTokensUsed
      })
    });
    
    if (data.success) {
      const newTokenCount = data.remaining_tokens || 0;
      setUserTokens(newTokenCount);
      return {
        success: true,
        remainingTokens: newTokenCount,
        tokensUsed: actualTokensUsed
      };
    } else {
      console.error('Error updating tokens:', data.error);
      const newTokenCount = Math.max(0, userTokens - actualTokensUsed);
      setUserTokens(newTokenCount);
      return {
        success: false,
        remainingTokens: newTokenCount,
        tokensUsed: actualTokensUsed
      };
    }
  } catch (error) {
    console.error('Error updating tokens:', error);
    const newTokenCount = Math.max(0, userTokens - actualTokensUsed);
    setUserTokens(newTokenCount);
    return {
      success: false,
      remainingTokens: newTokenCount,
      tokensUsed: actualTokensUsed
    };
  }
};
const reportMessage = async (reportId) => {
  try {
    const data = await safeJsonFetch(`${API_BASE}/chat_api.php?action=report_message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId })
    });
    
    if (data.success) {
      console.log('Message reported successfully');
      return true;
    } else {
      console.error('Error reporting message:', data.error);
      return false;
    }
  } catch (error) {
    console.error('Error reporting message:', error);
    return false;
  }
};


const saveMessageToServer = async (chatId, userMessage, aiResponse, tokensUsed, isBooster = false, reportId = null) => {
  try {
    const data = await safeJsonFetch(`${API_BASE}/chat_api.php?action=send_message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        uid: user.uid,
        message: userMessage,
        ai_response: aiResponse,
        tokens_used: tokensUsed,
        model: isBooster ? 'booster' : selectedModel,
        is_booster: isBooster,
        report_id: reportId
      })
    });
    
    if (data.success) {
      console.log('Message saved, remaining tokens:', data.remaining_tokens);
      return data;
    } else {
      console.error('Error saving message:', data.error);
      return null;
    }
  } catch (error) {
    console.error('Error saving to server:', error);
    return null;
  }
};

const deleteChat = async (chatId) => {
  if (!user?.uid) return;
  
  try {
    const data = await safeJsonFetch(
      `${API_BASE}/chat_api.php?action=delete_chat&chat_id=${chatId}&uid=${user.uid}`,
      { method: 'DELETE' }
    );
    
    if (data.success) {
      setChats(prev => {
        const updated = { ...prev };
        delete updated[chatId];
        return updated;
      });

      if (currentChatId === chatId) {
        const remainingChats = Object.keys(chats).filter(id => id !== chatId);
        if (remainingChats.length > 0) {
          const nextChat = remainingChats[0];
          setCurrentChatId(nextChat);
          loadChatMessages(nextChat);
        } else {
          setCurrentChatId(null);
        }
      }
    } else {
      console.error('Error deleting chat:', data.error);
    }
  } catch (error) {
    console.error('Error deleting chat:', error);
  }
};



  const copyMessage = async (content) => {
    try {
      await Clipboard.setString(content);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };



  const currentMessages = currentChatId && chats[currentChatId] ? chats[currentChatId].messages : [];
  const sortedChats = Object.values(chats).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const filteredChats = sortedChats.filter(chat => chat.title.toLowerCase().includes(sidebarSearchTerm.toLowerCase()));

const sidebarTranslateX = sidebarAnimatedValue.interpolate({
  inputRange: [0, 1],
  outputRange: [-320, 0], // left se slide in
});

  // Check if we should show booster button
  const shouldShowBooster = currentMessages.length > 0 && 
    currentMessages[currentMessages.length - 1]?.role === 'assistant' && 
    !currentMessages[currentMessages.length - 1]?.isBooster &&
    boosterUsageCount < 2;


  return (
    <SafeAreaView style={styles.container}>
      <Modal
        visible={showTokenAlert}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTokenAlert(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Image source={require('./assets/alert-circle.png')} style={styles.iconSmall} />
              <Text style={styles.modalTitle}>Insufficient Tokens</Text>
            </View>
            <Text style={styles.modalText}>
              You don't have enough tokens to send this message. Get more tokens to continue chatting.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => {
                  setShowTokenAlert(false);
                  openMembershipScreen();
                }}
              >
                <Text style={styles.modalButtonText}>Recharge Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.disabledButton]} disabled={true}>
                <Text style={styles.modalButtonText}>Watch Ads (+2000)</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTokenAlert(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.mainContainer}>
        <TokenWalletModal 
          visible={isWalletVisible}
          onClose={() => setIsWalletVisible(false)}
          navigation={navigation}
        />
       <Animated.View
  style={[
    styles.sidebar,
    {
      transform: [{ translateX: sidebarTranslateX }], // ← YEH NAYA
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 320, // ← fixed width, animate nahi
      zIndex: 1000,
    },
  ]}
>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarSearchContainer}>
              <Image source={require('./assets/search.png')} style={styles.iconSmall} />
              <TextInput
                value={sidebarSearchTerm}
                onChangeText={setSidebarSearchTerm}
                placeholder="Search chats..."
                style={styles.sidebarSearchInput}
                placeholderTextColor="#8E8E93"
              />
              {sidebarSearchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSidebarSearchTerm('')}>
                  <Image source={require('./assets/x.png')} style={styles.iconSmall} />
                </TouchableOpacity>
              )}
            </View>
          </View>
     
          <TouchableOpacity
            onPress={createNewChat}
            style={styles.newChatButtonSidebar}
          >
            <View style={styles.newChatButtonIcon}>
              <Image source={require('./assets/newtext1.png')} style={styles.iconSmalls} />
            </View>
            <Text style={styles.newChatButtonText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSidebarOpen(false);
              ImageOpenScreen();
            }}
            style={styles.newChatButtonSidebar}
          >
            <View style={styles.newChatButtonIcon}>
              <Image source={require('./assets/newtext.png')} style={styles.iconSmalls} />
            </View>
            <Text style={styles.newChatButtonText}>Image</Text>
          </TouchableOpacity>
      <TouchableOpacity
            onPress={() => {
              setSidebarOpen(false);
              AssignOpenScreen();
            }}
            style={styles.newChatButtonSidebar}
          >
            <View style={styles.newChatButtonIcon}>
              <Image source={require('./../assets/folder.png')} style={styles.iconSmalls} />
            </View>
            <Text style={styles.newChatButtonText}>Assignment</Text>
          </TouchableOpacity>
          <ScrollView style={styles.sidebarChats}>
            <Text style={styles.historyTitle}>Conversations</Text>
            {filteredChats.map(chat => (
              <TouchableOpacity
                key={chat.id}
                onPress={() => {
                  setCurrentChatId(chat.id);
                  loadChatMessages(chat.id);
                  setSidebarOpen(false);
                }}
                style={[
                  styles.chatItem,
                  currentChatId === chat.id && styles.activeChatItem,
                ]}
              >
                <Image 
                  source={require('./assets/message-square.png')} 
                  style={[styles.iconSmall, { tintColor: currentChatId === chat.id ? '#222222ff' : '#8E8E93' }]} 
                />
                <View style={styles.chatInfo}>
                  <Text 
                    style={[
                      styles.chatTitle,
                      currentChatId === chat.id && styles.activeChatTitle
                    ]} 
                    numberOfLines={1}
                  >
                    {chat.title}
                  </Text>
                  {chat.messageCount > 0 && (
                    <Text style={styles.chatMessageCount}>{chat.messageCount} messages</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => deleteChat(chat.id)}
                  style={styles.deleteButton}
                >
                  <Image source={require('./assets/trash.png')} style={[styles.iconSmall, { tintColor: '#8E8E93' }]} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
     
          <View style={styles.sidebarFooter}>
            <View style={styles.tokenDisplay}>
              <Image source={require('./assets/coins.png')} style={[styles.iconSmall, {     tintColor: '#7b7c7bff',
 }]} />
              <Text style={styles.tokenText}>
                {userTokens.toLocaleString()} tokens
              </Text>
            </View>
            
           <View style={styles.boosterUsageDisplay}>
              <Text style={styles.boosterUsageText}>
                 Booster: {boosterUsageCount}/2 used today
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => setIsWalletVisible(true)}
            >
              <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                   <Image source={require('./assets/logo.png')} style={{ width: 46, height: 46}} />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
                  </Text>
                  <Text style={styles.userEmail}>{user?.email || "No email"}</Text>   
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
        {sidebarOpen && (
          <TouchableOpacity 
            style={styles.sidebarOverlay} 
            onPress={() => setSidebarOpen(false)}
            activeOpacity={1}
          />
        )}

        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => setSidebarOpen(!sidebarOpen)}
                style={styles.menuButton}
              >
                <Image source={require('./assets/menu.png')} style={[styles.iconSmallsss]} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {currentChatId && chats[currentChatId] ? 
                  truncateTitle(chats[currentChatId].title) : 'BroAI'}
              </Text>
            </View>
            <View style={styles.modelPickerContainer}>
              <Picker
                selectedValue={selectedModel}
                onValueChange={(itemValue) => setSelectedModel(itemValue)}
                style={styles.picker}
              >
                {Object.values(models).map((model) => (
                  <Picker.Item
                    key={model.id}
                    label={`${model.name} ${model.description}`}
                    value={model.id}
                  />
                ))}
              </Picker>
            </View>
          </View>

<ScrollView
  ref={scrollViewRef}
  style={styles.messagesContainer}
  contentContainerStyle={styles.messagesContent}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={['#FF9F0A']}
      tintColor="#FF9F0A"
    />
  }
  onScroll={handleScroll}
  scrollEventThrottle={16}
>
{currentMessages.length === 0 ? (
    <View style={styles.emptyChatContainer}>
      <Text style={styles.emptyChatTitle}>{mainText}</Text>
    </View>
    
  ) : (
  <View style={styles.messagesList}>
{currentMessages.map((message, index) => (
  <View
    key={index}
    style={[
      styles.messageContainer,
      message.role === 'user' ? styles.userMessageContainer : styles.aiMessageContainer,
      message.isReported === 1 && reportedMessageStyles.reportedMessageContainer,
    ]}
  >
    {message.role === 'user' ? (
      <View style={[styles.messageBubble, styles.userBubble]}>
        <Text 
          selectable={true}
          style={[styles.messageText, { color: '#0000' }]}
        >
          {message.content}
        </Text>
      </View>
    ) : (
    <View style={styles.aiMessageContent}
    pointerEvents="box-none">
    {message.isReported === 1 && (
      <View style={reportedMessageStyles.reportedBadge}>
        <Text selectable={true} style={reportedMessageStyles.reportedBadgeText}>
          ⚠️ Reported • Content Hidden
        </Text>
      </View>
    )}

    <View
      style={[
        reportedMessageStyles.aiTextWrapper,
        message.isReported === 1 && reportedMessageStyles.reportedMessageBlur,
      ]}
      pointerEvents="auto" // ← ADD THIS - touchable banao
    >
          {message.isReported === 1 ? (
            <Text style={reportedMessageStyles.reportedPlaceholder}>
              This message was reported and is under review by moderators.
            </Text>
          ) : (
           <MarkdownRenderer content={message.content} />
          )}
        </View>
{/* ✅ UPDATED: Show Booster Button OR Ad Button */}
{message.showBoosterSuggestion && (
  <>
    {boosterUsageCount < 2 ? (
      // Original Booster Button
      <TouchableOpacity
        onPress={useBooster}
        disabled={isBoosterLoading || userTokens <= 0}
        style={[
          styles.inlineBoosterButton,
          (isBoosterLoading || userTokens <= 0) && styles.disabledButton
        ]}
      >
        {isBoosterLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Text style={styles.inlineBoosterButtonText}>
              🚀 Use Booster ({2 - boosterUsageCount}/2 left)
            </Text>
            <Text style={styles.inlineBoosterSubText}>
              Get real-time data from BroZaa
            </Text>
          </>
        )}
      </TouchableOpacity>
    ) : (
      // ✅ NEW: Watch Ad for More Boosters Button
      <TouchableOpacity
        onPress={showBoosterRewardAd}
        disabled={showingBoosterAd || isBoosterAdLoading}
        style={[
          styles.boosterAdButton,
          (showingBoosterAd || isBoosterAdLoading) && styles.disabledButton
        ]}
      >
        {showingBoosterAd || isBoosterAdLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Text style={styles.boosterAdButtonText}>
              📺 Watch Ad for 2 More Boosters
            </Text>
            <Text style={styles.boosterAdSubText}>
              {boosterAdLoaded ? 'Ad Ready!' : 'Loading ad...'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    )}
  </>
)}
        {/* ACTIONS - HIDE IF REPORTED */}
        {message.isReported !== 1 && (
          <View style={styles.messageFooter}>
            <View style={styles.messageActions}>
              <TouchableOpacity
                onPress={() => copyMessage(message.content)}
                style={styles.actionButton}
              >
                <Image
                  source={require('./assets/copy.png')}
                  style={[styles.iconSmall, { tintColor: '#6B7280' }]}
                />
              </TouchableOpacity>
    <TouchableOpacity
        onPress={() => speakResponse(message.content)}
        style={styles.actionButton}
      >
        <Image
          source={require('./assets/speaker.png')}
          style={[
            styles.iconSmall, 
            { tintColor: isSpeaking ? '#FF3B30' : '#6B7280' }
          ]}
        />
      </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Report', {
                  item: message,
                  reportType: 'chat_message',
                  timestamp: message.timestamp,
                  reportId: message.reportId || `msg_${index}_${Date.now()}`,
                  onReportSuccess: (reportedId) => {
                    setChats(prev => ({
                      ...prev,
                      [currentChatId]: {
                        ...prev[currentChatId],
                        messages: prev[currentChatId].messages.map((msg, i) =>
                          i === index ? { ...msg, isReported: 1 } : msg
                        )
                      }
                    }));
                  }
                })}
                style={styles.actionButton}
              >
                <Image
                  source={require('./assets/flag.png')}
                  style={[styles.iconSmall, { tintColor: '#6B7280' }]}
                />
              </TouchableOpacity>

              {!message.showBoosterSuggestion && (
                <TouchableOpacity
                  onPress={() => regenerateMessage(index)}
                  style={styles.actionButton}
                  disabled={isLoading || userTokens <= 0}
                >
                  <Image
                    source={require('./assets/refresh.png')}
                    style={[
                      styles.iconSmall,
                      { tintColor: isLoading ? '#2C2C2E' : '#6B7280' }
                    ]}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    )}
  </View>
))}

  {isTyping && (
    <View style={[styles.messageContainer, styles.aiMessageContainer]}>
      <View style={styles.aiMessageContent}>
        <View style={styles.aiTextWrapper} pointerEvents="none">
         <MarkdownRenderer content={typingMessage + '|'} />
        </View>
      </View>
    </View>
  )}
  
  {isLoading && !isTyping && (
    <View style={styles.loadingContainer}>
      <MiniLoader />
    </View>
  )}
</View>
  )}
</ScrollView>
      {showScrollToBottom && (
        <TouchableOpacity style={styles.scrollToBottomButton} onPress={scrollToBottom}>
          <Image
            source={require('./assets/down-arrow.png')} // Replace with your down arrow icon
            style={styles.scrollToBottomIcon}
          />
        </TouchableOpacity>
      )}

        <KeyboardAvoidingView
          behavior={'padding'}
          keyboardVerticalOffset={5}
          style={styles.inputContainer}
        >
         <View style={styles.inputWrapper}>

  <TextInput
    ref={textareaRef}
    value={inputText}
    onChangeText={setInputText}
    onKeyPress={handleKeyDown}
    placeholder={
      userTokens <= 0 ? "No tokens remaining..." : 
      "Ask BroAI anything..."
    }
    placeholderTextColor="#8f8c8cff"
    style={styles.inputText}
    multiline={true}
    editable={!isLoading && userTokens > 0}
    returnKeyType="default"
  />

{isGenerating ? (
    <TouchableOpacity onPress={stopGeneration} style={styles.stopButton}>
      <Image source={require('./assets/stop.png')} style={[styles.iconSmallss]} />
    </TouchableOpacity>
  ) : userTokens <= 0 ? (
    <TouchableOpacity
      onPress={showRewardAd}
      disabled={isAdButtonDisabled()}
      style={[
        styles.rewardAdButton,
        isAdButtonDisabled() && styles.disabledButton
      ]}
    >
      {showingAd || (isAdLoading && adLoadingInitially) ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <>
          <Text style={styles.rewardAdButtonText}>{getAdButtonText()}</Text>
        </>
      )}
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      onPress={() => sendMessage()}
      disabled={!inputText.trim() || isLoading}
      style={[
        styles.sendButton,
        (!inputText.trim() || isLoading) && styles.disabledSendButton,
      ]}
    >
      <Image source={require('./assets/send.png')} style={[styles.iconSmallss]} />
    </TouchableOpacity>
  )}
</View>

          <Text style={styles.inputFooter}>
            {userTokens <= 0 ? (
              <Text style={styles.noTokensFooter}>No tokens remaining. watch ads to continue.</Text>
            ) : (
              'BroAI can make mistakes. Check important info.'
            )}
          </Text>
        </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
};

// Add these styles to your StyleSheet
const reportedMessageStyles = {
  reportedMessageContainer: {
    opacity: 0.6,
    backgroundColor: '#FEF2F2',
  },
  reportedBadge: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportedBadgeText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
  },
  reportedPlaceholder: {
    color: '#999',
    fontStyle: 'italic',
    fontSize: 14,
  },
  reportedMessageBlur: {
    opacity: 0.5,
  },
  aiTextWrapper: {
    marginVertical: 4,
  }
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  iconSmall: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#7b7c7bff',

  },
   iconSmallss: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    tintColor: '#000000ff',

  },
    iconSmallsss: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    tintColor: '#000000ff',

  },
  rewardAdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4c175cff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    elevation: 3,
    shadowColor: '#FF9F0A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  rewardAdButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  iconSmalls: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: '#7b7c7bff',
  },
  modelPickerContainer: {
    flexDirection: 'row',
    width: 140,
    height: 30,
    alignItems: 'center',
    padding: 2,
    paddingHorizontal: 3,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
  },
  picker: {
    flex: 1,
    color: '#000000',
    borderRadius: 8,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B00',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalText: {
    color: '#4B4B4B',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    gap: 12,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  modalCloseText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  sidebar: {
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    height: '100%',
  },
  sidebarHeader: {
    padding: 16,
  },
  sidebarSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  sidebarSearchInput: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
  },
  newChatButtonSidebar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  newChatButtonIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
  sidebarChats: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B4B4B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  reportedContentContainer: {
  position: 'relative',
},
reportedOverlay: {
  position: 'absolute',
  top: '40%',
  left: 0,
  right: 0,
  alignItems: 'center',
},
reportedText: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#FF3B30',
},
reportedSubText: {
  fontSize: 12,
  color: '#FF3B30',
  marginTop: 4,
},
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginHorizontal: 8,
    borderRadius: 10,
    marginVertical: 2,
  },
  activeChatItem: {
    backgroundColor: '#f3f3f3',
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    color: '#4B4B4B',
    fontSize: 16,
  },
  activeChatTitle: {
    color: '#000000',
    fontWeight: '600',
  },
  chatMessageCount: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f3f3',
    gap: 16,
  },
  tokenDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
  },
  tokenText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  boosterUsageDisplay: {
    padding: 12,
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    alignItems: 'center',
  },
  boosterUsageText: {
    color: '#00A3CC',
    fontSize: 14,
    fontWeight: '600',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  userEmail: {
    color: '#4B4B4B',
    fontSize: 14,
  },
  header: {
    backgroundColor: '#F8FAFD',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  messagesContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messagesList: {
    padding: 16,
    gap: 16,
  },
  messageContainer: {
    marginVertical: 4,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 18,
    flexShrink: 1,
  },
  userBubble: {
    backgroundColor: '#f3f3f3',
  },
  aiMessageContent: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  aiTextWrapper: {
    width: '100%',
    flexWrap: 'wrap',
  },
  messageText: {
    color: '#000000',
    fontSize: 16,
    lineHeight: 24,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  boosterAdButton: {
  backgroundColor: '#8B5CF6', // Purple color for distinction
  borderRadius: 12,
  padding: 14,
  marginTop: 12,
  alignItems: 'center',
  elevation: 3,
  shadowColor: '#8B5CF6',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  borderWidth: 2,
  borderColor: '#A78BFA',
},
boosterAdButtonText: {
  color: '#FFFFFF',
  fontWeight: 'bold',
  fontSize: 15,
},
boosterAdSubText: {
  color: '#FFFFFF',
  fontSize: 11,
  marginTop: 4,
  opacity: 0.9,
},
  formattedText: {
    color: '#1C2526',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 4,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  boldText: {
    fontWeight: '700',
    color: '#000000',
  },
  inlineCodeText: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0ff',
    color: '#FF9F0A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },
  codeBlockContainer: {
    backgroundColor: '#ccc',
    borderRadius: 8,
    marginVertical: 8,
    overflow: 'hidden',
  },
  codeBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ccc',
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  codeBlockLanguage: {
    color: '#000000ff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  codeBlockCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeBlockCopyText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  codeBlockScroll: {
    maxHeight: 400,
  },
  codeBlockText: {
    fontFamily: 'monospace',
    color: '#292424ff',
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  messageTimestamp: {
    color: '#4B4B4B',
    fontSize: 12,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C2526',
    marginBottom: 20,
    textAlign: 'center',
  },
  noTokensText: {
    color: '#FF0000',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  suggestionBubble: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE082',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 4,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  boosterSuggestionBadge: {
    backgroundColor: '#F39C12',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  boosterSuggestionBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inlineBoosterButton: {
    backgroundColor: '#020101ff',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    alignItems: 'center',
  },
  inlineBoosterButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  inlineBoosterSubText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 2,
  },
  boosterBadge: {
    backgroundColor: '#00A3CC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  boosterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  boosterContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  boosterButton: {
    backgroundColor: '#00A3CC',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 25,
    flexDirection: 'column',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#00A3CC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  reportedMessageContainer: {
  opacity: 0.6,
},
reportedBadge: {
  backgroundColor: '#FF3B30',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 6,
  alignSelf: 'flex-start',
  marginBottom: 8,
},
reportedBadgeText: {
  color: '#FFF',
  fontSize: 12,
  fontWeight: '600',
},
reportedMessageBlur: {
  opacity: 0.5,
},
reportedPlaceholder: {
  color: '#888',
  fontStyle: 'italic',
},
  disabledBoosterButton: {
    backgroundColor: '#B0B0B0',
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  boosterButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  boosterSubText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  cursor: {
    opacity: 1,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  loadingBubble: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingDots: {
    marginRight: 8,
  },
  inputContainer: {
    backgroundColor: '#F8FAFD',
    padding: 20,
  },
inputWrapper: {
  flexDirection: 'row',
  alignItems: 'flex-end',        // this keeps button pinned to bottom
  backgroundColor: '#fff',
  borderRadius: 25,
  paddingLeft: 16,
  paddingRight: 8,               // reduced right padding because button has its own space
  paddingVertical: 8,
  minHeight: 50,
  maxHeight: 120,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 4,
},

inputText: {
  flex: 1,
  fontSize: 16,
  color: '#000000',
  paddingTop: 10,
  paddingBottom: 10,
  paddingRight: 8,              // space for button
  minHeight: 40,
  // NO maxHeight here – let parent control it
},

// NEW: Separate container so button never moves
buttonContainer: {
  justifyContent: 'center',
  alignItems: 'center',
  paddingBottom: 4,            // fine-tune vertical position
},



disabledButton: {
  backgroundColor: '#cccccc',
  opacity: 0.6,
},

buttonIcon: {
  width: 28,
  height: 28,
  tintColor: '#FFFFFF',
  resizeMode: 'contain',
},
  
  inputFooter: {
    fontSize: 13,
    color: '#4B4B4B',
    textAlign: 'center',
    marginTop: 12,
  },
  noTokensFooter: {
    color: '#4B4B4B',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    backgroundColor: 'rgba(34, 33, 33, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000000ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    zIndex: 5,
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },
  scrollToBottomIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },

});

export default Home;