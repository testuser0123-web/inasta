
const urls = [
  "https://res.cloudinary.com/dkpqkx7q6/video/upload/v1735100000/diary/myvideo.mp4",
  "https://res.cloudinary.com/dkpqkx7q6/video/upload/diary/myvideo.mp4",
  "https://res.cloudinary.com/dkpqkx7q6/video/upload/v123/folder/subfolder/video.mov",
  "http://res.cloudinary.com/dkpqkx7q6/video/upload/v123/video_no_ext"
];

const regex = /\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/;

urls.forEach(url => {
  const matches = url.match(regex);
  console.log(`URL: ${url}`);
  if (matches && matches[1]) {
    console.log(`  Public ID: ${matches[1]}`);
  } else {
    console.log(`  NO MATCH`);
  }
});
