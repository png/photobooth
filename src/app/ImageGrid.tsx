// ImageGrid.tsx
import React from 'react';
// Assuming CapturedImageDisplay handles displaying the blob correctly
import { CapturedImageDisplay } from './CapturedImageDisplay';

interface ImageGridProps {
  capturedBlobs: Blob[];
}

// Use React.forwardRef to allow passing a ref to the underlying DOM element
export const ImageGrid = React.forwardRef<HTMLDivElement, ImageGridProps>(
  ({ capturedBlobs }, ref) => {

    // Helper function to get grid position styles based on image index
    const getGridPositionStyle = (index: number): React.CSSProperties => {
      switch (index) {
        case 0: // First captured image -> goes to Top Right (Row 1, Col 2)
          return { gridColumn: '2 / 3', gridRow: '1 / 2' };
        case 1: // Second captured image -> goes to Bottom Left (Row 2, Col 1)
          return { gridColumn: '1 / 2', gridRow: '2 / 2' };
        case 2: // Third captured image -> goes to Bottom Right (Row 2, Col 2)
          return { gridColumn: '2 / 3', gridRow: '2 / 2' };
        default: // Should not happen for 3 captures
          return {};
      }
    };

    return (
      // Attach the forwarded ref to the main div element
      <div
        ref={ref}
        style={{
          // --- Grid Setup ---
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)', // 2 columns
          // Define 2 rows explicitly. Using '1fr' makes them equal height,
          // assuming the container has a defined height or aspect ratio.
          // Use 'auto' or min-heights if content defines row height.
          gridTemplateRows: 'repeat(2, 1fr)',

          backgroundColor: 'white',

          // --- Background Image for the Whole Grid ---
          backgroundImage: 'url("/photoboothtemplate.png")', // Replace with your image path
          backgroundSize: 'cover', // Ensure it covers the div
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',

          // --- Sizing & Border (Adjust as needed) ---
          // Ensure the grid container has dimensions appropriate for the background
          // E.g., set a fixed size or aspect ratio
          height: '575px', // Example height (maintain aspect ratio of background)
          aspectRatio: 3/2,
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {capturedBlobs.map((blob, index) => {
          // Only render up to 3 images
          if (index < 3) {
            return (
              <div
                  key={`capture-${index}`}
                  style={{
                      ...getGridPositionStyle(index), // Apply explicit grid position
                      border: '5px solid white',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      display: 'flex', // Helps with centering/fitting image
                      justifyContent: 'center',
                      alignItems: 'center',
                      aspectRatio: 3/2
                    
                  }}
                >

                <CapturedImageDisplay capturedImageBlob={blob} />
              </div>
            );
          }
          return null; // Don't render more than 3 images
        })}

         <style jsx global>{`
            @media print {
              /* Styles to ensure background images print (browser dependent) */
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #printable-grid-wrapper > div { /* Target the grid container */
                 background-size: cover !important; /* Re-apply important styles */
                 background-position: center center !important;
                 background-repeat: no-repeat !important;
              }
            }
        `}</style>

      </div>
    );
  }
);

// Optional: Add a display name
ImageGrid.displayName = 'ImageGrid';