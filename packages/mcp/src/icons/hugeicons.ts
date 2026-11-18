import * as hugeicons from '@hugeicons/core-free-icons';
import { buildIconSet, type IconSet } from './icon-set';

let iconSet: IconSet | undefined;

export function loadIconSet(): IconSet {
  iconSet ??= buildIconSet(hugeicons);
  return iconSet;
}
