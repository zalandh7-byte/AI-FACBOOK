import React from 'react';

interface ActiveHabibLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  xs: 40,
  sm: 56,
  md: 96,
  lg: 148,
  xl: 210,
};

/**
 * Exact SVG recreation of the uploaded "ACTIVE HABIB - Patan facbook - پٹھان سوشل سایٹ" circular badge.
 */
export const ActiveHabibLogo: React.FC<ActiveHabibLogoProps> = ({
  size = 'md',
  className = '',
}) => {
  const px = SIZE_MAP[size];

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: px, height: px }}
      aria-label="Active Habib - Patan facbook - پٹھان سوشل سایٹ"
    >
      <svg
        viewBox="0 0 500 500"
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-sm"
      >
        <defs>
          <filter id="activeTextShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="4" stdDeviation="2" floodColor="#072c30" floodOpacity="0.65" />
          </filter>
        </defs>

        {/* Outer Dark Teal Ring */}
        <circle cx="250" cy="250" r="244" fill="#136168" />
        {/* White Inner Border Ring */}
        <circle cx="250" cy="250" r="234" fill="none" stroke="#FFFFFF" strokeWidth="7" />
        {/* Main Deep Teal Disc */}
        <circle cx="250" cy="250" r="226" fill="#136168" />

        {/* Stylized White Running Athlete Silhouette at Top */}
        <g fill="#FAF5F5">
          {/* Runner Head */}
          <circle cx="283" cy="88" r="18" />
          {/* Upper Back / Left Arm Arc */}
          <path d="M204 150 C200 105, 212 65, 232 63 C248 61, 265 82, 261 95 C257 104, 245 96, 235 84 C222 72, 212 105, 204 150 Z" />
          {/* Right Forearm Raised Forward */}
          <path d="M278 112 C276 136, 290 160, 308 158 C326 156, 340 132, 336 105 C330 124, 318 138, 306 137 C295 136, 292 118, 286 110 C282 106, 279 108, 278 112 Z" />
          {/* Runner Torso & Driving Legs */}
          <path d="M150 222 L212 152 C202 142, 204 128, 216 128 C234 128, 266 156, 262 175 C258 190, 234 202, 196 206 C218 195, 234 184, 236 173 L228 166 L156 224 Z" />
        </g>

        {/* Bold Orange "ACTIVE" */}
        <text
          x="250"
          y="290"
          textAnchor="middle"
          fill="#FF6B1A"
          filter="url(#activeTextShadow)"
          fontFamily="'Syne', 'Impact', 'Arial Black', sans-serif"
          fontWeight="900"
          fontSize="94"
          letterSpacing="1"
        >
          ACTIVE
        </text>

        {/* Small Black "HABIB" */}
        <text
          x="250"
          y="322"
          textAnchor="middle"
          fill="#051416"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="700"
          fontSize="18"
          letterSpacing="1.5"
        >
          HABIB
        </text>

        {/* Bright Cyan "Patan facbook" */}
        <text
          x="250"
          y="362"
          textAnchor="middle"
          fill="#4DD0E1"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="800"
          fontSize="41"
        >
          Patan facbook
        </text>

        {/* Bright Lime Green Urdu "پٹھان سوشل" */}
        <text
          x="250"
          y="408"
          textAnchor="middle"
          fill="#B4F156"
          fontFamily="'Noto Naskh Arabic', sans-serif"
          fontWeight="700"
          fontSize="36"
        >
          پٹھان سوشل
        </text>

        {/* Bright Lime Green Urdu "سایٹ" */}
        <text
          x="250"
          y="445"
          textAnchor="middle"
          fill="#B4F156"
          fontFamily="'Noto Naskh Arabic', sans-serif"
          fontWeight="700"
          fontSize="34"
        >
          سایٹ
        </text>
      </svg>
    </div>
  );
};
