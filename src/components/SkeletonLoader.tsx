import React from 'react';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  height = '1rem', 
  width = '100%' 
}) => (
  <div 
    className={`animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-[length:200%_100%] rounded ${className}`}
    style={{ height, width }}
  />
);

export const HeroSkeleton: React.FC = () => (
  <div className="relative h-screen w-full overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-800 to-black animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
    </div>
    
    <div className="relative z-10 flex items-center h-full">
      <div className="container mx-auto px-4 md:px-8 pt-24 md:pt-32">
        <div className="max-w-2xl w-full space-y-4">
          <Skeleton height="3rem" width="60%" className="mb-4" />
          <div className="space-y-2">
            <Skeleton height="1.5rem" width="100%" />
            <Skeleton height="1.5rem" width="80%" />
            <Skeleton height="1.5rem" width="60%" />
          </div>
          <div className="flex gap-2 my-6">
            <Skeleton height="2rem" width="4rem" className="rounded-full" />
            <Skeleton height="2rem" width="4rem" className="rounded-full" />
            <Skeleton height="2rem" width="5rem" className="rounded-full" />
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton height="3rem" width="8rem" className="rounded-lg" />
            <Skeleton height="3rem" width="10rem" className="rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const MediaCardSkeleton: React.FC = () => (
  <div className="flex-shrink-0 w-40 md:w-48 animate-pulse">
    <div className="relative group cursor-pointer">
      <Skeleton height="14rem" className="rounded-lg mb-2" />
      <Skeleton height="1rem" width="80%" className="mb-1" />
      <Skeleton height="0.875rem" width="60%" />
    </div>
  </div>
);

export const MediaRowSkeleton: React.FC = () => (
  <div className="mb-8">
    <Skeleton height="1.5rem" width="12rem" className="mb-4" />
    <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <MediaCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const CategoryPageSkeleton: React.FC = () => (
  <div className="container mx-auto px-4 py-8">
    <Skeleton height="2rem" width="15rem" className="mb-6" />
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <Skeleton height="16rem" className="rounded-lg mb-2" />
          <Skeleton height="1rem" width="80%" className="mb-1" />
          <Skeleton height="0.875rem" width="60%" />
        </div>
      ))}
    </div>
  </div>
);

// CSS for skeleton animation (add to index.css)
export const skeletonStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.animate-pulse {
  animation: shimmer 1.5s ease-in-out infinite;
}
`;