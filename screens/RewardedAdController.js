import React, { useEffect } from 'react';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

// Use your actual Ad Unit ID here
const adUnitId = __DEV__
  ? TestIds.REWARDED
  : 'ad unit----';

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  keywords: [
    'fashion', 'clothing', 'AI fashion', 'smart clothing', 'tech wear', 'AI style',
    'digital fashion', 'fashion technology', 'wearable tech', 'AI outfit generator',
    'virtual try-on', 'AI trends', 'smart fabrics', 'AI fashion design',
    'tech fashion brands',
  ],
});

const RewardedAdController = ({ onRewardEarned, onAdClosed }) => {
  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('Rewarded Ad Loaded');
    });

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('User earned reward:', reward);
        if (onRewardEarned) onRewardEarned(reward);
      },
    );

    const unsubscribeClosed = rewarded.addAdEventListener(RewardedAdEventType.CLOSED, () => {
      console.log('Ad Closed');
      if (onAdClosed) onAdClosed();
      // Reload ad after closing
      rewarded.load();
    });

    // Start loading the ad
    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, [onRewardEarned, onAdClosed]);

  return null; // This component renders nothing
};

export default RewardedAdController;