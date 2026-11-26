// Tab layout of one role shell (docs/08_navegacion.md, Barras de navegación). Only the shell of the active view exists:
// any other one sends the person back to the start screen, which opens the right shell.
import { Redirect } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { BottomNav } from '../../components/BottomNav';
import { colors } from '../../theme';
import { SHELL_NAV_LABELS, SHELL_TABS, type ShellName } from './shells';
import { useActiveShell } from './useActiveShell';

function ShellTabBar({ shell, state, navigateToTab }: BottomTabBarProps & { shell: ShellName }) {
  const current = state.routes[state.index]?.name;
  return (
    <BottomNav
      items={SHELL_TABS[shell]}
      activeKey={current}
      accessibilityLabel={SHELL_NAV_LABELS[shell]}
      onSelect={(key) => {
        const route = state.routes.find((r) => r.name === key);
        if (route && route.name !== current) navigateToTab(route.key);
      }}
    />
  );
}

export function ShellTabs({ shell }: { shell: ShellName }) {
  const active = useActiveShell();
  if (active !== shell) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.appBackground } }}
      tabBar={(props) => <ShellTabBar shell={shell} {...props} />}
    >
      {SHELL_TABS[shell].map((tab) => (
        <Tabs.Screen key={tab.key} name={tab.key} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}
