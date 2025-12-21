import React from 'react';
import { View, StyleSheet, Modal, ScrollView, Pressable, Platform, Image } from 'react-native';
import { Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface MateDetailModalProps {
  visible: boolean;
  onClose: () => void;
  mate: {
    id: number;
    mate_name: string;
    image_url?: string | null;
    profile_preview?: string | null;
  } | null;
  onStartChat?: () => void;
  showChatButton?: boolean;
}

export function MateDetailModal({ 
  visible, 
  onClose, 
  mate, 
  onStartChat,
  showChatButton = true 
}: MateDetailModalProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  if (!mate) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          { backgroundColor: colorScheme === 'dark' ? 'rgba(28,28,30,0.98)' : 'rgba(255,255,255,0.98)' }
        ]}>
          {/* ヘッダー */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              メイト詳細
            </Text>
            <Pressable 
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={theme.icon} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollView}>
            {/* メイト画像 */}
            {mate.image_url ? (
              <Image 
                source={{ uri: mate.image_url }} 
                style={styles.mateImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.mateImagePlaceholder, { backgroundColor: theme.card }]}>
                <Ionicons name="person" size={60} color={theme.icon} />
              </View>
            )}

            {/* メイト名 */}
            <Text style={[styles.mateName, { color: theme.text }]}>
              {mate.mate_name}
            </Text>

            {/* プロフィール */}
            {mate.profile_preview && (
              <View style={styles.profileSection}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>
                  プロフィール
                </Text>
                <Text style={[styles.profileText, { color: theme.text }]}>
                  {mate.profile_preview}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* チャットボタン */}
          {showChatButton && onStartChat && (
            <Pressable onPress={onStartChat} style={{ marginTop: 16 }}>
              {Platform.OS === 'ios' && isLiquidGlassAvailable() ? (
                <GlassView style={styles.chatButtonGlass} isInteractive>
                  <Ionicons name="chatbubble" size={20} color={theme.glassText} style={{ marginRight: 8 }} />
                  <Text style={[styles.chatButtonTextGlass, { color: theme.glassText }]}>
                    チャットする
                  </Text>
                </GlassView>
              ) : (
                <View style={[styles.chatButton, { backgroundColor: theme.tint }]}>
                  <Ionicons name="chatbubble" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.chatButtonText}>チャットする</Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    marginBottom: 16,
  },
  mateImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  mateImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mateName: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  profileText: {
    fontSize: 15,
    lineHeight: 22,
  },
  chatButton: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatButtonGlass: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  chatButtonTextGlass: {
    fontSize: 16,
    fontWeight: '600',
  },
});

