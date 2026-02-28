import React from 'react';

interface StarRatingProps {
    rating: number;
    className?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    showNumber?: boolean;
}

export function StarRating({ rating, className = '', size = 'sm', showNumber = false }: StarRatingProps) {
    const stars = [];
    const sizeClass = {
        xs: 'text-[10px]',
        sm: 'text-[12px]',
        md: 'text-[14px]',
        lg: 'text-[16px]',
    }[size];

    for (let i = 1; i <= 5; i++) {
        if (i <= Math.floor(rating)) {
            stars.push(<span key={i} className={`material-icons-round ${sizeClass} text-yellow-500`}>star</span>);
        } else if (i === Math.ceil(rating) && !Number.isInteger(rating)) {
            stars.push(<span key={i} className={`material-icons-round ${sizeClass} text-yellow-500`}>star_half</span>);
        } else {
            stars.push(<span key={i} className={`material-icons-round ${sizeClass} text-gray-300 dark:text-gray-600`}>star_border</span>);
        }
    }

    return (
        <div className={`flex items-center gap-0.5 ${className}`}>
            {stars}
            {showNumber && <span className={`ml-1 font-bold ${sizeClass} text-gray-700 dark:text-gray-200`}>{rating.toFixed(1)}</span>}
        </div>
    );
}
