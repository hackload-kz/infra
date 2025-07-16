import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/@prisma/client/**/*'],
  },
  
  // Оптимизации компилятора
  compiler: {
    // Удаляем только console.log в production, оставляем console.info, console.warn, console.error
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['info', 'warn', 'error']
    } : false,
  },
  
  // Экспериментальные оптимизации
  experimental: {
    // Оптимизация сборки
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-slot',
      'date-fns',
      'clsx',
      'tailwind-merge',
      'class-variance-authority'
    ],
    // Кэширование сборки
    webpackBuildWorker: true,
  },
  
  // Оптимизации Webpack
  webpack: (config, { dev }) => {
    // Только для production сборки
    if (!dev) {
      // Кэширование
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
      
      // Оптимизация чанков
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            prisma: {
              test: /[\\/]node_modules[\\/]@prisma[\\/]/,
              name: 'prisma',
              chunks: 'all',
              priority: 20,
            },
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30,
            },
          },
        },
      };
    }
    
    return config;
  },
  
  // Оптимизации статических файлов
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : undefined,
  
  // Отключаем source maps в production для быстроты
  productionBrowserSourceMaps: false,
  
  // Оптимизация изображений
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Настройки для TypeScript
  typescript: {
    // Игнорируем ошибки TypeScript в production сборке для скорости
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  
  // Настройки ESLint
  eslint: {
    // Игнорируем ошибки ESLint в production сборке для скорости
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
