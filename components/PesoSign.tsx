import React from 'react';

const PesoSign = ({ size = 24, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="Arial, sans-serif"
      fontSize={size * 0.8} 
      fill="currentColor"
    >
      ₱
    </text>
  </svg>
);

export default PesoSign;
