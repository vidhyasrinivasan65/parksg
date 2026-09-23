/**
 * api/insights.ts
 * AI Parking Advice with Google Maps Grounding using gemini-3.5-flash.
 */
import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export default async function insightsHandler(req: Request, res: Response) {
  const carparkName = (req.query.name as string || 'Singapore Carpark').trim();
  const zone = (req.query.zone as string || 'Singapore').trim();
  const lots = req.query.lots ? parseInt(req.query.lots as string, 10) : 50;
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : 1.3048;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : 103.8318;

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Give a concise 2-sentence driver tip for parking at "${carparkName}" in ${zone}, Singapore (currently ${lots} lots available). Mention the best entrance road, peak hours, or nearby landmark if known.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: lat,
                longitude: lng,
              },
            },
          },
        },
      });

      const text = response.text || '';
      // Extract grounding links as required by Gemini Maps Grounding guidelines
      const groundingChunks = (response.candidates?.[0]?.groundingMetadata as {
        groundingChunks?: Array<{
          maps?: {
            uri?: string;
            title?: string;
            placeAnswerSources?: { reviewSnippets?: Array<{ reviewText?: string }> };
          };
          web?: { uri?: string; title?: string };
        }>;
      })?.groundingChunks;

      const sources: Array<{ title: string; uri: string }> = [];
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.maps?.uri) {
            sources.push({
              title: chunk.maps.title || 'Google Maps Place',
              uri: chunk.maps.uri,
            });
          } else if (chunk.web?.uri) {
            sources.push({
              title: chunk.web.title || 'Source',
              uri: chunk.web.uri,
            });
          }
        }
      }

      if (text) {
        return res.status(200).json({
          tip: text.trim(),
          sources,
          model: 'gemini-3.5-flash',
          grounded: true,
        });
      }
    } catch {
      // If quota exhausted (429) or upstream error, fall through to smart fallback
    }
  }

  // Graceful fallback tips based on location and lot status
  let tip = `Entrance for ${carparkName} is accessible via the main building driveway.`;
  if (lots <= 10) {
    tip = `${carparkName} has only ${lots} lots remaining. Consider following the display gantries to lower basement levels or check our recommended nearby alternative.`;
  } else if (lots > 100) {
    tip = `Plentiful parking at ${carparkName} with ${lots} spaces open. Direct sheltered lift access to retail & concourse levels.`;
  } else {
    tip = `${carparkName} currently has steady turnover with ${lots} lots. Electronic ERP and parking guidance displays are active at the barrier.`;
  }

  return res.status(200).json({
    tip,
    sources: [
      {
        title: 'Google Maps',
        uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(carparkName + ' Singapore')}`,
      },
    ],
    model: 'fallback',
    grounded: false,
  });
}
