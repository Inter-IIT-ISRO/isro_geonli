import React from "react";
import ImageUpload from "../ImageUpload";

export default function WelcomeScreen({ 
  isUploading, 
  onImageUpload, 
  theme,
  textColor,
  secondaryTextColor 
}) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-8 max-w-4xl text-center">
        <div className="space-y-4">
          <h1 className={`${textColor} text-5xl md:text-6xl font-extrabold leading-tight`}>
            {isUploading ? "Uploading Image..." : "Upload a Remote Sensing Image"}
          </h1>
          <p className={`${secondaryTextColor} text-2xl md:text-3xl font-medium`}>
            to start a new chat
          </p>
        </div>
        {!isUploading && (
          <ImageUpload onImageSelect={onImageUpload} theme={theme} />
        )}
        {isUploading && (
          <div className={`${textColor} text-lg`}>Processing your image...</div>
        )}
      </div>
    </div>
  );
}
