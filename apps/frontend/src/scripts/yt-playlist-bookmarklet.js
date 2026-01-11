javascript: (async function () {
  let prevVideoCount = 0;

  while (true) {
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let videos = document.querySelectorAll("ytd-playlist-video-renderer");
    console.log(`Videos loaded: ${videos.length}`);

    if (videos.length === prevVideoCount) break;
    prevVideoCount = videos.length;
  }

  console.log(`Finished scrolling! Total videos detected: ${prevVideoCount}`);

  let videoElements = Array.from(
    document.querySelectorAll("ytd-playlist-video-renderer")
  );
  let data = videoElements.map((video, index) => {
    let title =
      video.querySelector("#video-title")?.textContent.trim() ||
      "Unknown Title";
    let link =
      "https://www.youtube.com" +
        video.querySelector("#video-title")?.getAttribute("href") || "#";
    let ariaLabel = video.querySelector("h3")?.getAttribute("aria-label") || "";
    let thumbnail =
      video.querySelector("#thumbnail a yt-image img")?.getAttribute("src") ||
      "";
    let duration =
      video.querySelector(".yt-badge-shape__text")?.textContent.trim() || "";
    let channel =
      video.querySelector("#channel-name #text a")?.textContent.trim() || "";
    return {
      index: index + 1,
      title,
      link,
      ariaLabel,
      thumbnail,
      duration,
      channel,
    };
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `watchlater.json`;
  a.click();
  URL.revokeObjectURL(url);

  alert(`Saved ${data.length} videos as ${a.download}`);
})();
