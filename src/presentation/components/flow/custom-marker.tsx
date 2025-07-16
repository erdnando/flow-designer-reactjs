import React from 'react';
import { MarkerType } from 'reactflow';

// This is just for reference - we'll examine available marker types
const availableMarkerTypes = {
  Arrow: MarkerType.Arrow, 
  ArrowClosed: MarkerType.ArrowClosed
};

// Custom marker component to add at the end of connections
export const CustomMarker = () => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="5" fill="rgba(255, 59, 48, 0.8)" />
    </svg>
  );
};

export default CustomMarker;
