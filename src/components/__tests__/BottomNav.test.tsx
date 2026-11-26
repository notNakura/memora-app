import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomNav, studentNavItems } from '../BottomNav';
import { ProfileIcon } from '../icons';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderNav = (props: Partial<Parameters<typeof BottomNav>[0]> = {}) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <BottomNav activeKey="today" onSelect={jest.fn()} {...props} />
    </SafeAreaProvider>,
  );

describe('BottomNav', () => {
  it('keeps the student tabs and the default bar name', async () => {
    await renderNav();
    expect(screen.getByLabelText('Navegación principal').props.accessibilityRole).toBe('tablist');
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityLabel)).toEqual(studentNavItems.map((i) => i.label));
  });

  it('accepts another set of tabs and another bar name', async () => {
    const onSelect = jest.fn();
    const items = [
      { key: 'index', label: 'Resumen', Icon: ProfileIcon },
      { key: 'profile', label: 'Perfil', Icon: ProfileIcon },
    ];
    await renderNav({ items, activeKey: 'profile', onSelect, accessibilityLabel: 'Navegación docente' });
    expect(screen.getByLabelText('Navegación docente')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Perfil' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Resumen' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Resumen' }));
    expect(onSelect).toHaveBeenCalledWith('index');
  });

  it('lets labels grow with the font size (no fixed bar height, wrapped labels)', async () => {
    await renderNav();
    const bar = screen.getByLabelText('Navegación principal');
    const style = Object.assign({}, ...[bar.props.style].flat(3).filter(Boolean));
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBe(68);
    for (const tab of screen.getAllByRole('tab')) {
      const tabStyle = Object.assign({}, ...[tab.props.style].flat(3).filter(Boolean));
      expect(tabStyle.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});
