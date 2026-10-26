import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { save } from './save';

export function haptic(kind: 'light' | 'medium' | 'heavy' | 'warn' | 'success') {
  if (!save.settings.haptics || !Capacitor.isNativePlatform()) return;
  const p =
    kind === 'light' ? Haptics.impact({ style: ImpactStyle.Light })
    : kind === 'medium' ? Haptics.impact({ style: ImpactStyle.Medium })
    : kind === 'heavy' ? Haptics.impact({ style: ImpactStyle.Heavy })
    : kind === 'warn' ? Haptics.notification({ type: NotificationType.Warning })
    : Haptics.notification({ type: NotificationType.Success });
  p.catch(() => {});
}
