import ReactPlayer from "react-player";

export default function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="player-wrapper w-full aspect-video">
      <ReactPlayer
        src={url}
        width="100%"
        height="100%"
        controls={true} // Shows native YT play/pause/volume buttons
      />
    </div>
  );
}
