import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
  PermissionsAndroid,
  Dimensions,
  StatusBar,
  FlatList,
} from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MiniLoader from './miniloader';
import { SafeAreaView } from 'react-native-safe-area-context';
import FastImage from "@d11/react-native-fast-image";

const { width, height } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 24) / 2;
const INITIAL_LOAD = 20;
const PAGE_SIZE = 20;

// Aspect ratio configurations
const ASPECT_RATIOS = {
  '9:16': { width: 576, height: 1152, ratio: 0.5625 }, // 9/16
  '1:1': { width: 512, height: 512, ratio: 1 },
  '16:9': { width: 1152, height: 576, ratio: 1.7778 }, // 16/9
};

const DownloadIcon = () => (
  <Image
    source={require('./assets/download.png')}
    style={{ width: 16, height: 16, tintColor: '#FFF' }}
  />
);

const ShareIcon = () => (
  <Image
    source={require('./assets/share.png')}
    style={{ width: 16, height: 16, tintColor: '#FFF' }}
  />
);

const GalleryScreen = ({ navigation }) => {
  const [fullGalleryData, setFullGalleryData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [loadingImages, setLoadingImages] = useState(new Set());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({});
  const [selectedRatio, setSelectedRatio] = useState(null); // Instead of '1:1'
  const isLandscapeFilter = selectedRatio === '16:9';
  const numCols = isLandscapeFilter ? 1 : 2;
  const flatListRef = useRef(null);
  const hasMoreData = useRef(true);
  const downloadingRef = useRef(new Set());
const getColumnWidth = () => {
    if (isLandscapeFilter) {
      return width - 24; // full width with side padding
    }
    return COLUMN_WIDTH;
  };
  // Get aspect ratio tolerance for matching
  const getAspectRatioCategory = useCallback((imgWidth, imgHeight) => {
const imageRatio = imgWidth / imgHeight; // width ÷ height

    const ratios = {
      '9:16': { min: 0.5, max: 0.7, target: 0.5625 },     // portrait
      '1:1':  { min: 0.85, max: 1.15, target: 1.0 },
      '16:9': { min: 1.5, max: 2.0, target: 1.7778 },      // landscape - loosened
    };

    for (const [key, config] of Object.entries(ratios)) {
      if (imageRatio >= config.min && imageRatio <= config.max) {
        return key;
      }
    }
    return null;
  }, []);

  // Calculate dynamic height based on actual image aspect ratio
  const getImageHeight = useCallback((imageUrl) => {
    if (imageDimensions[imageUrl]) {
      const { width: imgWidth, height: imgHeight } = imageDimensions[imageUrl];
      const aspectRatio = imgHeight / imgWidth;
      return COLUMN_WIDTH * aspectRatio;
    }
    return COLUMN_WIDTH; // Default square
  }, [imageDimensions]);

  // Load image dimensions with debounce
  const loadImageDimensions = useCallback((imageUrl) => {
    if (imageDimensions[imageUrl]) return;

    Image.getSize(
      imageUrl,
      (imgWidth, imgHeight) => {
        const ratio = imgWidth / imgHeight;
        console.log(`📐 Image size: ${imgWidth}x${imgHeight} = ${ratio.toFixed(3)}`);
        
        setImageDimensions(prev => ({
          ...prev,
          [imageUrl]: { width: imgWidth, height: imgHeight }
        }));
      },
      (error) => {
        console.log('Failed to get image size:', error);
        setImageDimensions(prev => ({
          ...prev,
          [imageUrl]: { width: 512, height: 512 }
        }));
      }
    );
  }, [imageDimensions]);

  // Download image locally for faster loading
  const downloadImageLocally = useCallback(async (imageUrl, imageName) => {
    try {
      const localPath = `${RNFS.DocumentDirectoryPath}/gallery/${imageName}`;
      
      const fileExists = await RNFS.exists(localPath);
      if (fileExists) return localPath;

      if (downloadingRef.current.has(imageName)) return null;

      downloadingRef.current.add(imageName);

      const dirPath = `${RNFS.DocumentDirectoryPath}/gallery`;
      const dirExists = await RNFS.exists(dirPath);
      if (!dirExists) await RNFS.mkdir(dirPath);

      const result = await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: localPath,
        progressDivider: 1,
        connectionTimeout: 10000,
        readTimeout: 10000,
      }).promise;

      downloadingRef.current.delete(imageName);

      if (result.statusCode === 200) return localPath;
      return null;
    } catch (error) {
      console.log('Download error:', error);
      downloadingRef.current.delete(imageName);
      return null;
    }
  }, []);

  // Filter data by aspect ratio
  const filterByAspectRatio = useCallback((data, ratio) => {
    if (!ratio) return data;

    const filtered = data.filter(item => {
      const dims = imageDimensions[item.image_url];
      if (!ratio || !dims) return true; // Show everything when no filter or no dimensions
      
      const category = getAspectRatioCategory(dims.width, dims.height);
      const imageRatio = dims.width / dims.height;
      
      // Debug logging
      if (category === ratio) {
        console.log(`✅ Match ${ratio}: ${dims.width}x${dims.height} (${imageRatio.toFixed(3)})`);
      }
      
      return category === ratio;
    });
    
    console.log(`Filter ${ratio}: Found ${filtered.length} images out of ${data.length}`);
    return filtered;
  }, [imageDimensions, getAspectRatioCategory]);

  // Update filtered data when ratio changes or dimensions are loaded
  useEffect(() => {
    // Wait for dimensions to be loaded
    const dimensionsLoaded = fullGalleryData.every(item => 
      imageDimensions[item.image_url] !== undefined
    );
    
    if (!dimensionsLoaded && fullGalleryData.length > 0) {
      console.log('⏳ Waiting for dimensions to load...');
      return;
    }
    
    const filtered = filterByAspectRatio(fullGalleryData, selectedRatio);
    console.log(`🔍 Filtering by ${selectedRatio || 'all'}: ${filtered.length} images`);
    
    setFilteredData(filtered);
    setDisplayedData(filtered.slice(0, INITIAL_LOAD));
    hasMoreData.current = filtered.length > INITIAL_LOAD;
  }, [selectedRatio, fullGalleryData, filterByAspectRatio, imageDimensions]);

  // Fetch gallery data from API
  const fetchGalleryData = useCallback(async (useCache = true) => {
    const cacheKey = 'simpleGalleryData_v1';
    const timestampKey = 'simpleGalleryTimestamp_v1';
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    
    try {
      setLoading(true);
      setError(null);

      // Try cache first
      if (useCache) {
        const cachedData = await AsyncStorage.getItem(cacheKey);
        const cacheTimestamp = await AsyncStorage.getItem(timestampKey);
        
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            if (parsedData && parsedData.length > 0) {
              setFullGalleryData(parsedData);
              const filtered = filterByAspectRatio(parsedData, selectedRatio);
              setFilteredData(filtered);
              setDisplayedData(filtered.slice(0, INITIAL_LOAD));
              hasMoreData.current = filtered.length > INITIAL_LOAD;
              setLoading(false);
              console.log('✅ Loaded from cache:', parsedData.length, 'images');

              // Load dimensions for ALL items to enable filtering
              console.log('📐 Loading dimensions for all images...');
              parsedData.forEach(item => {
                loadImageDimensions(item.image_url);
              });

              // Download first batch in background
              setTimeout(() => downloadVisibleImages(parsedData.slice(0, 10)), 500);

              // Check if cache is fresh
              if (cacheTimestamp) {
                const cacheAge = Date.now() - parseInt(cacheTimestamp);
                if (cacheAge < CACHE_DURATION) {
                  return;
                }
              }
            }
          } catch (parseError) {
            console.error('Cache parse error:', parseError);
            await AsyncStorage.removeItem(cacheKey);
          }
        }
      }

      // Fetch from API
      console.log('📡 Fetching from API...');
      const response = await fetch('api/gallery.php', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Response:', data.status, '- Total:', data.total_images);

      if (data.status === 'success' && data.data && Array.isArray(data.data)) {
        const processedData = data.data.map((item, index) => ({
          id: `img_${index}_${Date.now()}`,
          image_url: item.image_url || item.full_path,
          filename: item.filename,
        }));

        if (processedData.length === 0) {
          throw new Error('No images found');
        }

        console.log('✅ Processed images:', processedData.length);
        
        setFullGalleryData(processedData);
        const filtered = filterByAspectRatio(processedData, selectedRatio);
        setFilteredData(filtered);
        setDisplayedData(filtered.slice(0, INITIAL_LOAD));
        hasMoreData.current = filtered.length > INITIAL_LOAD;

        // Load dimensions for ALL items to enable filtering
        console.log('📐 Loading dimensions for all images...');
        processedData.forEach(item => {
          loadImageDimensions(item.image_url);
        });

        // Save to cache
        await AsyncStorage.setItem(cacheKey, JSON.stringify(processedData));
        await AsyncStorage.setItem(timestampKey, Date.now().toString());
        console.log('✅ Saved to cache');

        // Download first batch
        downloadVisibleImages(processedData.slice(0, 10));
      } else {
        throw new Error(data.message || 'Invalid response from server');
      }
    } catch (err) {
      console.error('❌ Fetch error:', err.message);
      
      if (displayedData.length > 0) {
        setError('Using cached data');
      } else {
        setError('Unable to load images. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [displayedData.length, loadImageDimensions, selectedRatio, filterByAspectRatio]);

  // Download visible images in batches
  const downloadVisibleImages = useCallback(async (data) => {
    if (!data || data.length === 0) return;

    const batchSize = 3;
    
    try {
      for (let i = 0; i < Math.min(data.length, 12); i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const downloadPromises = batch.map(item => {
          try {
            if (item.filename && item.image_url) {
              return downloadImageLocally(item.image_url, item.filename);
            }
            return Promise.resolve(null);
          } catch (error) {
            console.log('Item download error:', error);
            return Promise.resolve(null);
          }
        });

        await Promise.allSettled(downloadPromises);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (error) {
      console.log('Download batch error:', error);
    }
  }, [downloadImageLocally]);

  useEffect(() => {
    fetchGalleryData(true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGalleryData(false);
  }, [fetchGalleryData]);

  const loadMoreData = useCallback(() => {
    if (isLoadingMore || !hasMoreData.current || displayedData.length === 0) return;
    
    const currentLength = displayedData.length;
    if (currentLength >= filteredData.length) {
      hasMoreData.current = false;
      return;
    }

    setIsLoadingMore(true);
    
    requestAnimationFrame(() => {
      try {
        const nextBatch = filteredData.slice(
          currentLength, 
          Math.min(currentLength + PAGE_SIZE, filteredData.length)
        );
        
        if (nextBatch.length === 0) {
          hasMoreData.current = false;
          setIsLoadingMore(false);
          return;
        }

        const newDisplayedData = [...displayedData, ...nextBatch];
        setDisplayedData(newDisplayedData);
        hasMoreData.current = newDisplayedData.length < filteredData.length;
        setIsLoadingMore(false);

        // Load dimensions for new batch
        nextBatch.forEach(item => {
          if (item.image_url) {
            loadImageDimensions(item.image_url);
          }
        });
        
        // Download next batch
        downloadVisibleImages(nextBatch.slice(0, 6));
        
        console.log(`📦 Loaded ${nextBatch.length} more items (${newDisplayedData.length}/${filteredData.length})`);
      } catch (error) {
        console.error('Load more error:', error);
        setIsLoadingMore(false);
      }
    });
  }, [displayedData, filteredData, isLoadingMore, downloadVisibleImages, loadImageDimensions]);

  const handleImageLoadStart = useCallback((id) => {
    setLoadingImages(prev => new Set([...prev, id]));
  }, []);

  const handleImageLoadEnd = useCallback((id) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const renderMasonryItem = useCallback(({ item, index }) => {
    if (!item || !item.image_url) return null;

    const imageId = item.id;
    const isLoading = loadingImages.has(imageId);
    const itemHeight = getImageHeight(item.image_url);
    const colWidth = getColumnWidth();

    return (
      <TouchableOpacity
        style={[styles.masonryItem, { width: colWidth, marginBottom: 12,marginHorizontal: isLandscapeFilter ? 12 : 6, }]}
        onPress={() => openModal(item)}
        activeOpacity={0.9}
      >
        <FastImage
          source={{ 
            uri: item.image_url,
            priority: FastImage.priority.normal,
            cache: FastImage.cacheControl.immutable,
          }}
          defaultSource={require('./assets/image.png')}
          style={[styles.masonryImage, { height: isLandscapeFilter ? 200 : itemHeight,  }]}
          resizeMode="cover"
          onLoadStart={() => handleImageLoadStart(imageId)}
          onLoadEnd={() => handleImageLoadEnd(imageId)}
          onError={() => {
            console.log('Image load failed:', item.filename);
            handleImageLoadEnd(imageId);
          }}
        />
        {isLoading && (
          <View style={styles.imageLoader}>
            <ActivityIndicator size="small" color="#000" />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [loadingImages, getImageHeight, handleImageLoadStart, handleImageLoadEnd]);

  const renderFooter = useCallback(() => {
    if (displayedData.length === 0) return null;
    
    if (!hasMoreData.current) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>All images loaded 🎉</Text>
        </View>
      );
    }

    return null;
  }, [displayedData.length]);

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const downloadImage = async (filename, imageUrl) => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Storage permission is required to download images.');
        return;
      }

      // Try local path first
      const localPath = `${RNFS.DocumentDirectoryPath}/gallery/${filename}`;
      const localExists = await RNFS.exists(localPath);

      let sourcePath = localPath;
      
      // If not cached locally, download first
      if (!localExists) {
        console.log('Downloading image first...');
        const downloadedPath = await downloadImageLocally(imageUrl, filename);
        if (!downloadedPath) {
          Alert.alert('Error', 'Failed to download image.');
          return;
        }
        sourcePath = downloadedPath;
      }

      const saveFileName = `broai_${Date.now()}.jpg`;
      const downloadDest = `${RNFS.DownloadDirectoryPath}/${saveFileName}`;
      
      await RNFS.copyFile(sourcePath, downloadDest);
      Alert.alert('Success', `Saved to Downloads as ${saveFileName}`);
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download image.');
    }
  };

  const shareImage = async (filename, imageUrl) => {
    try {
      // Try local path first
      const localPath = `${RNFS.DocumentDirectoryPath}/gallery/${filename}`;
      const localExists = await RNFS.exists(localPath);

      let sharePath = localPath;

      // If not cached locally, download first
      if (!localExists) {
        console.log('Downloading image first...');
        const downloadedPath = await downloadImageLocally(imageUrl, filename);
        if (!downloadedPath) {
          Alert.alert('Error', 'Failed to load image for sharing.');
          return;
        }
        sharePath = downloadedPath;
      }

      await Share.open({
        title: 'Share Image',
        message: '📸 Generated by Bro AI',
        url: `file://${sharePath}`,
        type: 'image/jpeg',
      });
    } catch (error) {
      if (error.message !== 'User did not share') {
        console.error('Share error:', error);
        Alert.alert('Error', 'Failed to share image.');
      }
    }
  };

  const openModal = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const handleGenerateYours = () => {
    navigation.navigate('ImageScreen');
  };

  const handleRatioToggle = (ratio) => {
    if (selectedRatio === ratio) {
    return; // do nothing
  }

  // Naya ratio select karo
  setSelectedRatio(ratio);
  };

  if (loading && displayedData.length === 0) {
    return (
      <View style={styles.centered}>
        <MiniLoader />
        <Text style={styles.loadingText}>Loading gallery...</Text>
      </View>
    );
  }

  if (error && displayedData.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => fetchGalleryData(false)}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Gallery</Text>
           
          </View>
          
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterBtn,
                selectedRatio === '9:16' && styles.filterBtnActive
              ]}
              onPress={() => handleRatioToggle('9:16')}
            >
              <Text style={[
                styles.filterBtnText,
                selectedRatio === '9:16' && styles.filterBtnTextActive
              ]}>9:16</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterBtn,
                selectedRatio === '1:1' && styles.filterBtnActive
              ]}
              onPress={() => handleRatioToggle('1:1')}
            >
              <Text style={[
                styles.filterBtnText,
                selectedRatio === '1:1' && styles.filterBtnTextActive
              ]}>1:1</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.filterBtn,
                selectedRatio === '16:9' && styles.filterBtnActive
              ]}
              onPress={() => handleRatioToggle('16:9')}
            >
              <Text style={[
                styles.filterBtnText,
                selectedRatio === '16:9' && styles.filterBtnTextActive
              ]}>16:9</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={displayedData}
          renderItem={renderMasonryItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          onEndReached={() => {
            if (!isLoadingMore && hasMoreData.current) {
              loadMoreData();
            }
          }}
          onEndReachedThreshold={0.5}
          scrollEventThrottle={400}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={100}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#000"
            />
          }
          ListFooterComponent={renderFooter()}
          ListEmptyComponent={
            displayedData.length === 0 && !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  {selectedRatio 
                    ? `No ${selectedRatio} images found` 
                    : 'No images found'}
                </Text>
              </View>
            ) : null
          }
          removeClippedSubviews={true}
          initialNumToRender={10}
          windowSize={5}
        />

        <TouchableOpacity style={styles.fabButton} onPress={handleGenerateYours}>
          <Text style={styles.fabText}>Generate Yours</Text>
        </TouchableOpacity>

        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeModal}
        >
          <StatusBar hidden />
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBg} onPress={closeModal} activeOpacity={1} />
            
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.closeBtn} onPress={closeModal}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>

              {selectedItem && (
                <>
                  <FastImage
                    source={{ 
                      uri: selectedItem.image_url,
                      priority: FastImage.priority.high,
                      cache: FastImage.cacheControl.immutable,
                    }}
                    style={styles.modalImg}
                    resizeMode="contain"
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={() => downloadImage(selectedItem.filename, selectedItem.image_url)}
                    >
                      <DownloadIcon />
                      <Text style={styles.actionBtnText}>Download</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={() => shareImage(selectedItem.filename, selectedItem.image_url)}
                    >
                      <ShareIcon />
                      <Text style={styles.actionBtnText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
        
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeArea: {
    flex: 1,
    marginHorizontal: -5.5,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
  errorText: {
    fontSize: 15,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 30,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterBtnActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterBtnTextActive: {
    color: '#FFF',
  },
listContent: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  masonryItem: {
    marginHorizontal: 6,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  masonryImage: {
    width: '100%',
  },
  imageLoader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -12,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
  },
  fabButton: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalCard: {
    width: '92%',
    maxHeight: '85%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
  },
  modalImg: {
    width: '100%',
    height: height * 0.55,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GalleryScreen;