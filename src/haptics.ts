import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { meta } from './save';

export function haptic(kind: 'light' | 'heavy' | 'warn' | 'success') {
  if (!meta.settings.haptics || !Capacitor.isNativePlatform()) return;
  const p =
    kind === 'light' ? Haptics.impact({ style: ImpactStyle.Light })
    : kind === 'heavy' ? Haptics.impact({ style: ImpactStyle.Heavy })
    : kind === 'warn' ? Haptics.notification({ type: NotificationType.Warning })
    : Haptics.notification({ type: NotificationType.Success });
  p.catch(() => {});
}
