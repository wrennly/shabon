import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useColorScheme,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/theme';

interface MateProfileModalProps {
  visible: boolean;
  onClose: () => void;
  mate: {
    mate_name: string;
    image_url?: string;
    attributes?: {
      tone_style?: string;
      stance?: string;
      relationship?: string;
      profession?: string;
      gender?: string;
      age_range?: string;
      hobby?: string;
      expertise?: string;
      personality_traits?: string;
    };
  };
  onStartChat?: () => void;
  showChatButton?: boolean;
}

export default function MateProfileModal({
  visible,
  onClose,
  mate,
  onStartChat,
  showChatButton = true,
}: MateProfileModalProps) {
  const isDark = useColorScheme() === 'dark';
  const theme = Colors[isDark ? 'dark' : 'light'];

  const ProfileItem = ({ icon, label, value }: { icon: string; label: string; value?: string }) => {
    if (!value) return null;

    return (
      <View style={styles.profileItem}>
        <View style={styles.profileItemHeader}>
          <Ionicons name={icon as any} size={20} color={theme.glassText} />
          <Text style={[styles.profileLabel, { color: theme.glassText }]}>{label}</Text>
        </View>
        <Text style={[styles.profileValue, { color: theme.glassText }]}>{value}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <BlurView
            intensity={isDark ? 50 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={styles.modalContent}
          >
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.glassText }]}>
                メイトプロフィール
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.glassText} />
              </Pressable>
            </View>

            {/* スクロール可能な内容 */}
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* メイト画像＋名前 */}
              <View style={styles.mateHeader}>
                {mate.image_url ? (
                  <Image source={{ uri: mate.image_url }} style={styles.mateImage} />
                ) : (
                  <View style={[styles.mateImagePlaceholder, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Ionicons name="person" size={40} color={isDark ? '#666' : '#ccc'} />
                  </View>
                )}
                <Text style={[styles.mateName, { color: theme.glassText }]}>
                  {mate.mate_name}
                </Text>
              </View>

              {/* プロフィール項目 */}
              <View style={styles.profileSection}>
                <ProfileItem icon="chatbubble-outline" label="口調" value={mate.attributes?.tone_style} />
                <ProfileItem icon="heart-outline" label="対話の姿勢" value={mate.attributes?.stance} />
                <ProfileItem icon="people-outline" label="関係性" value={mate.attributes?.relationship} />
                <ProfileItem icon="briefcase-outline" label="専門分野" value={mate.attributes?.profession} />
                <ProfileItem icon="person-outline" label="性別" value={mate.attributes?.gender} />
                <ProfileItem icon="time-outline" label="年代" value={mate.attributes?.age_range} />
                <ProfileItem icon="game-controller-outline" label="趣味" value={mate.attributes?.hobby} />
                <ProfileItem icon="star-outline" label="得意なこと" value={mate.attributes?.expertise} />
                <ProfileItem icon="sparkles-outline" label="性格" value={mate.attributes?.personality_traits} />
              </View>
            </ScrollView>

            {/* チャット開始ボタン */}
            {showChatButton && onStartChat && (
              <Pressable
                style={({ pressed }) => [
                  styles.chatButton,
                  {
                    backgroundColor: isDark
                      ? pressed
                        ? 'rgba(90, 200, 250, 0.3)'
                        : 'rgba(90, 200, 250, 0.2)'
                      : pressed
                      ? 'rgba(90, 200, 250, 0.4)'
                      : 'rgba(90, 200, 250, 0.3)',
                  },
                ]}
                onPress={onStartChat}
              >
                <Ionicons name="chatbubbles" size={20} color={theme.glassText} />
                <Text style={[styles.chatButtonText, { color: theme.glassText }]}>
                  チャットを始める
                </Text>
              </Pressable>
            )}
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    maxHeight: 500,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  mateHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mateImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  mateImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mateName: {
    fontSize: 20,
    fontWeight: '600',
  },
  profileSection: {
    gap: 16,
  },
  profileItem: {
    gap: 8,
  },
  profileItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  profileValue: {
    fontSize: 14,
    paddingLeft: 28,
    lineHeight: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

