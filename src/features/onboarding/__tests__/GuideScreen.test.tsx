import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiError } from '../../../services/api/client';
import { GuideScreen } from '../GuideScreen';

jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderGuide = async (onFinish: () => Promise<void> = jest.fn(() => Promise.resolve())) => {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <GuideScreen onFinish={onFinish} />
    </SafeAreaProvider>,
  );
  return onFinish;
};

describe('GuideScreen (pantalla 04, CU-31, RF-53)', () => {
  it('starts on step 1 of 3 with Saltar and Siguiente', async () => {
    await renderGuide();
    expect(screen.getByText('Paso 1 de 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Saltar' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeTruthy();
    expect(screen.getByText('Puedes volver a esta guía cuando quieras desde Ajustes, en Ayuda.')).toBeTruthy();
  });

  it('step 2 shows the texts of the design', async () => {
    await renderGuide();
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Paso 2 de 3')).toBeTruthy();
    expect(screen.getByText('Cuándo vuelve cada tarjeta')).toBeTruthy();
    expect(screen.getByText('Repasa justo antes de olvidar')).toBeTruthy();
    expect(screen.getByLabelText('Los repasos se separan cada vez más: día 1, 3, 8, 20 y 45')).toBeTruthy();
    expect(screen.getByText('día 1 · 3 · 8 · 20 · 45')).toBeTruthy();
  });

  it('finishing step 3 marks the guide as completed', async () => {
    const onFinish = await renderGuide();
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Paso 3 de 3')).toBeTruthy();
    expect(onFinish).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Empezar' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('Saltar also marks the guide as completed', async () => {
    const onFinish = await renderGuide();
    await fireEvent.press(screen.getByRole('button', { name: 'Saltar' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('says what failed when the guide cannot be saved', async () => {
    await renderGuide(jest.fn(() => Promise.reject(new ApiError(0, 'NETWORK', 'No pudimos conectar con Memora.'))));
    await fireEvent.press(screen.getByRole('button', { name: 'Saltar' }));
    await waitFor(() => expect(screen.getByText('No pudimos conectar con Memora.')).toBeTruthy());
  });
});
