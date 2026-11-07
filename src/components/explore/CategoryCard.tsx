import React from 'react';
import type { ImageSourcePropType } from 'react-native';
import { TopicCard } from '@/components/overview/TopicCard';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  title: string;
  subtitle?: string;
  image?: ImageSourcePropType;
  onPress?: () => void;
  className?: string;
}

export const CategoryCard = React.memo(function CategoryCard({
  title, subtitle, image, onPress, className,
}: CategoryCardProps) {
  return (
    <TopicCard
      title={title}
      description={subtitle}
      image={image}
      onPress={onPress}
      fullWidth
      imageHeight={240}
      className={cn('mb-5', className)}
    />
  );
});
