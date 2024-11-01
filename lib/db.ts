/// <reference lib="deno.unstable" />
import { ulid } from "https://deno.land/std@0.224.0/ulid/mod.ts";

const kv = await Deno.openKv();

export async function publishImage(text: string, options: string[]) {
  await kv.set(["image", ulid()], {
    text,
    options,
  })
}

interface Image {
  text: string;
  options: string[];
}

export async function getPublishedImages() {
  const images = await Array.fromAsync(kv.list<Image>({ prefix: ["image"] }, { reverse: true }));
  return images.map(({ key, value }) => ({ id: key, ...value }));
}
