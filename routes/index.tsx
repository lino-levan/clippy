import { Head } from "$fresh/runtime.ts";
import { getPublishedImages } from "../lib/db.ts";
import ClippyEditor from "../islands/ClippyEditor.tsx";

export default async function Home(req: Request) {
  const url = new URL(req.url);
  const text = decodeURIComponent(
    url.searchParams.get("text") ||
      "I'm the clipper. The answermaxxer. The paperer.",
  );
  const optionsParam = url.searchParams.get("options");
  const options = optionsParam
    ? decodeURIComponent(optionsParam).split("|")
    : [];
  const embedUrl = new URL(req.url);
  embedUrl.pathname = "/r";

  // Fetch published images
  const publishedImages = await getPublishedImages();

  return (
    <>
      <Head>
        <meta name="og:image" content={embedUrl.href} />
      </Head>
      <div class="flex min-h-screen">
        {/* Sidebar */}
        <div class="w-64 bg-gray-100 p-4 overflow-y-auto">
          <h2 class="text-xl font-semibold mb-4">Published Images</h2>
          <div class="space-y-4">
            {publishedImages.map((image, index) => (
              <a
                key={index}
                href={`/?text=${encodeURIComponent(image.text)}&options=${
                  encodeURIComponent(image.options.join("|"))
                }`}
                class="block p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <img src={`/r?text=${encodeURIComponent(image.text)}&options=${
                  encodeURIComponent(image.options.join("|"))
                }`} />
              </a>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div class="flex-1 px-4 py-8">
          <div class="max-w-screen-md mx-auto flex flex-col items-center justify-center">
            <h1 class="text-4xl font-bold mb-4">The Clippy.</h1>
            <ClippyEditor initialText={text} initialOptions={options} />
          </div>
        </div>
      </div>
    </>
  );
}
