import { action } from "./_generated/server";
import { v } from "convex/values";

export const analyzeOutfit = action({
  args: {
    topUrl: v.string(),
    bottomUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set.");
      }

      // Fetch images and convert to base64
      const topResponse = await fetch(args.topUrl);
      const topBuffer = await topResponse.arrayBuffer();
      const topBase64 = Buffer.from(topBuffer).toString('base64');
      const topMimeType = topResponse.headers.get("content-type") || "image/jpeg";

      const bottomResponse = await fetch(args.bottomUrl);
      const bottomBuffer = await bottomResponse.arrayBuffer();
      const bottomBase64 = Buffer.from(bottomBuffer).toString('base64');
      const bottomMimeType = bottomResponse.headers.get("content-type") || "image/jpeg";

      // Call Gemini API REST Endpoint
      // We will use gemini-1.5-pro as it handles multi-image well.
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;

      const prompt = "You are a professional fashion stylist and image consultant. The user has selected these two clothing items for a virtual outfit: a top and a bottom. As an expert, analyze how well they go together. Respond in a friendly, enthusiastic tone. Mention color matching, style compatibility (e.g., casual, formal), body proportions, and suggestions on what kind of shoes or accessories would complete the look. Format your response into a readable HTML format (using <b>, <ul>, <li>, <p> etc.) but do not include the outer HTML or body tags - just the inner content.";

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: topMimeType,
                  data: topBase64
                }
              },
              {
                inlineData: {
                  mimeType: bottomMimeType,
                  data: bottomBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error details:", errorText);
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      
      const analysisText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!analysisText) {
          throw new Error("Failed to parse Gemini response.");
      }

      return analysisText;
    } catch (error: any) {
      console.error("analyzeOutfit error:", error);
      throw new Error(error.message || "Failed to analyze outfit.");
    }
  },
});
