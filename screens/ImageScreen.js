import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
  Image,
  Dimensions,
  Modal,
  PermissionsAndroid,
  KeyboardAvoidingView,
  Platform,
  Easing 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import TokenWalletModal from './MemberShip';
import ImageViewer from 'react-native-image-zoom-viewer';
import { parse, subDays, addDays, isSameDay, isAfter } from 'date-fns';
import Clipboard from '@react-native-clipboard/clipboard';
import LoadingScreen from './loadinScreen';
import MiniLoader from './miniloader';

import { SafeAreaView } from 'react-native-safe-area-context';
import calendarData from './month.json';
const { full_calendar_of_days_and_observances } = calendarData;
// Manual Icons
const SendIcon = () => (
  <Image source={require('./assets/send.png')} style={{ width: 36, height: 36, tintColor: '#535353ff' }} />
);
const ShareIcon = () => (
  <Image source={require('./assets/share.png')} style={{ width: 16, height: 16, tintColor: '#383838ff' }} />
);
const PlusIcon = () => (
  <Image source={require('./assets/newtext.png')} style={{ width: 20, height: 20, tintColor: '#7b7c7bff' }} />
);
const PlusIcons = () => (
  <Image source={require('./assets/newtext1.png')} style={{ width: 20, height: 20, tintColor: '#7b7c7bff' }} />
);
const GalleryIcons = () => (
  <Image source={require('./assets/gallery.png')} style={{ width: 28, height: 28, tintColor: '#7b7c7bff' }} />
);


const MenuIcon = () => (
  <Image source={require('./assets/menu.png')} style={{ width: 26, height: 26, tintColor: '#2e2e2eff' }} />
);



const SearchIcon = () => (
  <Image source={require('./assets/search.png')} style={iconStyles.icon} />
);

const CloseIcon = () => (
  <Image source={require('./assets/x.png')}  style={{ width: 16, height: 16, tintColor: '#FFF' }} />
);


const StarIcon = () => (
  <Image source={require('./assets/star.png')} style={{ width: 36, height: 36, tintColor: '#535353ff' }}/>
);

const DownloadIcon = () => (
  <Image
    source={require('./assets/download.png')}
    style={{ width: 16, height: 16, tintColor: '#383838ff' }}
  />
);
const Reporting = () => (
  <Image
    source={require('./assets/flag.png')}
    style={{ width: 16, height: 16, tintColor: '#383838ff' }}
  />
);

const CopyIcon = () => (
  <Image source={require('./assets/copy.png')} style={{ width: 16, height: 16, tintColor: '#FFF' }} />
);


const iconStyles = StyleSheet.create({
  icon: {
    width: 20,
    height: 20,
    tintColor: '#000',
  },
});

// Simple UUID generator
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const ImageScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [enhancingPrompt, setEnhancingPrompt] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [imageProgress, setImageProgress] = useState(0);
  const [selectedImageModal, setSelectedImageModal] = useState(null);
  
  const [upscaling, setUpscaling] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isWalletVisible, setIsWalletVisible] = useState(false);
  const [welcomeTextIndex, setWelcomeTextIndex] = useState(0);
  const [quickPrompts, setQuickPrompts] = useState([]);
const [suggestedPrompts, setSuggestedPrompts] = useState([]);
const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
const [waitingForSelection, setWaitingForSelection] = useState(false);
const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(null);
  // NEW STATES
  const [editingImage, setEditingImage] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageZoomScale] = useState(new Animated.Value(1));
  const [conversationContext, setConversationContext] = useState([]);

  const progressAnimation = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const textareaRef = useRef(null);
  const sidebarAnimatedValue = useRef(new Animated.Value(0)).current;

  const OPENAI_API_KEY = '';
  const PHP_API_URL = 'api/broai_api.php';
// Baaki states ke saath yeh add kar
const [explicitKeywords, setExplicitKeywords] = useState([]);

// Default fallback keywords (in case API fail ho)
const fallbackKeywords = [
  'porn', 'pornography', 'xxx', 'nsfw', 'adult', 'sex', 'sexual', 'nude', 'naked',
  'erotic', 'hentai', 'fuck', 'dick', 'penis', 'vagina', 'boobs', 'breasts', 'ass',
  'butt', 'explicit', '18+', 'adult content', 'sexy', 'sensual', 'bdsm', 'fetish',
  'orgy', 'masturbation', 'cum', 'sperm', 'ejaculation', 'hardcore', 'softcore',
  'pussy', 'cock', 'blowjob', 'handjob', 'fellatio', 'cunnilingus', 'anal',
  'intercourse', 'prostitute', 'milf', 'threesome', 'gangbang',
  // Hindi slang
  'chut', 'lund', 'randi', 'chudai', 'nanga', 'chuchi', 'gaand', 'madarchod', 'behenchod'
];

const containsExplicitContent = (text) => {
  if (!text || explicitKeywords.length === 0) return false;
  const lowerText = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return explicitKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
};
  const welcomeMessages = [
    "What image would you like to create today?",
    "Imagine your masterpiece, let's bring it to life!",
    "What's the vision for your next artwork?",
    "Ready to generate something amazing?",
  ];

  // Aspect ratio dimensions
  const getAspectRatioDimensions = (ratio) => {
    switch (ratio) {
      case '9:16': return { width: 576, height: 1152 };
      case '1:1': return { width: 512, height: 512 };
      case '16:9': return { width: 1152, height: 576 };
      default: return { width: 512, height: 512 };
    }
  };
const HandleCopy = (text) => {
  try {
    Clipboard.setString(text);
  } catch (error) {
    console.error('Copy failed:', error);
  }
};
  // Request storage permission for Android
const requestStoragePermission = async () => {
  if (Platform.Version >= 33) {
    // Android 13+ → No permission needed for Downloads
    return true;
  }

  // Sirf Android 12 aur neeche ke liye
  if (Platform.Version >= 23) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true; // Bahut purane devices
};
useEffect(() => {
  const loadKeywords = async () => {
    try {
      const res = await fetch('api/get_nsfw_keywords.php');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.keywords)) {
          setExplicitKeywords(data.keywords);
          return;
        }
      }
    
    } catch (error) {
      console.error('Keyword API error:', error);
    }
    // Fallback
    setExplicitKeywords(fallbackKeywords);
  };

  loadKeywords();
}, []);
  useEffect(() => {
    if (userData?.uid) {
      fetchChatHistory();
    }
  }, [userData]);
  useEffect(() => {
  const updatePrompts = () => {
    const prompts = getQuickPrompts();
    setQuickPrompts(prompts);
  };

  updatePrompts();
  const interval = setInterval(updatePrompts, 24 * 60 * 60 * 1000); // Check daily
  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    initializeApp();
    generateChatId();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

useEffect(() => {
  Animated.timing(sidebarAnimatedValue, {
    toValue: sidebarOpen ? 1 : 0,
    duration: 250, // 300 se 250 karo
    useNativeDriver: true, // ✅ FALSE SE TRUE KARO
    easing: Easing.out(Easing.ease), // ✅ YE ADD KARO
  }).start();
}, [sidebarOpen]);
const sidebarTranslateX = sidebarAnimatedValue.interpolate({
  inputRange: [0, 1],
  outputRange: [-Dimensions.get('window').width * 0.8, 0], // ✅ WIDTH KI JAGAH TRANSLATE USE KARO
});
  useEffect(() => {
    const interval = setInterval(() => {
      setWelcomeTextIndex((prev) => (prev + 1) % welcomeMessages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const initializeApp = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadUserData();
      await fetchChatHistory();
      setIsInitialLoad(false);
    } catch (error) {
      setIsInitialLoad(false);
    }
  };
  const getQuickPrompts = () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const currentMonth = today.toLocaleString('default', { month: 'long' });

  const monthData = full_calendar_of_days_and_observances.find(
    (month) => month.month.toLowerCase() === currentMonth.toLowerCase()
  );

  if (!monthData) return [];

  const prompts = monthData.days
    .filter((day) => {
      // Handle fixed dates (e.g., "1", "2-7")
      if (day.date.includes('-')) {
        const [start, end] = day.date.split('-').map(Number);
        const startDate = new Date(today.getFullYear(), today.getMonth(), start);
        const endDate = new Date(today.getFullYear(), today.getMonth(), end);
        return isSameDay(tomorrow, startDate) || (tomorrow >= startDate && tomorrow <= endDate);
      } else if (day.date === 'First Sunday' || day.date === 'Second Sunday' || day.date === 'Third Sunday') {
        // Handle dynamic dates like "First Sunday"
        const [order, dayOfWeek] = day.date.split(' ');
        const targetDate = getNthDayOfMonth(today.getFullYear(), today.getMonth(), dayOfWeek, order);
        return isSameDay(tomorrow, targetDate);
      } else {
        const eventDate = new Date(today.getFullYear(), today.getMonth(), parseInt(day.date));
        return isSameDay(tomorrow, eventDate);
      }
    })
    .map((day) => ({
      hindi: day.name_hindi,
      english: day.name_english,
      prompt: `"Create a vibrant social media greeting image for ${day.name_english} (${day.name_hindi}) featuring the text '${day.name_english}' in an eye-catching style."
`,
      eventDate: day.date.includes('-')
        ? new Date(today.getFullYear(), today.getMonth(), parseInt(day.date.split('-')[0]))
        : day.date === 'First Sunday' || day.date === 'Second Sunday' || day.date === 'Third Sunday'
        ? getNthDayOfMonth(today.getFullYear(), today.getMonth(), day.date.split(' ')[1], day.date.split(' ')[0])
        : new Date(today.getFullYear(), today.getMonth(), parseInt(day.date)),
    }));

  return prompts;
};
const getNthDayOfMonth = (year, month, dayOfWeek, order) => {
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = daysOfWeek.indexOf(dayOfWeek);
  const orders = { 'First': 1, 'Second': 2, 'Third': 3 };
  let occurrence = orders[order];
  let date = new Date(year, month, 1);
  let count = 0;

  while (date.getMonth() === month) {
    if (date.getDay() === dayIndex) {
      count++;
      if (count === occurrence) return date;
    }
    date = addDays(date, 1);
  }
  return null;
};

  const generateChatId = () => {
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentChatId(chatId);
    return chatId;
  };
const getInputPlaceholder = () => {
  if (editingImage) return "Describe how to modify the image...";
  if (quickPrompts.length > 0) {
    return quickPrompts.map((prompt) => prompt.prompt).join(' or ');
  }
  return "Imagine anything";
};

// Add quick prompt selection handler
const selectQuickPrompt = (prompt) => {
  setInputText(prompt);
  textareaRef.current?.focus();
};

// ✅ fetchChatHistory mein image URL validation add karo
const fetchChatHistory = async () => {
  try {
    if (!userData?.uid) {
      console.log('❌ No user ID found');
      return;
    }

    const response = await fetch(PHP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'GET_get_chat_history',
        user_id: userData.uid || 'anonymous',
        limit: 50,
        offset: 0,
      }),
    });

    const result = await response.json();

    if (result.success && result.data?.chats) {
      const chats = result.data.chats.map(chat => {
        const processedMessages = chat.messages.map((msg) => {
          // ✅ IMAGE URL VALIDATION ADD KARO
          if (msg.role === 'assistant' && msg.type === 'image') {
            console.log('Image URL:', msg.content); // Debug
            
            // Check if URL is valid
            if (!msg.content || !msg.content.startsWith('http')) {
              console.warn('Invalid image URL:', msg.content);
              return {
                ...msg,
                content: null, // Null set kar do invalid URLs ko
              };
            }
          }
          
          return {
            ...msg,
            reportId: msg.reportId || null,
            taskUUID: msg.taskUUID || null,
            isReported: msg.isReported || 0,
          };
        });
        
        return {
          ...chat,
          messages: processedMessages,
        };
      });

      setChatHistory(chats);
      await AsyncStorage.setItem('imageChats', JSON.stringify(chats));
      
      // Auto-select
      if (chats.length > 0 && !currentChatId) {
        const firstChat = chats[0];
        setCurrentChatId(firstChat.id);
        setMessages(firstChat.messages);
        buildContextFromMessages(firstChat.messages);
      }
    }
  } catch (error) {
    console.error('❌ fetchChatHistory error:', error);
  }
};


  const loadChatHistory = async () => {
    try {
      const chatHistory = await AsyncStorage.getItem('imageChats');
      if (chatHistory) {
        const chats = JSON.parse(chatHistory);
        setChatHistory(chats);
        if (chats.length > 0 && !currentChatId) {
          setMessages(chats[0].messages || []);
          setCurrentChatId(chats[0].id);
          buildContextFromMessages(chats[0].messages);
        }
      }
    } catch (error) { }
  };

  const buildContextFromMessages = (msgs) => {
    const context = msgs
      .filter(msg => msg.role === 'user' || (msg.role === 'assistant' && msg.type === 'image'))
      .map(msg => {
        if (msg.role === 'user') {
          return { type: 'prompt', text: msg.content };
        } else {
          return { type: 'image', url: msg.content, prompt: msg.prompt };
        }
      });
    setConversationContext(context);
  };

  const selectChat = (chatId) => {
    const selectedChat = chatHistory.find(chat => chat.id === chatId);
    if (selectedChat) {
      setMessages(selectedChat.messages || []);
      setCurrentChatId(chatId);
      buildContextFromMessages(selectedChat.messages || []);
      setSidebarOpen(false);
    }
  };
// ✅ saveChatToDatabase mein response properly handle karo
const saveChatToDatabase = async (prompt, imageUrl, chatId, taskUUID) => {
  try {
    const res = await fetch(PHP_API_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        action: 'save_chat',
        user_id: userData?.uid || 'anonymous',
        chat_id: chatId,
        prompt, 
        image_url: imageUrl, // Runware URL bhej rahe ho
        model: 'runware:101@1',
        task_uuid: taskUUID,
        timestamp: new Date().toISOString(),
      }),
    });
    
    const json = await res.json();
    console.log('✅ API Response:', json);
    
    // ✅ YE RETURN KARO - Server saved image URL aur report_id dono
    return {
      reportId: json.data?.report_id || json.reportId || null,
      savedImageUrl: json.data?.image_url || imageUrl, // ✅ Server ka permanent URL
      uploadedToServer: json.data?.uploaded_to_server || false
    };
  } catch (error) {
    console.error('❌ Save chat error:', error);
    return { reportId: null, savedImageUrl: imageUrl, uploadedToServer: false };
  }
};
 const saveChatToStorage = async (updatedMessages) => {
  try {
    const chatData = {
      id: currentChatId,
      messages: updatedMessages.map(msg => ({
        ...msg,
        isReported: msg.isReported || 0,
        reportId: msg.reportId || null,
        taskUUID: msg.taskUUID || null,
      })),
      timestamp: new Date().toISOString(),
      title: updatedMessages.length > 0 ? updatedMessages[0].content.slice(0, 50) : 'New Chat',
    };

    const existingChats = await AsyncStorage.getItem('imageChats');
    let chats = existingChats ? JSON.parse(existingChats) : [];

    const existingIndex = chats.findIndex(chat => chat.id === currentChatId);
    if (existingIndex >= 0) {
      chats[existingIndex] = chatData;
    } else {
      chats.unshift(chatData);
    }

    chats = chats.slice(0, 50);
    setChatHistory(chats);
    await AsyncStorage.setItem('imageChats', JSON.stringify(chats));
  } catch (error) {
    console.error('saveChatToStorage error:', error);
  }
};

  const loadUserData = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userData');
      let user;
      if (storedUserData) {
        user = JSON.parse(storedUserData);
      } else {
        user = {
          uid: 'demo_user_' + Date.now(),
          email: 'demo@example.com',
          displayName: 'Demo User',
          emailVerified: true,
          lastLoginAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        await fetch(PHP_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_user',
            uid: user.uid,
            email: user.email,
            display_name: user.displayName,
            email_verified: user.emailVerified,
          }),
        });
      }
      setUserData(user);
    } catch (error) { }
  };

  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };
const enhancePrompt = async () => {
  if (!inputText.trim() || enhancingPrompt) return;
  
  if (containsExplicitContent(inputText)) {
    Alert.alert("Not Allowed", "This type of content is not supported.");
    return;
  }

  setEnhancingPrompt(true);

  try {
    // Detect if user wants text in image
    const hasTextRequest = /\b(text|write|written|words|quote|saying|typography|letter|font)\b/i.test(inputText);
    
    const contextPrompt = buildContextPromptForEnhancement();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: hasTextRequest 
              ? `You are an AI prompt enhancer for FLUX image generation with TEXT RENDERING capabilities. 
              
CRITICAL TEXT RENDERING RULES:
1. Always extract the EXACT text user wants and put it in quotes like: text "EXACT WORDS HERE"
2. For Hindi/Devanagari text, romanize it properly: text "Happy Diwali" (not text "हैप्पी दिवाली")
3. Keep text SHORT - max 2-4 words for best clarity
4. Specify text style: bold typography, elegant font, modern sans-serif, calligraphy style
5. Describe text placement: centered at top, bottom banner, overlay on image
6. Add text effects: glowing text, shadow effect, gold metallic text, neon text

The enhanced prompt must be at least 120 words. Include:
- EXACT quoted text to render
- Text style and typography details
- Text color and effects (glow, shadow, 3D)
- Background/scene composition
- Lighting that complements the text
- Camera settings (8K resolution, sharp focus)
- Artistic style (photorealistic, cinematic)

Example: "Create a vibrant festival greeting with text "Happy Holi" in bold, colorful typography with paint splash effects, centered prominently..."

Respond only with the enhanced prompt, nothing else.`
              : `You are an AI prompt enhancer for FLUX image generation. Take the user's input (in any language) and enhance it to create a detailed, photorealistic description. The enhanced prompt must be at least 120 words long. Add specific details about: lighting (golden hour, studio lighting, natural light), camera settings (8K resolution, sharp focus, depth of field), artistic style (photorealistic, cinematic, professional photography), colors and textures, environment details, and mood. If there is conversation context about previous images, maintain style consistency. For portrait requests, specify facial features clearly. Respond only with the enhanced prompt, nothing else.`,
          },
          {
            role: 'user',
            content: contextPrompt + inputText,
          },
        ],
        max_tokens: 400, // Increased for text prompts
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0].message.content.trim();
    setInputText(enhancedPrompt);
  } catch (error) {
    Alert.alert('Error', 'Failed to enhance prompt. Please check your API key and try again.');
  } finally {
    setEnhancingPrompt(false);
  }
};
const MAX_CONTEXT_LENGTH = 10; 
const MAX_CONVERSATION_HISTORY = 20; 

const buildContextPromptForEnhancement = () => {
  if (conversationContext.length === 0) return '';

  let contextText = 'Previous images in this conversation:\n';
  
  // Get last 3 images for style reference
  const recentImages = conversationContext
    .filter(item => item.type === 'image')
    .slice(-3);

  if (recentImages.length > 0) {
    recentImages.forEach((item, idx) => {
      contextText += `Image ${idx + 1}: ${item.prompt.slice(0, 150)}\n`;
    });
    contextText += '\nIMPORTANT: Maintain the same visual style, color palette, lighting mood, and artistic approach as the previous images. ';
  }

  // Get recent prompts
  const recentPrompts = conversationContext
    .filter(item => item.type === 'prompt')
    .slice(-2);

  if (recentPrompts.length > 0) {
    contextText += '\nRecent requests: ';
    recentPrompts.forEach(item => {
      contextText += `"${item.text.slice(0, 100)}", `;
    });
  }
  
  contextText += '\n\nNow enhance this new prompt while keeping style consistency:\n';
  return contextText;
};
const buildContextPromptForGeneration = (promptText) => {
  let base = '';

  // Get last 3 images from context for style consistency
  const recentImages = conversationContext
    .filter(item => item.type === 'image')
    .slice(-3);

  if (editingImage) {
    // EDIT MODE: Strong reference to original
    base += `Based on the reference image, apply these modifications: ${promptText}. `;
    base += `IMPORTANT: Maintain the exact same subject, pose, composition, lighting style, and color palette as the reference image. Only change what was specifically requested. `;
  } else if (recentImages.length > 0) {
    // CONTINUATION MODE: Style consistency
    const lastImage = recentImages[recentImages.length - 1];
    base += `Continue in the same artistic style as the previous image. `;
    base += `Previous context: "${lastImage.prompt.slice(0, 100)}". `;
    base += `New request: ${promptText}. `;
    base += `Keep consistent: art style, color scheme, lighting mood, and visual aesthetic. `;
  } else {
    // NEW CHAT: Fresh start
    base += `${promptText}`;
  }

  return base.trim();
};


const savePrompt = async (promptText = inputText) => {
  if (!promptText.trim() || isLoading || !userData) return;

  // ✅ CHECK FOR EXPLICIT CONTENT FIRST (before any state changes)
  if (containsExplicitContent(promptText)) {
    const userMessage = {
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString(),
    };

    const rejectMessage = {
      role: 'assistant',
      content: "Bhai, yeh type ka content allowed nahi hai. Kuch aur try kar na! 🙏",
      timestamp: new Date().toISOString(),
    };
    
    const updatedMessages = [...messages, userMessage, rejectMessage];
    setMessages(updatedMessages);
    await saveChatToStorage(updatedMessages);
    setInputText('');
    return; // ✅ Return early - stops execution completely
  }
 const userMessage = {
    role: 'user',
    content: promptText,
    timestamp: new Date().toISOString(),
  };

  const messagesWithUser = [...messages, userMessage];
  setMessages(messagesWithUser);
  setInputText('');
  setConversationContext(prev => [...prev, { type: 'prompt', text: promptText }]);

  setIsLoading(true);
  setGeneratingImage(true);
  startProgressAnimation();

  const taskUUID = generateUUID();

  try {
    const finalPrompt = buildContextPromptForGeneration(promptText);
    const runwareImageUrl = await generateImageWithRunware(finalPrompt);

    if (runwareImageUrl) {
      // ✅ FIRST save to database (jo image download karke save karega)
      const saveResult = await saveChatToDatabase(
        promptText, 
        runwareImageUrl, // Runware URL bhejo
        currentChatId, 
        taskUUID
      );

      // ✅ USE SERVER SAVED URL (permanent URL)
      const permanentImageUrl = saveResult.savedImageUrl;
      
      console.log('🖼️ Runware URL:', runwareImageUrl);
      console.log('💾 Permanent URL:', permanentImageUrl);
      console.log('📤 Uploaded to server:', saveResult.uploadedToServer);

      // ✅ AsyncStorage mein bhi permanent URL save karo
      await saveImageToStorage(permanentImageUrl, promptText);

      const imageMessage = {
        role: 'assistant',
        content: permanentImageUrl, // ✅ Permanent URL use karo
        type: 'image',
        timestamp: new Date().toISOString(),
        prompt: promptText,
        model: 'runware:101@1',
        aspectRatio,
        taskUUID,
        reportId: saveResult.reportId || taskUUID,
        isReported: 0,
      };

      const updatedMessages = [...messagesWithUser, imageMessage];
      setMessages(updatedMessages);
      await saveChatToStorage(updatedMessages);

      const updatedContext = [
        ...conversationContext, 
        { type: 'image', url: permanentImageUrl, prompt: promptText }
      ];
      setConversationContext(updatedContext);
    }
  } catch (error) {
    console.error('❌ Image generation error:', error);
    
    const errorMessage = {
      role: 'assistant',
      content: 'Oops! Image generation failed. Please try again.',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
    setGeneratingImage(false);
    resetProgressAnimation();
  }
};


const initializeContextFromChat = (chatMessages) => {
  const context = [];
  
  chatMessages.slice(-MAX_CONVERSATION_HISTORY).forEach(message => {
    if (message.role === 'user') {
      context.push({
        type: 'prompt',
        text: message.content,
        timestamp: message.timestamp
      });
    } else if (message.type === 'image') {
      context.push({
        type: 'image',
        prompt: message.prompt,
        timestamp: message.timestamp
      });
    }
  });
  
  setConversationContext(context);
};

// Usage in your component - call this when loading existing chat
useEffect(() => {
  if (messages.length > 0 && conversationContext.length === 0) {
    initializeContextFromChat(messages);
  }
}, [messages]);


const generateImageWithRunware = async (prompt, referenceImageUrl = null) => {
  const taskUUID = generateUUID();
  const dimensions = getAspectRatioDimensions(aspectRatio);

  // Detect text rendering request
  const hasTextInPrompt = /text\s+"([^"]+)"/i.test(prompt);

  const payload = [
    { taskType: "authentication", apiKey: "run-ware-api-key" },
    {
      taskType: "imageInference",
      taskUUID,
      positivePrompt: prompt,
      width: dimensions.width,
      height: dimensions.height,
      model: 'runware:101@1',
      numberResults: 1,
      steps: hasTextInPrompt ? 40 : 35,  // More steps for text clarity
      CFGScale: hasTextInPrompt ? 4.5 : 4.0,  // Higher CFG for better text
      scheduler: 'FlowMatchEulerDiscreteScheduler',
    },
  ];

  // Add negative prompt for better text rendering
  if (hasTextInPrompt) {
    payload[1].negativePrompt = "blurry text, distorted letters, unreadable text, misspelled words, broken text, pixelated typography";
  }

  // Reference image handling for EDIT mode
  if (referenceImageUrl) {
    payload[1].seedImage = {
      type: "URL",
      URL: referenceImageUrl
    };
    payload[1].strength = 0.75;
    payload[1].controlnetModel = 'canny';
    payload[1].controlnetWeight = 0.8;
  }

  const response = await fetch("https://api.runware.ai/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Runware API error:", response.status, errorText);
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  if (result?.data?.[0]?.imageURL) {
    return result.data[0].imageURL;
  }
  throw new Error("No imageURL in response");
};
  const handleEditImage = (imageMessage) => {
    setEditingImage({
      url: imageMessage.content,
      prompt: imageMessage.prompt,
    });
    setInputText('');
    textareaRef.current?.focus();
  };

  const cancelEditMode = () => {
    setEditingImage(null);
    setInputText('');
  };

  const startProgressAnimation = () => {
    setImageProgress(0);
    progressAnimation.setValue(0);

    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: 15000,
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setImageProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 10;
      });
    }, 1000);
  };

  const resetProgressAnimation = () => {
    progressAnimation.setValue(0);
    setImageProgress(0);
  };

 const downloadImage = async (imageUrl) => {
  try {
    const fileName = `broai_${Date.now()}.jpg`;
    
    let downloadDest;

    if (Platform.Version >= 29) { // Android 10+
      // Direct Downloads folder access without any permission
      downloadDest = `${RNFS.DownloadDirectoryPath}/${fileName}`;
    } else {
      // Only for very old devices
      downloadDest = `${RNFS.ExternalStorageDirectoryPath}/Download/${fileName}`;
    }

    const result = await RNFS.downloadFile({
      fromUrl: imageUrl,
      toFile: downloadDest,
      background: true, // Android 13+ ke liye better hai
    }).promise;

    if (result.statusCode === 200) {
      // Optional: Refresh gallery
      if (Platform.OS === 'android') {
        await RNFS.scanFile(downloadDest);
      }
      Alert.alert('Downloaded ✅', `Saved as ${fileName} in Downloads`);
    } else {
      throw new Error('Bad status code');
    }
  } catch (error) {
    console.log('Download error:', error);
    Alert.alert('Failed', 'Could not download image');
  }
};

  const saveImageToStorage = async (imageUrl, prompt) => {
    try {
      const imageData = {
        id: `image_${Date.now()}`,
        url: imageUrl,
        prompt: prompt,
        timestamp: new Date().toISOString(),
        chatId: currentChatId,
        model: 'runware:101@1',
      };

      await AsyncStorage.setItem(imageData.id, JSON.stringify(imageData));

      const existingImages = await AsyncStorage.getItem('savedImages');
      let images = existingImages ? JSON.parse(existingImages) : [];
      images.unshift(imageData);

      images = images.slice(0, 100);

      await AsyncStorage.setItem('savedImages', JSON.stringify(images));
    } catch (error) { }
  };
navigateToAssign
  const navigateToDashboard = () => {
    setSidebarOpen(false);
    navigation.navigate('Home');
  };
  const navigateToAssign = () => {
    setSidebarOpen(false);
    navigation.navigate('Assignment');
  };
  const navigateToGallery = () => {
    setSidebarOpen(false);
    navigation.navigate('Gallery');
  };
  const startNewChat = () => {
    setMessages([]);
    setConversationContext([]);
    generateChatId();
    setSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
      setConversationContext([]);
  setInputText('');
  setEditingImage(null);
  };



const ShareImage = async (
  imageUrl,
  customText = "📸 Photo Generated by Bro Ai\nDownload: https://play.google.com/store/apps/details?id=com.broai"
) => {
  try {
    // Extract filename from URL
    const filename = imageUrl.split('/').pop() || 'shared_image.jpg';

    // Define local path
    const localPath = `${RNFS.CachesDirectoryPath}/${filename}`;

    // Download image
    console.log('Downloading image...');
    const downloadResult = await RNFS.downloadFile({
      fromUrl: imageUrl,
      toFile: localPath,
    }).promise;

    if (downloadResult.statusCode === 200) {
      console.log('Image downloaded successfully:', localPath);

      // Share options
      const shareOptions = {
        title: 'Share Image',
        message: customText,
        url: Platform.OS === 'android' ? `file://${localPath}` : localPath,
        type: 'image/jpeg',
      };

      // Open share dialog
      await Share.open(shareOptions);

      // Optional cleanup
      // await RNFS.unlink(localPath);
    } else {
      throw new Error('Failed to download image');
    }
  } catch (error) {
    console.error('Error sharing image:', error);
    Alert.alert('Error', 'Failed to share the image. Please try again.');
  }
};
  const sidebarWidth = sidebarAnimatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Dimensions.get('window').width * 0.8],
  });

  if (isInitialLoad) {
     return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
     
        <View style={styles.mainContainer}>
          <TokenWalletModal
            visible={isWalletVisible}
            onClose={() => setIsWalletVisible(false)}
          />
          <Animated.View 
  style={[
    styles.sidebar, 
    { 
      width: Dimensions.get('window').width * 0.8,
      transform: [{ translateX: sidebarTranslateX }] 
    }
  ]}
>
            <View style={styles.sidebarHeader}>
              <TouchableOpacity
                onPress={() => setSidebarSearchTerm('')}
                style={styles.sidebarSearchContainer}
              >
                <SearchIcon />
                <TextInput
                  value={sidebarSearchTerm}
                  onChangeText={setSidebarSearchTerm}
                  placeholder="Search chats..."
                  style={styles.sidebarSearchInput}
                  placeholderTextColor="#666666"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={startNewChat}
              style={styles.newChatButtonSidebar}
            >
              <View style={styles.newChatButtonIcon}>
                <PlusIcon />
              </View>
              <Text style={styles.newChatButtonText}>Image</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={navigateToDashboard}
              style={styles.dashboardButton}
            >
              <View style={styles.dashboardButtonIcon}>
                <PlusIcons />
              </View>
              <Text style={styles.dashboardButtonText}>Chat</Text>
            </TouchableOpacity>
<TouchableOpacity
              onPress={navigateToAssign}
              style={styles.dashboardButton}
            >
              <View style={styles.dashboardButtonIcon}>
                <PlusIcons />
              </View>
              <Text style={styles.dashboardButtonText}>Assignment</Text>
            </TouchableOpacity>
            <ScrollView style={styles.chatHistoryContainer}>
              {chatHistory
                .filter(chat =>
                  chat.title.toLowerCase().includes(sidebarSearchTerm.toLowerCase())
                )
                .map(chat => (
                  <TouchableOpacity
                    key={chat.id}
                    onPress={() => selectChat(chat.id)}
                    style={[
                      styles.chatItem,
                      chat.id === currentChatId && styles.selectedChatItem,
                    ]}
                  >
                   
                    <View style={styles.chatItemDetails}>
                      <Text style={styles.chatItemTitle} numberOfLines={1}>
                        {chat.title}
                      </Text>
                     
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
             <TouchableOpacity
              onPress={navigateToGallery}
              style={styles.dashboardButtons}
            >
              <View style={styles.dashboardButtonIcon}>
                <GalleryIcons />
              </View>
              <Text style={styles.dashboardButtonTexts}>Gallery</Text>
            </TouchableOpacity>
           
            <TouchableOpacity
              onPress={() => setIsWalletVisible(true)}
            >
              <View style={styles.userInfoContainer}>
                <View style={styles.userInfoIcon}>
                   <Image source={require('./assets/logo.png')} style={{ width: 46, height: 46}} />
                </View>
                <View style={styles.userInfoDetails}>
                  <Text style={styles.userInfoName} numberOfLines={1}>
                    {userData?.displayName || 'User'}
                  </Text>
                  <Text style={styles.userInfoEmail} numberOfLines={1}>
                    {userData?.email || 'email@example.com'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
                  <MenuIcon />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Imagine</Text>
              </View>
              <View style={styles.aspectRatioContainer}>
                {['9:16', '1:1', '16:9'].map((ratio) => (
                  <TouchableOpacity
                    key={ratio}
                    onPress={() => setAspectRatio(ratio)}
                    style={[
                      styles.aspectRatioButton,
                      aspectRatio === ratio && styles.aspectRatioButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.aspectRatioButtonText,
                        aspectRatio === ratio && styles.aspectRatioButtonTextActive,
                      ]}
                    >
                      {ratio}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
 <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 40}
      > 
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
             {messages.length === 0 ? (
  <View style={styles.emptyChatContainer}>
    <Animated.Text style={[styles.emptyChatTitle, { opacity: progressAnimation }]}>
      {/* Your existing title content */}
    </Animated.Text>
    
    {quickPrompts.length > 0 && (
      <View style={styles.quickPromptContainer}>
        <Text style={styles.quickPromptTitle}>Suggested Prompts for Tomorrow</Text>
        
        {/* Centered Grid Layout */}
        <View style={styles.quickPromptGrid}>
          {quickPrompts.map((prompt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickPromptButton}
              onPress={() => selectQuickPrompt(prompt.prompt)}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.quickPromptEnglish}>{prompt.english}</Text>
                
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )}
  </View>
) : (
                <View style={styles.messagesList}>
                {messages.map((item, index) => (
  <View
    key={index}
    style={[
      styles.messageContainer,
      item.role === 'user' ? styles.userMessageContainer : styles.aiMessageContainer,
    ]}
  >
    {/* USER MESSAGE */}
    {item.role === 'user' && (
      <View style={styles.messageBubble}>
        <Text style={styles.messageText}>{item.content}</Text>
        <View style={styles.messageFooter}>
          <TouchableOpacity
            onPress={() => HandleCopy(item.content)}
            style={styles.regenerateButton}
          >
            <CopyIcon />
          </TouchableOpacity>
        </View>
      </View>
    )}

    {/* AI MESSAGE - TEXT */}
    {item.role === 'assistant' && !item.type && (
      <View style={styles.messageBubble}>
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    )}

    {/* AI MESSAGE - IMAGE */}
    {item.role === 'assistant' && item.type === 'image' && (
      <View style={styles.imageContainer}>
        {!item.isReported ? (
          <>
            <TouchableOpacity
              onPress={() => setSelectedImageModal(item)}
              style={styles.imageWrapper}
            >
              <Image
                source={{ uri: item.content }}
                style={styles.generatedImage}
                resizeMode="cover"
              />
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.imageActions}>
              {/* <TouchableOpacity
                onPress={() => handleEditImage(item)}
                style={[styles.actionButton, { backgroundColor: 'black' }]}
              >
                <EditIcon color="white" />
              </TouchableOpacity> */}

              <TouchableOpacity
                onPress={() => downloadImage(item.content)}
                style={[styles.actionButton]}
              >
                <DownloadIcon />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => ShareImage(
                  item.content,
                  "Photo Generated by Bro AI\nDownload: https://play.google.com/store/apps/details?id=com.broai"
                )}
                style={[styles.actionButton]}
              >
                <ShareIcon/>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Report', { 
                  item, 
                  reportType: 'post', 
                  timestamp: Date.now(),
                  reportId: item.reportId || item.taskUUID
                })}
                style={[styles.actionButton]}
              >
                <Reporting  />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.reportedContentContainer}>
            <Image
              source={{ uri: item.content }}
              style={[styles.generatedImage, styles.blurredImage]}
              resizeMode="cover"
            />
            <View style={styles.reportedOverlay}>
              <Text style={styles.reportedText}>⚠️ REPORTED</Text>
              <Text style={styles.reportedSubText}>This content has been reported</Text>
            </View>
          </View>
        )}
      </View>
    )}
  </View>
))}

                  {generatingImage && (
                    <View style={styles.loadingContainer}>
                      {/* <View style={styles.generatingBubble}>
                        <View style={styles.generatingHeader}>
                          <ActivityIndicator color="#FF6B00" size="small" />
                          <Text style={styles.generatingText}>Generating Image...</Text>
                        </View>
                        <View style={styles.progressContainer}>
                          <View style={styles.progressBar}>
                            <Animated.View
                              style={[
                                styles.progressFill,
                                {
                                  width: progressAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%'],
                                  }),
                                },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>{Math.round(imageProgress)}%</Text>
                        </View>
                        <View style={styles.imagePlaceholder}>
                          <ActivityIndicator color="#FF6B00" size="large" />
                          <Text style={styles.placeholderText}>Creating your masterpiece...</Text>
                        </View>
                      </View> */}
                  <MiniLoader />
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            {editingImage && (
              <View style={styles.editModeBar}>
                <View style={styles.editModeContent}>
                  <Image
                    source={{ uri: editingImage.url }}
                    style={styles.editModeThumbnail}
                  />
                  <View style={styles.editModeText}>
                    <Text style={styles.editModeTitle}>Editing Image</Text>
                    <Text style={styles.editModePrompt} numberOfLines={2}>
                      {editingImage.prompt}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={cancelEditMode}>
                  <CloseIcon />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textareaRef}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={editingImage ? "Describe how to modify the image..." : "Imagine anything"}
                  style={styles.inputText}
                  multiline={true}
                  editable={!isLoading && !generatingImage && !enhancingPrompt}
                  placeholderTextColor="#666666"
                />
                <TouchableOpacity
                  onPress={enhancePrompt}
                  disabled={!inputText.trim() || isLoading || generatingImage || enhancingPrompt}
                  style={[
                    styles.enhanceButton,
                    (!inputText.trim() || isLoading || generatingImage || enhancingPrompt) && styles.disabledEnhanceButton,
                  ]}
                >
                  {enhancingPrompt ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <StarIcon />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => savePrompt()}
                  disabled={!inputText.trim() || isLoading || generatingImage || enhancingPrompt}
                  style={[
                    styles.sendButton,
                    (!inputText.trim() || isLoading || generatingImage || enhancingPrompt) && styles.disabledSendButton,
                  ]}
                >
                  <SendIcon />
                </TouchableOpacity>
              </View>
            </View></KeyboardAvoidingView>
          </View>
        </View>
     

      <Modal
  visible={selectedImageModal !== null}
  transparent={true}
  animationType="fade"
  onRequestClose={() => {
    setSelectedImageModal(null);
  }}
>
  <View style={styles.fullImageModalOverlay}>




    {selectedImageModal && (
      <ImageViewer
        imageUrls={[{ url: selectedImageModal.content }]}
        enableImageZoom={true}
        enableSwipeDown={true}
        onSwipeDown={() => setSelectedImageModal(null)}
        swipeDownThreshold={100}
        flipThreshold={100}
        maxOverflow={0}
        renderHeader={() => null} // Hide default header since we have custom buttons
        saveToLocalByLongPress={false}
        style={styles.imageViewer}
        enablePreload={true}
        onChange={(index) => {}}
        onClick={() => setSelectedImageModal(null)} // Optional: close on click
        renderIndicator={() => null} // Hide indicator for single image
        footerContainerStyle={{ width: '100%', position: 'absolute', bottom: 40 }}
        renderFooter={() => (
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => downloadImage(selectedImageModal.content)} // Direct URL pass kar (tera function already item.content expect karta hai)
            >
              <DownloadIcon />
              <Text style={styles.actionBtnText}>Download</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionBtn} 
              onPress={() => ShareImage(
                selectedImageModal.content,
                "Photo Generated by Bro AI\nDownload: https://play.google.com/store/apps/details?id=com.broai"
              )}
            >
              <ShareIcon />
              <Text style={styles.actionBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    )}
  </View>
</Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  actionBtn: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#00000080', // Semi-transparent black for better contrast on image
  paddingVertical: 14,
  borderRadius: 12,
  gap: 8,
},
actionBtnText: {
  color: '#FFF',
  fontSize: 15,
  fontWeight: '600',
},modalActions: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  gap: 12,
  paddingHorizontal: 20,
  marginBottom: 20, // iPhone notch se bachne ke liye
},
    fullImageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  downloadButton: {
    width: '50%',
    zIndex: 1000,
    borderRadius: 20,
    padding: 10,
  },
  imageViewer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  editModeBar: {
    backgroundColor: '#1E1E1E',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#FF6B00',
  },
  editModeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  editModeThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  editModeText: {
    flex: 1,
  },
  editModeTitle: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '600',
  },
  editModePrompt: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 2,
  },
  editContextText: {
    color: '#FF6B00',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  aspectRatioContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  aspectRatioButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectRatioButtonActive: {
    backgroundColor: '#202020ff',
    borderColor: '#979492ff',
  },
  aspectRatioButtonText: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '600',
  },
  aspectRatioButtonTextActive: {
    color: '#FFFFFF',
  },
  blurredImage: {
    opacity: 0.6,
  },

  reportedOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 10,
  },
  reportedText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  disabledActionButton: {
    opacity: 0.5,
  },
suggestionCardLoading: {
  backgroundColor: '#1a1a1a',
  borderColor: '#333',
  opacity: 0.6,
},
skeletonTitle: {
  height: 20,
  width: '65%',
  backgroundColor: '#333',
  borderRadius: 6,
  marginBottom: 10,
},
skeletonLine: {
  height: 14,
  backgroundColor: '#2a2a2a',
  borderRadius: 4,
  marginBottom: 8,
},
skeletonLineShort: {
  height: 14,
  width: '80%',
  backgroundColor: '#2a2a2a',
  borderRadius: 4,
  marginBottom: 8,
},
  reportedButton: {
    backgroundColor: '#ff4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  reportedButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  fullImageScrollContainer: {
    flex: 1,
  },
  fullImageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B00',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    borderRightWidth: 1,
    borderRightColor: '#E5E5E7',
    
    elevation: 5,
  },
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 999,
  },
  sidebarHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  sidebarSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  suggestionCardLoading: {
    backgroundColor: '#1e1e1e',
    borderColor: '#333',
    opacity: 0.7,
  },
  skeletonTitle: {
    height: 18,
    width: '70%',
    backgroundColor: '#333',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonLineShort: {
    height: 12,
    width: '85%',
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginBottom: 6,
  },
  sidebarSearchInput: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
  },
  chatHistoryContainer: {
    flex: 1,
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    marginBottom: 8,
  },
  selectedChatItem: {
    backgroundColor: '#f3f3f3',
  },

  chatItemDetails: {
    flex: 1,
  },
  chatItemTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  chatItemTimestamp: {
    color: '#666666',
    fontSize: 12,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
   dashboardButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginBottom: 10,
  },
  dashboardButtonIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '400',
  },
    dashboardButtonTexts: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '500',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '400',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F8FAFD',
  },
  userInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoIconText: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfoDetails: {
    flex: 1,
  },
  userInfoName: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  
suggestionContainer: {
  maxWidth: '85%',
  backgroundColor: '#F8FAFD',
  borderRadius: 18,
  padding: 16,
  borderLeftWidth: 4,
  borderLeftColor: '#FF6B00',
},
suggestionsGrid: {
  gap: 12,
  marginTop: 16,
},
suggestionCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 14,
  borderWidth: 2,
  borderColor: '#E5E5E7',
  justifyContent: 'space-between',
  minHeight: 140,
},
suggestionCardSelected: {
  borderColor: '#FF6B00',
  backgroundColor: '#FFF8F3',
},
suggestionCardDisabled: {
  opacity: 0.6,
},
suggestionTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: '#FF6B00',
  marginBottom: 8,
},
suggestionPreview: {
  fontSize: 13,
  color: '#333333',
  lineHeight: 19,
  flex: 1,
},
suggestionFooter: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  marginTop: 10,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: '#F0F0F0',
},
selectText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#FF6B00',
},
  userInfoEmail: {
    color: '#666666',
    fontSize: 12,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 0,
  },
  header: {
    backgroundColor: '#F8FAFD',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
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
    padding: 12
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
 emptyChatContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  quickPromptContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 30,
  },
  quickPromptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  quickPromptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  quickPromptButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 20,
    minWidth: 200,
    maxWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  buttonContent: {
    alignItems: 'center',
  },
  quickPromptEnglish: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  quickPromptHindi: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  messageContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    borderTopRightRadius: 4,
  },
  imageContainer: {
    maxWidth: '85%',
    alignItems: 'flex-start',
    
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  generatedImage: {
    width: 280,
    height: 280,
    backgroundColor: '#F2F2F7',
  },
  imageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 16,
    marginStart: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledActionButton: {
    backgroundColor: '#E5E5E7',
    opacity: 0.5,
  },
  imageTimestamp: {
    color: '#666666',
    fontSize: 12,
  },
  regenerateButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#181818ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  fullImageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1001,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 12,
    width: 25,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1001,
    borderRadius: 25,
    padding: 12,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    maxWidth: '100%',
    maxHeight: '100%',
  },
  messageText: {
    color: '#2b2b2bff',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '300',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  messageTimestamp: {
    color: '#666666',
    fontSize: 12,
    opacity: 0.7,
  },
  loadingContainer: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  generatingBubble: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 4,
    maxWidth: '85%',
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  generatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  generatingText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E5E7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
  },
  imagePlaceholder: {
    height: 200,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
   backgroundColor: '#F8FAFD',

    padding: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 13,
    paddingVertical: 6,
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    color: '#000000',
    padding: 6,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledSendButton: {
    opacity: 0.7,
  },
  enhanceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  disabledEnhanceButton: {
    opacity: 0.7,
  },
});

export default ImageScreen;