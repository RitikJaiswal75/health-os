import { act, type ReactNode } from 'react';
import { createRoot, type TestInstance } from 'test-renderer';

let mockPathname = '/';
let mockState: 'none' | 'soft' | 'force' = 'force';

jest.mock('react-native', () => ({
  Modal: 'Modal',
  View: 'View',
  Image: 'Image',
  StyleSheet: { create: <T,>(styles: T) => styles },
  Platform: { OS: 'android' },
}));
jest.mock('react-native-paper', () => {
  const { createElement } = jest.requireActual('react');
  return {
    Text: ({ children }: { children: ReactNode }) => createElement('Text', null, children),
    Button: ({ children, onPress }: { children: ReactNode; onPress: () => void }) =>
      createElement('Button', { onPress }, children),
    // Paper hoists portals into a host rendered after the app tree, i.e. on top of it.
    Portal: ({ children }: { children: ReactNode }) => createElement('PortalHost', null, children),
  };
});
jest.mock('expo-router', () => ({ usePathname: () => mockPathname }));
jest.mock('@/src/features/appUpdate/appUpdateStore', () => ({
  useAppUpdateStatus: () => ({ state: mockState, platformConfig: undefined }),
}));
jest.mock('@/src/features/appUpdate/openStore', () => ({ openStore: jest.fn() }));
jest.mock('@/src/core/theme/paperTheme', () => ({
  healthOsTheme: { colors: { background: '#fff', onSurfaceVariant: '#444' } },
}));
jest.mock('@/src/i18n/useT', () => ({ useT: () => ({ t: (key: string) => key }) }));
jest.mock('../../assets/images/Logo-adaptive.png', () => 1, { virtual: true });

// eslint-disable-next-line import/first
import { Portal } from 'react-native-paper';
// eslint-disable-next-line import/first
import { ForceUpdateOverlay } from '@/src/core/components/ForceUpdateOverlay';

const Button = 'Button' as unknown as (props: { onPress: () => void; children: ReactNode }) => ReactNode;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function EditDoseDialog() {
  return (
    <Portal>
      <Button onPress={() => undefined}>Save</Button>
    </Portal>
  );
}

function renderWithOpenDialog(): TestInstance {
  const renderer = createRoot();
  act(() => {
    renderer.render(
      <>
        <EditDoseDialog />
        <ForceUpdateOverlay />
      </>,
    );
  });
  return renderer.container;
}

function findAllByType(node: TestInstance, type: string): TestInstance[] {
  return node.queryAll((child) => child.type === type);
}

function findByType(node: TestInstance, type: string): TestInstance {
  const [match, ...rest] = findAllByType(node, type);
  if (!match || rest.length > 0) throw new Error(`Expected exactly one ${type}`);
  return match;
}

describe('ForceUpdateOverlay', () => {
  beforeEach(() => {
    mockPathname = '/';
    mockState = 'force';
  });

  it('blocks from a native modal so an open Portal dialog cannot sit above it', () => {
    const root = renderWithOpenDialog();
    const modal = findByType(root, 'Modal');

    expect(modal.props.visible).toBe(true);
    expect(modal.queryAll((node) => node.props.accessibilityRole === 'alert')).toHaveLength(1);
    // The block must not live in the Portal host, which shares a layer with dialogs.
    const portalHost = findByType(root, 'PortalHost');
    expect(findAllByType(portalHost, 'Modal')).toHaveLength(0);
  });

  it('swallows Android back while blocking', () => {
    const modal = findByType(renderWithOpenDialog(), 'Modal');
    expect(() => modal.props.onRequestClose()).not.toThrow();
  });

  it('stays hidden on the exempt reminder route even with a dialog open', () => {
    mockPathname = '/reminder';
    expect(findByType(renderWithOpenDialog(), 'Modal').props.visible).toBe(false);
  });

  it('stays hidden when no force update is required', () => {
    mockState = 'soft';
    expect(findByType(renderWithOpenDialog(), 'Modal').props.visible).toBe(false);
  });
});
