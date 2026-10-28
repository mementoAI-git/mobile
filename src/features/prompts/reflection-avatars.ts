import { shuffleAvatarOrder } from './reflection-avatar-order';
import type { ImageSourcePropType } from 'react-native';

export const reflectionAvatars: ImageSourcePropType[] = [
  require('../../../assets/images/reflection-avatars/avatar-01.webp'),
  require('../../../assets/images/reflection-avatars/avatar-02.webp'),
  require('../../../assets/images/reflection-avatars/avatar-03.webp'),
  require('../../../assets/images/reflection-avatars/avatar-04.webp'),
  require('../../../assets/images/reflection-avatars/avatar-05.webp'),
  require('../../../assets/images/reflection-avatars/avatar-06.webp'),
  require('../../../assets/images/reflection-avatars/avatar-07.webp'),
  require('../../../assets/images/reflection-avatars/avatar-08.webp'),
  require('../../../assets/images/reflection-avatars/avatar-09.webp'),
  require('../../../assets/images/reflection-avatars/avatar-10.webp'),
  require('../../../assets/images/reflection-avatars/avatar-11.webp'),
  require('../../../assets/images/reflection-avatars/avatar-12.webp'),
  require('../../../assets/images/reflection-avatars/avatar-13.webp'),
  require('../../../assets/images/reflection-avatars/avatar-14.webp'),
  require('../../../assets/images/reflection-avatars/avatar-15.webp'),
  require('../../../assets/images/reflection-avatars/avatar-16.webp'),
  require('../../../assets/images/reflection-avatars/avatar-17.webp'),
  require('../../../assets/images/reflection-avatars/avatar-18.webp'),
  require('../../../assets/images/reflection-avatars/avatar-19.webp'),
  require('../../../assets/images/reflection-avatars/avatar-20.webp'),
];

export function createAvatarOrder(): ImageSourcePropType[] {
  return shuffleAvatarOrder(reflectionAvatars);
}

export { avatarsForCard, refreshAvatarOrder } from './reflection-avatar-order';
