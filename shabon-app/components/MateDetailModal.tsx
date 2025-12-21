import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable, Platform, Image } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { router } from 'expo-router';

interface MateDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  mate: {
    id: number;
    mate_name: string;
    mate_id?: string;
    image_url?: string | null;
    profile_preview?: string | null;
    base_prompt?: string | null;
  } | null;
  showChatButton?: boolean;
}

export const MateDetailModal: React.FC<MateDetailModalProps> = ({ 
  isVisible, 
  onClose, 
  mate, 
  showChatButton = true 
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  if (!mate) return null;

  const handleChatPress = () => {
    onClose();
    router.push(`/chat/${mate.id}`);
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable 
          style={styles.modalContentWrapper} 
          onPress={(e) => e.stopPropagation()}
        >
          {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
            <GlassView style={styles.modalGlass} isInteractive>
              <View style={styles.modalContent}>
                {/* 閉じるボタン */}
                <Pressable 
                  onPress={onClose} 
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={32} color={theme.glassText} />
                </Pressable>

                {/* メイト画像 */}
                <View style={styles.mateImageContainer}>
                  {mate.image_url ? (
                    <Image 
                      source={{ uri: mate.image_url }} 
                      style={styles.mateImage}
                      defaultSource={require('@/assets/images/icon.png')}
                    />
                  ) : (
                    <Ionicons name="person" size={100} color={theme.glassText} />
                  )}
                </View>

                {/* メイト名 */}
                <Text style={[styles.mateName, { color: theme.glassText }]}>
                  {mate.mate_name}
                </Text>

                {/* メイトID */}
                {mate.mate_id && (
                  <Text style={[styles.mateId, { color: theme.glassText }]}>
                    @{mate.mate_id}
                  </Text>
                )}

                {/* プロフィール */}
                <ScrollView style={styles.profileScrollView}>
                  <Text style={[styles.profileTitle, { color: theme.glassText }]}>
                    プロフィール
                  </Text>
                  <Text style={[styles.profileText, { color: theme.glassText }]}>
                    {mate.base_prompt || mate.profile_preview || 'プロフィールが設定されていません。'}
                  </Text>
                </ScrollView>

                {/* チャットボタン */}
                {showChatButton && (
                  <Pressable onPress={handleChatPress} style={styles.chatButton}>
                    <Text style={styles.chatButtonText}>チャットする</Text>
                  </Pressable>
                )}
              </View>
            </GlassView>
          ) : (
            <View style={[styles.modalContentFallback, { backgroundColor: theme.card }]}>
              {/* 閉じるボタン */}
              <Pressable 
                onPress={onClose} 
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={32} color={theme.icon} />
              </Pressable>

              {/* メイト画像 */}
              <View style={[styles.mateImageContainer, { backgroundColor: theme.background }]}>
                {mate.image_url ? (
                  <Image 
                    source={{ uri: mate.image_url }} 
                    style={styles.mateImage}
                    defaultSource={require('@/assets/images/icon.png')}
                  />
                ) : (
                  <Ionicons name="person" size={100} color={theme.icon} />
                )}
              </View>

              {/* メイト名 */}
              <Text style={[styles.mateName, { color: theme.text }]}>
                {mate.mate_name}
              </Text>

              {/* メイトID */}
              {mate.mate_id && (
                <Text style={[styles.mateId, { color: theme.icon }]}>
                  @{mate.mate_id}
                </Text>
              )}

              {/* プロフィール */}
              <ScrollView style={styles.profileScrollView}>
                <Text style={[styles.profileTitle, { color: theme.text }]}>
                  プロフィール
                </Text>
                <Text style={[styles.profileText, { color: theme.text }]}>
                  {mate.base_prompt || mate.profile_preview || 'プロフィールが設定されていません。'}
                </Text>
              </ScrollView>

              {/* チャットボタン */}
              {showChatButton && (
                <Pressable onPress={handleChatPress} style={styles.chatButton}>
                  <Text style={styles.chatButtonText}>チャットする</Text>
                </Pressable>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWrapper: {
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalGlass: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalContentFallback: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  mateImageContainer: {
    width: 200,
    height: 200,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  mateImage: {
    width: '100%',
    height: '100%',
  },
  mateName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  mateId: {
    fontSize: 16,
    marginBottom: 16,
    opacity: 0.7,
  },
  profileScrollView: {
    maxHeight: 200,
    width: '100%',
    marginBottom: 20,
  },
  profileTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    opacity: 0.7,
  },
  profileText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  chatButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

