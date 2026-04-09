import { action } from "./_generated/server";
import { v } from "convex/values";

export const analyzeOutfit = action({
  args: {
    topUrl: v.optional(v.string()),
    bottomUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set.");
      }

      if (!args.topUrl && !args.bottomUrl) {
          throw new Error("No clothing items provided to analyze.");
      }

      const parts: any[] = [];
      let prompt = "";

      if (args.topUrl && args.bottomUrl) {
        prompt = "You are a professional fashion stylist. The user has selected these two items for an outfit. Analyze how well they go together. Respond in a friendly tone. Mention color matching, style, and suggestions for shoes/accessories. Format your response into readable HTML (using <b>, <ul>, <li>, <p>) without outer body tags.";
        
        const topResponse = await fetch(args.topUrl);
        parts.push({ inlineData: { mimeType: topResponse.headers.get("content-type") || "image/jpeg", data: Buffer.from(await topResponse.arrayBuffer()).toString('base64') }});
        
        const bottomResponse = await fetch(args.bottomUrl);
        parts.push({ inlineData: { mimeType: bottomResponse.headers.get("content-type") || "image/jpeg", data: Buffer.from(await bottomResponse.arrayBuffer()).toString('base64') }});
      } else if (args.topUrl) {
        prompt = "You are a professional fashion stylist. The user has selected this top. Analyze its style, color, and fit. Suggest what kind of bottoms, shoes, and accessories would complete the look. Format your response into readable HTML (using <b>, <ul>, <li>, <p>) without outer body tags.";
        const topResponse = await fetch(args.topUrl);
        parts.push({ inlineData: { mimeType: topResponse.headers.get("content-type") || "image/jpeg", data: Buffer.from(await topResponse.arrayBuffer()).toString('base64') }});
      } else if (args.bottomUrl) {
        prompt = "You are a professional fashion stylist. The user has selected this bottom. Analyze its style and color. Suggest what kind of tops, shoes, and accessories would complete the look. Format your response into readable HTML (using <b>, <ul>, <li>, <p>) without outer body tags.";
        const bottomResponse = await fetch(args.bottomUrl);
        parts.push({ inlineData: { mimeType: bottomResponse.headers.get("content-type") || "image/jpeg", data: Buffer.from(await bottomResponse.arrayBuffer()).toString('base64') }});
      }

      parts.unshift({ text: prompt });

      const payload = {
        contents: [
          {
            parts: parts
          }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
        }
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;

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
