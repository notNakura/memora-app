import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MemoShowcase from '../../app/(app)/dev/memo';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-router', () => ({ Redirect: () => null }));
jest.setTimeout(30000);

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

describe('Memo showcase (development only)', () => {
  it('plays the chosen reaction and switches tone and accessory', async () => {
    jest.useFakeTimers();
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <MemoShowcase />
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Aplaudir' }));
    expect(screen.getByTestId('memo-reaction-clap', { includeHiddenElements: true })).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Birrete' }));
    expect(screen.getByTestId('memo-accessory-cap', { includeHiddenElements: true })).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Dormir' }));
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('memo-reaction-sleep', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Terminó: Aplaudir')).toBeTruthy();
    jest.useRealTimers();
  });
});
