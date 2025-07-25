import type { FC } from 'react';
import type { LucideProps } from 'lucide-react';
import { weatherIcons, type WeatherCondition } from '@/lib/weather-data';

interface WeatherIconProps extends LucideProps {
  condition: WeatherCondition;
}

const WeatherIcon: FC<WeatherIconProps> = ({ condition, ...props }) => {
  const Icon = weatherIcons[condition];
  if (!Icon) return null;
  return <Icon {...props} />;
};

export default WeatherIcon;
