// CapturedImageDisplay.tsx
"use client"; // Add if using Next.js App Router and hooks like useState/useEffect

import React, { useState, useEffect } from 'react';

// Define the props the component accepts
interface CapturedImageDisplayProps {
  capturedImageBlob: Blob | null; // Accepts a Blob or null
}

export function CapturedImageDisplay({ capturedImageBlob }: CapturedImageDisplayProps) {
  // State to hold the temporary object URL for the image
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // Effect to create/revoke the object URL when the blob changes
  useEffect(() => {
    let objectUrl: string | null = null;

    // Check if a valid blob is provided
    if (capturedImageBlob) {
      // Create a temporary URL from the Blob object
      objectUrl = URL.createObjectURL(capturedImageBlob);
      console.log('Created Object URL:', objectUrl); // Optional: for debugging
      setImageSrc(objectUrl); // Set the URL in state to display the image
    } else {
      // If no blob (or null), clear the image source
      setImageSrc(null);
    }

    // --- Cleanup Function ---
    // This function runs when the component unmounts OR before the effect runs again
    // due to a change in `capturedImageBlob`. It's crucial for preventing memory leaks.
    return () => {
      if (objectUrl) {
        console.log('Revoking Object URL:', objectUrl); // Optional: for debugging
        // Revoke the previously created object URL to free up memory
        URL.revokeObjectURL(objectUrl);
        // We might clear imageSrc here too, but setting it in the main effect body
        // when capturedImageBlob is null handles the visual clearing.
        // setImageSrc(null); // Generally handled by the effect body on next run
      }
    };
  }, [capturedImageBlob]); // Dependency array: Effect runs when capturedImageBlob changes

  // --- Render Logic ---

  // If there's no image source (no blob or blob is invalid)
  if (!imageSrc) {
    // Render a placeholder or nothing
    return (
      <div style={{
          width: '100%',
          paddingBottom: '75%', // Aspect ratio placeholder (e.g., 4:3) - adjust as needed
          border: '1px solid lightgrey',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'small',
          color: '#aaa'
      }}>
        ...
      </div>
    );
  }

  // If there is an image source, render the image tag
  return (
    <img
      src={imageSrc}
      alt="Captured image"
      style={{
        display: 'block',       // Prevents extra space below the image
        width: '100%',          // Make image responsive within its container
        height: 'auto',         // Maintain aspect ratio
        border: '0px solid lightgrey', // Optional border
        objectFit: 'contain',   // Ensure the whole image fits without distortion
      }}
    />
  );
}