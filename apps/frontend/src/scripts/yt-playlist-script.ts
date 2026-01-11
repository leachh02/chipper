export async function scrollAndExtractVideosWithDebug() {
  let prevVideoCount = 0;

  // Scroll until all videos are loaded
  while (true) {
    window.scrollTo(0, document.documentElement.scrollHeight);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for new content to load

    // Count the number of loaded videos
    let videos = document.querySelectorAll("ytd-playlist-video-renderer");
    console.log(`Videos loaded: ${videos.length}`);

    if (videos.length === prevVideoCount) break; // Exit if no new videos loaded
    prevVideoCount = videos.length;
  }

  console.log(`Finished scrolling! Total videos detected: ${prevVideoCount}`);

  // Extract video data
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

  console.log(`Extracted ${data.length} videos.`);
  // console.log(JSON.stringify(data, null, 2));

  return data;
}

scrollAndExtractVideosWithDebug();
