import React from 'react';
import { Switch, SwitchProps } from 'react-native';

/**
 * iOSスタイルのスイッチ
 * AndroidでもiOSのような見た目になるように色を調整しています。
 */
export const CupertinoSwitch: React.FC<SwitchProps> = (props) => {
  return (
    <Switch
      trackColor={{ false: '#767577', true: '#34C759' }}
      thumbColor={'#f4f3f4'}
      ios_backgroundColor="#3e3e3e"
      {...props}
    />
  );
};
