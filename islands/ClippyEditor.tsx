import { useSignal } from "@preact/signals";
import { useState, useEffect } from "preact/hooks";
import IconPlus from "icons/plus.tsx";
import IconX from "icons/x.tsx";
import IconPencil from "icons/pencil.tsx";
import IconCheck from "icons/check.tsx";
import IconShare from "icons/share.tsx";
import IconLoader2 from "icons/loader-2.tsx";
import IconUpload from "icons/upload.tsx";

interface ClippyEditorProps {
  initialText?: string;
  initialOptions?: string[];
}

export default function ClippyEditor({ initialText = "Hello! I'm Clippy!", initialOptions = [] }: ClippyEditorProps) {
  const [text, setText] = useState(initialText);
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [newOption, setNewOption] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isTransparent, setIsTransparent] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  
  const previewUrl = useSignal(`/r?text=${encodeURIComponent(text)}${
    options.length ? `&options=${encodeURIComponent(options.join('|'))}` : ''
  }${isTransparent ? '&transparent=true' : ''}`);

  useEffect(() => {
    previewUrl.value = `/r?text=${encodeURIComponent(text)}${
      options.length ? `&options=${encodeURIComponent(options.join('|'))}` : ''
    }${isTransparent ? '&transparent=true' : ''}`;
  }, [text, options, isTransparent]);

  useEffect(() => {
    if (publishFeedback) {
      const timer = setTimeout(() => setPublishFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [publishFeedback]);

  const addOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingText(options[index]);
  };

  const saveEdit = () => {
    if (editingIndex !== null && editingText.trim()) {
      const newOptions = [...options];
      newOptions[editingIndex] = editingText.trim();
      setOptions(newOptions);
      setEditingIndex(null);
      setEditingText("");
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingIndex !== null) {
        saveEdit();
      } else if (newOption.trim()) {
        addOption();
      }
    }
  };

  const copyToClipboard = async () => {
    try {
      const absoluteUrl = new URL(previewUrl.value, window.location.origin).toString();
      await navigator.clipboard.writeText(absoluteUrl);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          options,
          transparent: isTransparent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish');
      }

      setPublishFeedback({
        type: 'success',
        message: 'Published successfully!',
      });
    } catch (error) {
      setPublishFeedback({
        type: 'error',
        message: 'Failed to publish. Please try again.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div class="w-full max-w-2xl mx-auto p-6">
      <div class="space-y-6 p-6">
        <div class="flex justify-between items-start gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={text}
              onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
              class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
              rows={3}
              placeholder="Enter your message here..."
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Options</label>
          <div class="flex gap-2 mb-4">
            <input
              type="text"
              value={newOption}
              onInput={(e) => setNewOption((e.target as HTMLInputElement).value)}
              onKeyPress={handleKeyPress}
              placeholder="Add an option..."
              class="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            />
            <button 
              onClick={addOption}
              disabled={!newOption.trim()}
              class={`p-2 rounded-lg text-white transition-all duration-200 ${
                newOption.trim() 
                  ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700' 
                  : 'bg-gray-200 cursor-not-allowed'
              }`}
              title="Add option"
            >
              <IconPlus class="w-5 h-5" />
            </button>
          </div>

          {options.length > 0 && (
            <ul class="space-y-2">
              {options.map((option, index) => (
                <li key={index} class="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100 transition-all duration-200 hover:border-gray-200">
                  {editingIndex === index ? (
                    <div class="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editingText}
                        onInput={(e) => setEditingText((e.target as HTMLInputElement).value)}
                        onKeyPress={handleKeyPress}
                        class="flex-1 px-3 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={saveEdit}
                        class="p-1 text-green-500 hover:text-green-600 active:text-green-700 rounded-lg hover:bg-green-50 transition-colors duration-200"
                        title="Save"
                      >
                        <IconCheck class="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span class="flex-1">{option}</span>
                      <button
                        onClick={() => startEditing(index)}
                        class="p-1 text-blue-500 hover:text-blue-600 active:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors duration-200"
                        title="Edit option"
                      >
                        <IconPencil class="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removeOption(index)}
                    class="p-1 text-red-500 hover:text-red-600 active:text-red-700 rounded-lg hover:bg-red-50 transition-colors duration-200"
                    title="Remove option"
                  >
                    <IconX class="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div class="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            id="transparent-bg"
            checked={isTransparent}
            onChange={(e) => setIsTransparent((e.target as HTMLInputElement).checked)}
            class="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="transparent-bg" class="text-sm text-gray-700">
            Enable transparent background
          </label>
        </div>
        
        <div class="flex gap-2 mt-8">
          <button
            onClick={handlePublish}
            disabled={isPublishing || !text.trim()}
            class={`px-4 py-2 rounded-lg text-white flex items-center gap-2 transition-all duration-200 ${
              isPublishing || !text.trim()
                ? 'bg-gray-200 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
            }`}
            title="Publish"
          >
            {isPublishing ? (
              <IconLoader2 class="w-5 h-5 animate-spin" />
            ) : (
              <IconUpload class="w-5 h-5" />
            )}
            <span>{isPublishing ? 'Publishing...' : 'Publish'}</span>
          </button>
          <button
            onClick={copyToClipboard}
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 border border-gray-200 rounded-lg transition-all duration-200 flex items-center gap-2 relative"
            title="Copy link"
          >
            <IconShare class="w-5 h-5 text-gray-600" />
            <span>Share</span>
            {showCopiedToast && (
              <div class="pointer-events-none	absolute left-28 px-3 py-2 bg-gray-800 w-max text-white text-sm rounded-lg shadow-lg transition-opacity duration-200">
                Copied to clipboard!
              </div>
            )}
          </button>
        </div>

        {publishFeedback && (
          <div
            class={`p-4 rounded-lg ${
              publishFeedback.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {publishFeedback.message}
          </div>
        )}

        <img 
          src={previewUrl} 
          alt="Clippy preview"
          class="max-w-full h-auto rounded-lg"
        />
      </div>
    </div>
  );
}
