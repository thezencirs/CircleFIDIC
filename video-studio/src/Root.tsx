// Copyright (c) 2026 thezencirs - Circle FIDIC Remotion Compositions (9:16 Reels + 16:9 Presentation)
import React from "react";
import { Composition } from "remotion";
import manifest from "./scenes_manifest.json";
import { FidicMotionVideo } from "./FidicMotionVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FidicReels9x16"
        component={FidicMotionVideo}
        durationInFrames={manifest.totalFrames}
        fps={manifest.fps}
        width={1080}
        height={1920}
        defaultProps={{ orientation: "portrait" as const }}
      />
      <Composition
        id="FidicDeck16x9"
        component={FidicMotionVideo}
        durationInFrames={manifest.totalFrames}
        fps={manifest.fps}
        width={1920}
        height={1080}
        defaultProps={{ orientation: "landscape" as const }}
      />
    </>
  );
};
