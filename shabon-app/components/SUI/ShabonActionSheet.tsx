import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, TouchableWithoutFeedback } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface ActionSheetAction {
  title: string;
  onPress: () => void;
  isDestructive?: boolean;
  isCancel?: boolean;
}

interface ShabonActionSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  message?: string;
  actions: ActionSheetAction[];
}

export function ShabonActionSheet({ visible, onDismiss, title, message, actions }: ShabonActionSheetProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <View style={styles.sheetContainer}>
            <View style={[styles.groupContainer, { backgroundColor: theme.card }]}>
              {(title || message) && (
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                  {title && <Text style={[styles.title, { color: theme.text }]}>{title}</Text>}
                  {message && <Text style={[styles.message, { color: theme.icon }]}>{message}</Text>}
                </View>
              )}
              {actions.filter(a => !a.isCancel).map((action, index, arr) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    index < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }
                  ]}
                  onPress={() => {
                    onDismiss();
                    action.onPress();
                  }}
                >
                  <Text style={[
                    styles.buttonText,
                    { color: theme.tint },
                    action.isDestructive && { color: '#FF3B30' }
                  ]}>
                    {action.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {actions.find(a => a.isCancel) && (
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.card }]}
                onPress={() => {
                  onDismiss();
                  actions.find(a => a.isCancel)?.onPress();
                }}
              >
                <Text style={[styles.buttonText, { color: theme.tint, fontWeight: '600' }]}>
                  {actions.find(a => a.isCancel)?.title || 'キャンセル'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  groupContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 20,
    color: '#007AFF',
  },
  cancelButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
