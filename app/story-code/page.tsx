"use client";

import { useState, useEffect } from "react";

interface Scene {
  scene_number: number;
  title: string;
  prompt: string;
  subtitle?: string;
  image?: string;
  asset_id?: string;
  loading?: boolean;
  videoLoading?: boolean;
  videoUrl?: string;
  videoPath?: string;
}

export default function Page() {
  const [storyIdea, setStoryIdea] = useState("");

  const [audience, setAudience] = useState("Teen");
  const [characters, setCharacters] = useState(2);
  const [scenesCount, setScenesCount] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");

  const [loadingStory, setLoadingStory] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);

  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedScenes, setGeneratedScenes] = useState<Scene[]>([]);

  const [animateMode, setAnimateMode] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");

  const [generatingFinalMovie, setGeneratingFinalMovie] = useState(false);
  const [finalMovieUrl, setFinalMovieUrl] = useState("");

  const [subtitleTextColor, setSubtitleTextColor] = useState("#ffff00");

  const [subtitleBgColor, setSubtitleBgColor] = useState("#000000");

  const [musicList, setMusicList] = useState<string[]>([]);

  const [selectedMusic, setSelectedMusic] = useState("");

  const [uploadedMusic, setUploadedMusic] = useState<File | null>(null);

  const [musicVolume, setMusicVolume] = useState(0.3);

  // =========================================================
  // FETCH BACKGROUND MUSIC LIST
  // =========================================================

  useEffect(() => {

    const fetchMusic = async () => {

      try {

        const res = await fetch(
          "http://localhost:8000/story-subtitles/bg-music-list"
        );

        const data = await res.json();

        setMusicList(data.music || []);

      } catch (err) {

        console.error(err);

      }

    };

    fetchMusic();

  }, []);

  // =========================================================
  // AUTO PROMPT BUILDER
  // =========================================================

  const fullPrompt = `
${storyIdea}

Audience: ${audience}
Number of Characters: ${characters}
Number of Scenes: ${scenesCount}
Aspect Ratio: ${aspectRatio}
`;

  // =========================================================
  // GENERATE STORY
  // =========================================================

  const generateStory = async () => {
    try {
      setLoadingStory(true);

      const response = await fetch(
        "http://localhost:8000/story-line/generate-story",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            story_idea: fullPrompt,
            style: "Cinematic storytelling",
            audience,
            niche: "Fantasy Adventure",
            mood: "Emotional",
            number_of_chapters: scenesCount,
            number_of_characters: characters,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate story");
      }

      const result = await response.json();

      const data = result.story;

      setGeneratedTitle(data.title || "Untitled Story");

      const scenes: Scene[] = data.story.map(
        (chapter: any, index: number) => ({
          scene_number: index + 1,
          title: chapter.title,
          prompt: chapter.prompt,
          subtitle: chapter.subtitle,
          image: "",
          loading: false,
        })
      );

      setGeneratedScenes(scenes);

    } catch (error) {
      console.error(error);
      alert("Failed to generate story");
    } finally {
      setLoadingStory(false);
    }
  };

  // =========================================================
  // UPDATE SCENE PROMPT
  // =========================================================

  const updateScenePrompt = (
    index: number,
    value: string
  ) => {
    const updated = [...generatedScenes];

    updated[index].prompt = value;

    setGeneratedScenes(updated);
  };

  // =========================================================
  // GENERATE SINGLE IMAGE
  // =========================================================

  const generateImage = async (index: number) => {
    try {
      const updated = [...generatedScenes];

      updated[index].loading = true;

      setGeneratedScenes([...updated]);

      const response = await fetch(
        "http://localhost:8000/story-line/generate-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: generatedScenes[index].prompt,
            aspect_ratio: aspectRatio,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate image");
      }

      const result = await response.json();

      updated[index].image = result.image_url;
      updated[index].asset_id = result.asset_id;
      updated[index].loading = false;

      setGeneratedScenes([...updated]);

    } catch (error) {
      console.error(error);

      const updated = [...generatedScenes];

      updated[index].loading = false;

      setGeneratedScenes([...updated]);

      alert("Image generation failed");
    }
  };

  // =========================================================
  // ANIMATE SCENE
  // =========================================================

  const animateScene = async (index: number) => {
    try {
      const scene = generatedScenes[index];

      const updated = [...generatedScenes];
      updated[index].videoLoading = true;
      setGeneratedScenes([...updated]);

      const response = await fetch(
        "http://localhost:8000/story-line-videos/generate-video",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: scene.prompt,
             image_url: scene.image,
            duration_type: "8s",
            aspect_ratio: aspectRatio,
            subtitle: scene.subtitle,
            voice: selectedVoice,
            animate: animateMode,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Video generation failed");
      }

      updated[index].videoUrl = result.download_url;
      updated[index].videoPath = result.local_path;
      updated[index].videoLoading = false;

      setGeneratedScenes([...updated]);

    } catch (err) {
      console.error(err);

      const updated = [...generatedScenes];
      updated[index].videoLoading = false;
      setGeneratedScenes([...updated]);
    }
  };

  // =========================================================
  // GENERATE ALL IMAGES
  // =========================================================

  const generateAllImages = async () => {
    try {
      setLoadingImages(true);

      for (let i = 0; i < generatedScenes.length; i++) {
        await generateImage(i);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoadingImages(false);
    }
  };

  return (
   <main className="min-h-screen bg-black text-white">

    <div className="grid grid-cols-1 lg:grid-cols-12 h-screen">

      {/* ===================================================== */}
      {/* LEFT SIDEBAR */}
      {/* ===================================================== */}

      <div className="lg:col-span-3 border-r border-zinc-800 overflow-y-auto">

        <div className="p-6">

          {/* HEADER */}

          <div className="mb-10">

            <h1 className="text-3xl font-bold mb-3">
              AI Story Studio
            </h1>

            <p className="text-gray-400 text-sm leading-relaxed">
              Generate cinematic AI stories and scenes.
            </p>

          </div>

          {/* STORY IDEA */}

          <div className="mb-6">

            <label className="block mb-3 text-sm text-gray-300">
              Story Idea
            </label>

            <textarea
              value={storyIdea}
              onChange={(e) => setStoryIdea(e.target.value)}
              placeholder="Write your story idea..."
              className="w-full h-48 bg-zinc-900 border border-zinc-700 rounded-2xl p-4 outline-none resize-none focus:border-white"
            />

          </div>

          {/* AUDIENCE */}

          <div className="mb-5">

            <label className="block mb-2 text-sm text-gray-300">
              Audience
            </label>

            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3"
            >
              <option>Kids</option>
              <option>Teen</option>
              <option>Adult</option>
            </select>

          </div>

          {/* CHARACTERS */}

          <div className="mb-5">

            <label className="block mb-2 text-sm text-gray-300">
              Number of Characters
            </label>

            <select
              value={characters}
              onChange={(e) =>
                setCharacters(Number(e.target.value))
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3"
            >
              {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>

          </div>

          {/* SCENES */}

          <div className="mb-5">

            <label className="block mb-2 text-sm text-gray-300">
              Number of Scenes
            </label>

            <select
              value={scenesCount}
              onChange={(e) =>
                setScenesCount(Number(e.target.value))
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3"
            >
              {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>

          </div>

          {/* ASPECT RATIO */}

          <div className="mb-8">

            <label className="block mb-2 text-sm text-gray-300">
              Aspect Ratio
            </label>

            <select
              value={aspectRatio}
              onChange={(e) =>
                setAspectRatio(e.target.value)
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3"
            >
              <option>16:9</option>
              <option>9:16</option>
            </select>

          </div>

          {/* FINAL PROMPT */}

          <div className="mb-8">

            <label className="block mb-3 text-sm text-gray-300">
              AI Prompt
            </label>

            <textarea
              readOnly
              value={fullPrompt}
              className="w-full h-48 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-gray-400 resize-none"
            />

          </div>

          {/* MODE TOGGLE */}

          <div className="mb-6">

            <label className="block mb-2 text-sm text-gray-300">
              Movie Mode
            </label>

            <div className="flex gap-3">

              <button
                onClick={() => setAnimateMode(false)}
                className={`flex-1 py-2 rounded-xl ${
                  !animateMode
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-white"
                }`}
              >
                Image Mode
              </button>

              <button
                onClick={() => setAnimateMode(true)}
                className={`flex-1 py-2 rounded-xl ${
                  animateMode
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-white"
                }`}
              >
                Animate Mode
              </button>

            </div>

          </div>

          {/* SUBTITLE SETTINGS */}

        <div className="mb-6">

          <label className="block mb-3 text-sm text-gray-300">
            Subtitle Text Color
          </label>

          <input
            type="color"
            value={subtitleTextColor}
            onChange={(e) =>
              setSubtitleTextColor(e.target.value)
            }
            className="w-full h-14 bg-zinc-900 border border-zinc-700 rounded-xl p-2"
          />

        </div>

        <div className="mb-6">

          <label className="block mb-3 text-sm text-gray-300">
            Subtitle Background Color
          </label>

          <input
            type="color"
            value={subtitleBgColor}
            onChange={(e) =>
              setSubtitleBgColor(e.target.value)
            }
            className="w-full h-14 bg-zinc-900 border border-zinc-700 rounded-xl p-2"
          />

        </div>

        {/* VOICE SELECTOR */}

          <div className="mb-6">

            <label className="block mb-2 text-sm text-gray-300">
              Voice
            </label>

            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3"
            >
              <option value="en-US-AriaNeural">Aria (Female)</option>
              <option value="en-US-GuyNeural">Guy (Male)</option>
              <option value="en-GB-SoniaNeural">Sonia (UK Female)</option>
            </select>

          </div>

          {/* BACKGROUND MUSIC */}

        <div className="mb-8">

          <label className="block mb-3 text-sm text-gray-300">
            Background Music
          </label>

          {/* MUSIC LIST */}

          <select
            value={selectedMusic}
            onChange={(e) => {

              setSelectedMusic(
                e.target.value
              );

              setUploadedMusic(null);

            }}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 mb-4"
          >

            <option value="">
              No Background Music
            </option>

            {musicList.map((music) => (

              <option
                key={music}
                value={music}
              >
                {music}
              </option>

            ))}

          </select>

          {/* BUILT-IN MUSIC PREVIEW */}

          {selectedMusic && (

            <audio
              controls
              className="w-full mb-4"
            >

              <source
                src={`http://localhost:8000/bg_music/${selectedMusic}`}
              />

            </audio>

          )}

          {/* UPLOAD CUSTOM MUSIC */}

          <div className="mb-4">

            <label className="block mb-2 text-sm text-gray-400">
              Upload Custom Music
            </label>

            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {

                if (e.target.files?.[0]) {

                  setUploadedMusic(
                    e.target.files[0]
                  );

                  setSelectedMusic("");

                }

              }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3"
            />

          </div>

          {/* CUSTOM MUSIC PREVIEW */}

          {uploadedMusic && (

            <audio
              controls
              className="w-full mb-4"
            >

              <source
                src={URL.createObjectURL(uploadedMusic)}
              />

            </audio>

          )}

          {/* MUSIC VOLUME */}

          <div>

            <label className="block mb-3 text-sm text-gray-300">
              Music Volume ({musicVolume})
            </label>

            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={musicVolume}
              onChange={(e) =>
                setMusicVolume(Number(e.target.value))
              }
              className="w-full"
            />

          </div>

        </div>

        {/* BUTTONS */}

          <div className="space-y-4">

            <button
              onClick={generateStory}
              disabled={loadingStory}
              className="w-full bg-white text-black py-4 rounded-2xl font-semibold"
            >
              {loadingStory
                ? "Generating Story..."
                : "Generate Story"}
            </button>

            {generatedScenes.length > 0 && (

              <button
                onClick={generateAllImages}
                disabled={loadingImages}
                className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-semibold transition"
              >
                {loadingImages
                  ? "Generating Images..."
                  : "Generate All Images"}
              </button>

            )}

            {generatedScenes.length > 0 && (

              <button
                onClick={async () => {
                  try {
                    setGeneratingFinalMovie(true);

                    const cleanedScenes = generatedScenes.map(scene => ({
                      ...scene,
                      videoUrl: undefined
                    }));

                    let uploadedMusicPath = null;

                    if (uploadedMusic) {

                      const formData = new FormData();

                      formData.append(
                        "file",
                        uploadedMusic
                      );

                      const uploadRes = await fetch(
                        "http://localhost:8000/story-subtitles/upload-music",
                        {
                          method: "POST",
                          body: formData,
                        }
                      );

                      const uploadData = await uploadRes.json();

                      uploadedMusicPath =
                        uploadData.file_path;
                    }

                    const response = await fetch(
                      "http://localhost:8000/story-subtitles/generate-final-movie",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          scenes: cleanedScenes,
                          voice: selectedVoice,
                          aspect_ratio: aspectRatio,
                          animate: animateMode,
                          subtitle_text_color: subtitleTextColor,
                          subtitle_bg_color: subtitleBgColor,
                          selected_music: selectedMusic,
                          uploaded_music: uploadedMusicPath,
                          music_volume: musicVolume,
                        }),
                      }
                    );

                    const result = await response.json();

                    setFinalMovieUrl(result.download_url);

                  } catch (err) {
                    console.error(err);
                    alert("Failed to generate final movie");
                  } finally {
                    setGeneratingFinalMovie(false);
                  }
                }}
                disabled={generatingFinalMovie}
                className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-2xl font-semibold transition"
              >
                {generatingFinalMovie
                  ? "Generating Final Movie..."
                  : "Generate Final Movie"}
              </button>

            )}

          </div>

        </div>

      </div>

      {/* ===================================================== */}
      {/* CENTER - EMPTY (RESERVED FOR FUTURE) */}
      {/* ===================================================== */}

      <div className="lg:col-span-6 overflow-y-auto border-r border-zinc-800 flex flex-col items-center justify-center">

        <div className="p-6 text-center">

          {/* TITLE */}

          {generatedTitle && (

            <div>

              <h2 className="text-4xl font-bold mb-3">
                {generatedTitle}
              </h2>

              <p className="text-gray-400">
                Edit your generated cinematic scene prompts.
              </p>

            </div>

          )}

          {/* EMPTY STATE */}

          {generatedScenes.length === 0 && !generatedTitle && (

            <div>

              <h2 className="text-3xl font-bold mb-4 text-gray-600">
                No Story Generated
              </h2>

            </div>

          )}

          {/* FINAL MOVIE PREVIEW */}

          {finalMovieUrl && (

            <div className="mt-10 w-full">

              <h2 className="text-xl font-bold mb-4">
                Final Movie Preview
              </h2>

                  <video
                    src={finalMovieUrl}
                    controls
                    className="w-full rounded-2xl border border-zinc-700"
                  />

                  <a
                    href={finalMovieUrl}
                    download
                    className="inline-block mt-4 bg-white text-black px-6 py-3 rounded-xl font-semibold"
                  >
                    Download Final Movie
                  </a>

                </div>

          )}

        </div>

      </div>

      {/* ===================================================== */}
      {/* RIGHT SIDEBAR - SCENE PROMPTS & GENERATED IMAGES */}
      {/* ===================================================== */}

      <div className="lg:col-span-3 overflow-y-auto border-l border-zinc-800">

        <div className="p-6">

          {/* EMPTY */}

          {generatedScenes.length === 0 && (

            <div className="h-[70vh] flex items-center justify-center">

              <div className="text-center">

                <p className="text-gray-500">
                  Generate a story to begin.
                </p>

              </div>

            </div>

          )}

          {/* SCENES WITH PROMPTS AND IMAGES */}

          <div className="space-y-8">

            {generatedScenes.map((scene, index) => (

              <div
                key={index}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6"
              >

                {/* SCENE HEADER */}

                <div className="mb-4">

                  <h3 className="text-2xl font-bold">
                    Scene {scene.scene_number}
                  </h3>

                  <p className="text-gray-400 mt-1">
                    {scene.title}
                  </p>

                </div>

                {/* SUBTITLE */}

                <div className="mb-4">

                  <label className="block mb-2 text-xs text-gray-400">
                    Subtitle
                  </label>

                  <textarea
                    value={scene.subtitle || ""}
                    onChange={(e) => {
                      const updated = [...generatedScenes];
                      updated[index].subtitle = e.target.value;
                      setGeneratedScenes([...updated]);
                    }}
                    placeholder="Add subtitle text..."
                    className="w-full h-24 bg-black border border-zinc-700 rounded-2xl p-4 resize-none outline-none focus:border-white text-sm"
                  />

                </div>

                {/* PROMPT */}

                <div className="mb-4">

                  <label className="block mb-2 text-xs text-gray-400">
                    Prompt
                  </label>

                  <textarea
                    value={scene.prompt}
                    onChange={(e) =>
                      updateScenePrompt(
                        index,
                        e.target.value
                      )
                    }
                    className="w-full h-40 bg-black border border-zinc-700 rounded-2xl p-4 resize-none outline-none focus:border-white text-sm"
                  />

                </div>

                {/* GENERATE IMAGE BUTTON */}

                <button
                  onClick={() => generateImage(index)}
                  className="w-full bg-white text-black px-5 py-3 rounded-xl font-semibold mb-4"
                >
                  {scene.loading
                    ? "Generating..."
                    : "Generate Image"}
                </button>

                {/* IMAGE */}

                {scene.image && (

                  <div className="rounded-2xl overflow-hidden mb-4">

                    <img
                      src={scene.image}
                      alt={`Scene ${scene.scene_number}`}
                      className="w-full h-auto object-cover"
                    />

                  </div>

                )}

                {/* ANIMATE SCENE BUTTON */}

                {scene.image && (

                  <button
                    onClick={() => animateScene(index)}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-semibold mt-3 transition"
                  >
                    {scene.videoLoading
                      ? "Generating video..."
                      : "Animate Scene"}
                  </button>

                )}

                {/* VIDEO */}

                {scene.videoUrl && (

                  <div className="rounded-2xl overflow-hidden mt-4">

                    <video
                      src={scene.videoUrl}
                      controls
                      className="w-full h-auto object-cover"
                    />

                  </div>

                )}

              </div>

            ))}

          </div>

        </div>

      </div>

    </div>

  </main>
  );
}
