"use client";

import * as React from "react";
import { RoomEvent, Track } from "livekit-client";
import { isEqualTrackRef, isTrackReference } from "@livekit/components-core";
import {
  useTracks,
  usePinnedTracks,
  useCreateLayoutContext,
  LayoutContextProvider,
  ParticipantTile,
  TrackLoop,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
  RoomAudioRenderer,
  ConnectionStateToast,
} from "@livekit/components-react";

interface MediaConferenceProps {
  video?: boolean;
}

export const MediaConference = ({ video = true }: MediaConferenceProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const lastAutoFocusedScreenShareTrack = React.useRef<any>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false }
  );

  const layoutContext = useCreateLayoutContext();

  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => !isEqualTrackRef(track, focusTrack));

  React.useEffect(() => {
    // If screen share tracks are published, auto-pin the screen share
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      layoutContext.pin.dispatch?.({ msg: "set_pin", trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid
      )
    ) {
      layoutContext.pin.dispatch?.({ msg: "clear_pin" });
      lastAutoFocusedScreenShareTrack.current = null;
    }

    if (focusTrack && !isTrackReference(focusTrack)) {
      const updatedFocusTrack = tracks.find(
        (tr) =>
          tr.participant.identity === focusTrack.participant.identity &&
          tr.source === focusTrack.source
      );
      if (updatedFocusTrack !== focusTrack && isTrackReference(updatedFocusTrack)) {
        layoutContext.pin.dispatch?.({ msg: "set_pin", trackReference: updatedFocusTrack });
      }
    }
  }, [
    screenShareTracks
      .map((ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`)
      .join(),
    focusTrack?.publication?.trackSid,
    tracks,
  ]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const count = tracks.length;
  const isLandscape = dimensions.width >= dimensions.height;

  let cols = 1;
  let rows = 1;

  if (count <= 1) {
    cols = 1;
    rows = 1;
  } else if (count === 2) {
    cols = isLandscape ? 2 : 1;
    rows = isLandscape ? 1 : 2;
  } else if (count <= 4) {
    cols = 2;
    rows = 2;
  } else if (count <= 6) {
    cols = isLandscape ? 3 : 2;
    rows = isLandscape ? 2 : 3;
  } else if (count <= 9) {
    cols = 3;
    rows = 3;
  } else if (count <= 12) {
    cols = isLandscape ? 4 : 3;
    rows = isLandscape ? 3 : 4;
  } else if (count <= 16) {
    cols = 4;
    rows = 4;
  } else {
    cols = Math.ceil(Math.sqrt(count * (isLandscape ? 1.33 : 0.75)));
    rows = Math.ceil(count / cols);
  }

  return (
    <div className="lk-video-conference flex-1 flex flex-col h-full w-full overflow-hidden">
      <LayoutContextProvider value={layoutContext}>
        <div className="lk-video-conference-inner flex-1 flex flex-col h-full w-full overflow-hidden">
          {!focusTrack ? (
            <div className="flex-1 w-full h-[calc(100%-var(--lk-control-bar-height,69px))] p-2 overflow-hidden flex items-center justify-center">
              <div
                ref={containerRef}
                className="w-full h-full grid gap-2 overflow-hidden [&_.lk-participant-tile]:min-w-0 [&_.lk-participant-tile]:min-h-0 [&_.lk-participant-tile]:w-full [&_.lk-participant-tile]:h-full"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                }}
              >
                <TrackLoop tracks={tracks}>
                  <ParticipantTile />
                </TrackLoop>
              </div>
            </div>
          ) : (
            <div className="lk-focus-layout-wrapper flex-1">
              <FocusLayoutContainer>
                <CarouselLayout tracks={carouselTracks}>
                  <ParticipantTile />
                </CarouselLayout>
                <FocusLayout trackRef={focusTrack} />
              </FocusLayoutContainer>
            </div>
          )}
          <ControlBar controls={{ chat: false }} />
        </div>
      </LayoutContextProvider>
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
};
