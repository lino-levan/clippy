import { FreshContext, Handlers } from "$fresh/server.ts";
import {
  type CanvasRenderingContext2D,
  createCanvas,
  loadImage,
} from "https://deno.land/x/canvas/mod.ts";

// Cache the clippy image
let clippy: Uint8Array | null = null;

interface BubbleMetrics {
  height: number;
  width: number;
  lines: string[];
  wrappedOptions: Array<{
    lines: string[];
    height: number;
  }>;
  optionsHeight: number;
}

// Function to sanitize text and remove unsupported characters
function sanitizeText(text: string): string {
  // Replace common smart quotes and dashes with basic ASCII versions
  const replacements: Record<string, string> = {
    '‘': '\'',
    '’': '\'',
    '“': '"',
    '”': '"',
    '–': '-',
    '—': '-',
    '…': '...',
  };

  // Remove zero-width spaces and other invisible characters
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // Replace smart quotes and dashes
  text = text.replace(/["'–—…]/g, char => replacements[char] || char);

  // Remove or replace other non-ASCII characters
  // Keep basic punctuation, letters, numbers, and common symbols
  return text.replace(/[^\x20-\x7E\n]/g, '');
}

function getMaxTextWidth(
  ctx: CanvasRenderingContext2D,
  message: string,
  options: string[],
): number {
  // Sanitize message and split into paragraphs
  const paragraphs = sanitizeText(message).split("\n");
  let maxWidth = Math.max(...paragraphs.map(p => ctx.measureText(p).width));

  // Check width of each sanitized option
  options.forEach((option) => {
    const sanitizedOption = sanitizeText(option);
    const optionWidth = ctx.measureText(sanitizedOption).width + 40; // Add space for radio button
    maxWidth = Math.max(maxWidth, optionWidth);
  });

  return maxWidth;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number,
): string[] {
  // Sanitize text before processing
  text = sanitizeText(text);
  
  // Split text into paragraphs
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  // Process each paragraph
  paragraphs.forEach((paragraph) => {
    // Skip empty paragraphs but preserve the newline
    if (paragraph.trim() === "") {
      lines.push("");
      return;
    }

    // If the entire paragraph fits, add it as a single line
    if (ctx.measureText(paragraph).width <= maxWidth) {
      lines.push(paragraph);
      return;
    }

    // Otherwise, do word wrapping
    const words = paragraph.split(" ");
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines;
}

function calculateBubbleMetrics(
  ctx: CanvasRenderingContext2D,
  message: string,
  options: string[],
  maxCanvasWidth: number,
  fontSize: number,
  padding: number,
): BubbleMetrics {
  // Sanitize message and options
  const sanitizedMessage = sanitizeText(message);
  const sanitizedOptions = options.map(sanitizeText);
  
  // Calculate the minimum width needed for the content
  const textWidth = getMaxTextWidth(ctx, sanitizedMessage, sanitizedOptions);
  const minBubbleWidth = textWidth + padding * 2;

  // Use the smaller of the maximum width or the needed width
  const maxWidth = Math.min(maxCanvasWidth - 250, minBubbleWidth);
  const lineHeight = fontSize * 1.4;

  // Wrap main message
  const lines = wrapText(ctx, sanitizedMessage, maxWidth - padding * 2, fontSize);
  const textHeight = lines.length * lineHeight;

  // Wrap each option
  const wrappedOptions = sanitizedOptions.map((option) => {
    const optionLines = wrapText(
      ctx,
      option,
      maxWidth - padding * 2 - 30,
      fontSize,
    );
    return {
      lines: optionLines,
      height: optionLines.length * lineHeight,
    };
  });

  // Calculate total options height including padding between options
  const optionsHeight = options.length > 0
    ? wrappedOptions.reduce((sum, opt) => sum + opt.height, 0) +
      (padding / 2) * (options.length - 1)
    : 0;

  // Add extra padding at top and bottom of options section
  const totalHeight = textHeight + optionsHeight +
    (options.length > 0 ? padding * 3 : padding * 2);
  const bubbleWidth = maxWidth + padding * 2;

  return {
    height: totalHeight,
    width: bubbleWidth,
    lines,
    wrappedOptions,
    optionsHeight,
  };
}

function drawClippyMessage(
  ctx: CanvasRenderingContext2D,
  message: string,
  maxWidth: number,
  options: string[] = [],
) {
  // Sanitize inputs
  message = sanitizeText(message);
  options = options.map(sanitizeText);
  
  // Default settings
  const backgroundColor = "#ffffcb";
  const borderColor = "#434340";
  const textColor = "#000000";
  const optionColor = "#1e90ff";
  const fontSize = 24;
  const padding = 20;
  const cornerRadius = 10;

  // Set up text properties
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = textColor;

  // Get bubble metrics
  const metrics = calculateBubbleMetrics(
    ctx,
    message,
    options,
    maxWidth,
    fontSize,
    padding,
  );

  const bubbleX = 20;
  const bubbleY = 20;

  // Draw speech bubble with rounded corners
  ctx.fillStyle = backgroundColor;
  ctx.beginPath();
  ctx.moveTo(bubbleX + cornerRadius, bubbleY);
  ctx.lineTo(bubbleX + metrics.width - cornerRadius, bubbleY);
  ctx.arcTo(
    bubbleX + metrics.width,
    bubbleY,
    bubbleX + metrics.width,
    bubbleY + cornerRadius,
    cornerRadius,
  );
  ctx.lineTo(bubbleX + metrics.width, bubbleY + metrics.height - cornerRadius);
  ctx.arcTo(
    bubbleX + metrics.width,
    bubbleY + metrics.height,
    bubbleX + metrics.width - cornerRadius,
    bubbleY + metrics.height,
    cornerRadius,
  );
  ctx.lineTo(bubbleX + metrics.width - 20, bubbleY + metrics.height);
  ctx.lineTo(bubbleX + metrics.width - 20, bubbleY + metrics.height + 30);
  ctx.lineTo(bubbleX + metrics.width - 60, bubbleY + metrics.height);
  ctx.lineTo(bubbleX + cornerRadius, bubbleY + metrics.height);
  ctx.arcTo(
    bubbleX,
    bubbleY + metrics.height,
    bubbleX,
    bubbleY + metrics.height - cornerRadius,
    cornerRadius,
  );
  ctx.lineTo(bubbleX, bubbleY + cornerRadius);
  ctx.arcTo(
    bubbleX,
    bubbleY,
    bubbleX + cornerRadius,
    bubbleY,
    cornerRadius,
  );
  ctx.closePath();
  ctx.fill();

  // Draw bubble border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw main text
  ctx.fillStyle = textColor;
  const lineHeight = fontSize * 1.4;
  let currentY = bubbleY + padding * 0.6;

  try {
    // Draw message lines with error handling
    metrics.lines.forEach((line) => {
      currentY += lineHeight;
      // Only attempt to draw the line if it's not empty
      if (line.trim() !== "") {
        try {
          ctx.fillText(line, bubbleX + padding, currentY);
        } catch (error) {
          console.error(`Error drawing line: "${line}"`, error);
          // Only draw fallback if the line wasn't empty
          ctx.fillText("?", bubbleX + padding, currentY);
        }
      }
    });

    // Draw options if they exist
    if (options.length > 0) {
      currentY += padding * 2;

      metrics.wrappedOptions.forEach((option) => {
        // Draw radio button circle aligned with first line
        ctx.beginPath();
        ctx.arc(
          bubbleX + padding + 10,
          currentY - fontSize / 2 + 2,
          8,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = optionColor;
        ctx.fill();

        // Draw all lines for this option with error handling
        ctx.fillStyle = textColor;
        option.lines.forEach((line) => {
          try {
            ctx.fillText(line, bubbleX + padding + 30, currentY);
          } catch (error) {
            console.error(`Error drawing option line: "${line}"`, error);
            ctx.fillText("?", bubbleX + padding + 30, currentY);
          }
          currentY += lineHeight;
        });

        currentY += padding / 2;
      });
    }
  } catch (error) {
    console.error("Error in drawClippyMessage:", error);
    // Draw fallback message if there's a critical error
    ctx.fillText("Error displaying message", bubbleX + padding, bubbleY + padding + lineHeight);
  }

  return {
    width: Math.max(metrics.width + bubbleX * 2, 250),
    height: metrics.height,
  };
}

const imageCache = await caches.open("image-cache");

export const handler: Handlers = {
  async GET(req: Request, _ctx: FreshContext) {
    try {
      const cachedResponse = await imageCache.match(req);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Load and cache clippy image
      if (!clippy) {
        clippy = Deno.readFileSync("./static/clippy.png");
      }
      const image = await loadImage(clippy);

      const maxWidth = 600;
      const clippyHeight = 200;
      const padding = 40;

      const url = new URL(req.url);

      // Decode URL parameters and sanitize inputs
      const transparent = url.searchParams.get("transparent") === "true";
      const text = sanitizeText(
        decodeURIComponent(url.searchParams.get("text") || "Hello! I'm Clippy!")
      );
      const optionsParam = url.searchParams.get("options");
      const options = optionsParam
        ? decodeURIComponent(optionsParam).split("|").map(sanitizeText)
        : [];

      // Create temporary canvas to calculate dimensions
      const tempCanvas = createCanvas(maxWidth, 100);
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.font = "24px Arial";

      // Draw on temporary canvas to get required dimensions
      const dimensions = drawClippyMessage(tempCtx, text, maxWidth, options);
      const canvasWidth = dimensions.width + 200;
      const canvasHeight = Math.max(
        dimensions.height + padding + clippyHeight,
        clippyHeight + 40,
      );

      // Create actual canvas with calculated dimensions
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext("2d");

      // Clear canvas
      if (transparent) {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // Draw the speech bubble and message
      drawClippyMessage(ctx, text, maxWidth, options);

      // Draw Clippy image
      ctx.drawImage(image, canvasWidth - 200, canvasHeight - 200, 200, 200);

      const response = new Response(canvas.toBuffer(), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable"
        },
      });
      await imageCache.put(req, response.clone());
      return response;
    } catch (error) {
      console.error("Error in handler:", error);
      // Return a simple error image
      const errorCanvas = createCanvas(400, 300);
      const ctx = errorCanvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 300);
      ctx.fillStyle = "#000000";
      ctx.font = "24px Arial";
      ctx.fillText("Error generating image", 50, 150);
      
      return new Response(errorCanvas.toBuffer(), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000, immutable"
        },
      });
    }
  },
};
