import React from 'react';

export default function KeyPointsInput({ 
  keyPoints, 
  useSimpleInput, 
  bookType, 
  getRequiredKeyPoints,
  onKeyPointChange,
  onKeyPointEnter,
  onSubmitKeyPoints,
  onSkipKeyPoints,
  onToggleSimpleInput,
  keyPointRefs 
}) {
  if (useSimpleInput) {
    return null; // Simple input is handled in the main chat input
  }

  return (
    <div className="p-3 keypointBg">
      <p className="text-dark mb-2">
        Please enter {getRequiredKeyPoints()} key points you'd like to include in this chapter:
      </p>
      <div className="scrollable-keypoints mb-2">
        {keyPoints.map((point, idx) => (
          <input
            key={idx}
            type="text"
            className="keypoint-input"
            value={point}
            placeholder={`Key Point ${idx + 1}`}
            onChange={(e) => onKeyPointChange(e, idx)}
            onKeyDown={(e) => onKeyPointEnter(e, idx)}
            ref={(el) => (keyPointRefs.current[idx] = el)}
          />
        ))}
      </div>
      <div className="d-flex justify-content-between">
        <button className="btn-chat" onClick={onSubmitKeyPoints}>
          Submit Key Points
        </button>
        <div className="d-flex gap-2">
          <button className="btn-toggle-input" onClick={() => onToggleSimpleInput(true)}>
            Use simple input
          </button>
          {bookType === "Ebook" && (
            <button className="btn-toggle-input" onClick={onSkipKeyPoints}>
              Skip this step
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
