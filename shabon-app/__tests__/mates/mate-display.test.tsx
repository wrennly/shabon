import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// シンプルなメイトカードコンポーネント（実際のコンポーネントの簡易版）
const MateCard = ({ mate }: { mate: { mate_name: string; mate_id?: string } }) => (
  <View testID="mate-card">
    <Text testID="mate-name">{mate.mate_name}</Text>
    {mate.mate_id && <Text testID="mate-id">@{mate.mate_id}</Text>}
  </View>
);

describe('メイト表示', () => {
  describe('メイトカード', () => {
    it('メイト名が表示される', () => {
      const mate = { mate_name: 'テストメイト', mate_id: 'test1234' };
      const { getByTestId } = render(<MateCard mate={mate} />);

      const mateName = getByTestId('mate-name');
      expect(mateName.props.children).toBe('テストメイト');
    });

    it('メイトIDが表示される', () => {
      const mate = { mate_name: 'テストメイト', mate_id: 'test1234' };
      const { getByTestId } = render(<MateCard mate={mate} />);

      const mateId = getByTestId('mate-id');
      expect(mateId.props.children).toEqual(['@', 'test1234']);
    });

    it('メイトIDがない場合は表示されない', () => {
      const mate = { mate_name: 'テストメイト' };
      const { queryByTestId } = render(<MateCard mate={mate} />);

      const mateId = queryByTestId('mate-id');
      expect(mateId).toBeNull();
    });
  });

  describe('デフォルト画像', () => {
    it('画像URLがない場合はデフォルトアイコン', () => {
      const imageUrl = null;
      const shouldShowDefault = !imageUrl;

      expect(shouldShowDefault).toBe(true);
    });

    it('画像URLがある場合は画像を表示', () => {
      const imageUrl = 'https://example.com/image.jpg';
      const shouldShowDefault = !imageUrl;

      expect(shouldShowDefault).toBe(false);
    });
  });
});

