import WeatherDashboard from '@/components/weather-sphere/weather-dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-background w-full flex items-center justify-center">
      <WeatherDashboard />
    </main>
  );
}
