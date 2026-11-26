import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomNav } from '../BottomNav';
import { Button3D } from '../Button3D';
import { Card3D } from '../Card3D';
import { Memo } from '../Memo';
import { OptionRow } from '../OptionRow';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('Button3D', () => {
  it('shows the label in uppercase, keeps the accessible name and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<Button3D label="Crear cuenta" onPress={onPress} />);
    expect(screen.getByText('CREAR CUENTA')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws a solid 3D base under the face', async () => {
    await render(<Button3D label="Ok" />);
    expect(screen.getByTestId('surface-base')).toBeTruthy();
  });
});

describe('Card3D', () => {
  it('renders its content on a based surface', async () => {
    await render(
      <Card3D tone="amber">
        <Text>Reto de dominio</Text>
      </Card3D>,
    );
    expect(screen.getByText('Reto de dominio')).toBeTruthy();
    expect(screen.getByTestId('surface-base')).toBeTruthy();
  });
});

describe('OptionRow', () => {
  it('exposes radio state and a filled indicator only when selected', async () => {
    const onPress = jest.fn();
    const { rerender } = await render(
      <OptionRow title="Soy profesor" description="El administrador confirma tu rol" selected={false} onPress={onPress} />,
    );
    const row = screen.getByRole('radio', { name: 'Soy profesor. El administrador confirma tu rol' });
    expect(row.props.accessibilityState).toEqual({ checked: false });
    expect(screen.queryByTestId('option-indicator-dot')).toBeNull();
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();

    await rerender(<OptionRow title="Soy profesor" selected onPress={onPress} />);
    expect(screen.getByTestId('option-indicator-dot')).toBeTruthy();
  });
});

describe('BottomNav', () => {
  it('renders the four student tabs and marks the active one', async () => {
    const onSelect = jest.fn();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <BottomNav activeKey="today" onSelect={onSelect} />
      </SafeAreaProvider>,
    );
    for (const label of ['Hoy', 'Mazos', 'Evaluar', 'Perfil']) {
      expect(screen.getByRole('tab', { name: label })).toBeTruthy();
    }
    expect(screen.getByRole('tab', { name: 'Hoy' }).props.accessibilityState).toEqual({ selected: true });
    await fireEvent.press(screen.getByRole('tab', { name: 'Mazos' }));
    expect(onSelect).toHaveBeenCalledWith('decks');
  });
});

describe('Memo', () => {
  it('draws the requested pose and tone', async () => {
    await render(<Memo pose="challenge" tone="white" accessibilityLabel="Memo con cronómetro" />);
    expect(screen.getByTestId('memo-challenge-white')).toBeTruthy();
    expect(screen.getByRole('image', { name: 'Memo con cronómetro' })).toBeTruthy();
  });
});
