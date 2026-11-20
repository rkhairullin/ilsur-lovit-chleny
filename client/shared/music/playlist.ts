export function orderMusicTracks(files: Record<string, string>) {
  return Object.keys(files)
    .sort()
    .map((name) => files[name]!);
}

export const musicTracks = orderMusicTracks(
  import.meta.glob<string>("./tracks/*.mp3", {
    eager: true,
    import: "default",
    query: "?url",
  }),
);
