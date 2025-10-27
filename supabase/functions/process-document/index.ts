import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as pdfjsLib from "npm:pdfjs-dist@4.0.379";
import Tesseract from "npm:tesseract.js@5.0.4";
import * as chrono from "npm:chrono-node@2";
import OpenAI from "npm:openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractedEvent {
  title: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  category: string;
  priority: string;
  confidence: number;
}

function cleanOCRText(text: string): string {
  let cleaned = text
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])([0-9])/g, '$1 $2');

  cleaned = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return cleaned;
}

async function extractEventsWithGPT(text: string, openaiApiKey: string): Promise<ExtractedEvent[]> {
  try {
    const openai = new OpenAI({ apiKey: openaiApiKey });

    const prompt = `Extract all calendar events, tasks, deadlines, assignments, exams, and meetings from the following text. For each event, identify:
- title (concise, descriptive)
- description (optional, 1-2 sentences)
- event_date (YYYY-MM-DD format)
- start_time (HH:MM:SS format if time mentioned, otherwise null)
- end_time (HH:MM:SS format if time mentioned, otherwise null)
- location (if mentioned)
- category (one of: assignment, exam, meeting, deadline, milestone, other)
- priority (one of: critical, high, medium, low based on urgency indicators like "urgent", "final", "important")
- confidence (0-100, how confident you are this is a real event)

Return ONLY a JSON array of events. No markdown, no explanation, just the JSON array.

Text to analyze:
${text.substring(0, 8000)}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT');
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const events = JSON.parse(jsonStr);

    return events.map((event: any) => ({
      title: event.title || 'Untitled Event',
      description: event.description || undefined,
      event_date: event.event_date,
      start_time: event.start_time || undefined,
      end_time: event.end_time || undefined,
      location: event.location || undefined,
      category: event.category || 'other',
      priority: event.priority || 'medium',
      confidence: event.confidence || 75,
    }));
  } catch (error) {
    console.error('GPT extraction failed:', error);
    return [];
  }
}

function extractEventsFromText(text: string): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  const customChrono = chrono.casual.clone();

  customChrono.refiners.push({
    refine: (context, results) => {
      results.forEach(result => {
        if (result.text.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/)) {
          result.start.assign('hour', 0);
          result.start.assign('minute', 0);
        }
      });
      return results;
    }
  });

  const parsedDates = customChrono.parse(text, new Date(), { forwardDate: true });
  
  const eventKeywords = {
    assignment: ['assignment', 'homework', 'hw', 'project', 'essay', 'paper'],
    exam: ['exam', 'test', 'quiz', 'midterm', 'final'],
    meeting: ['meeting', 'conference', 'call', 'discussion', 'standup'],
    deadline: ['deadline', 'due', 'submit', 'submission'],
    milestone: ['milestone', 'release', 'launch', 'delivery'],
  };
  
  const priorityKeywords = {
    critical: ['urgent', 'critical', 'asap', 'emergency', 'final', 'midterm'],
    high: ['important', 'priority', 'high'],
    medium: ['moderate', 'medium'],
    low: ['low', 'optional', 'nice to have'],
  };

  for (const parsed of parsedDates) {
    const startIndex = Math.max(0, parsed.index - 100);
    const endIndex = Math.min(text.length, parsed.index + parsed.text.length + 100);
    const context = text.substring(startIndex, endIndex);
    
    const contextLines = context.split('\n').map(l => l.trim()).filter(l => l);
    let title = contextLines[0] || parsed.text;
    
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    
    let category = 'other';
    let priority = 'medium';
    let confidence = 70;
    
    const lowerContext = context.toLowerCase();
    
    for (const [cat, keywords] of Object.entries(eventKeywords)) {
      if (keywords.some(kw => lowerContext.includes(kw))) {
        category = cat;
        confidence += 10;
        break;
      }
    }
    
    for (const [pri, keywords] of Object.entries(priorityKeywords)) {
      if (keywords.some(kw => lowerContext.includes(kw))) {
        priority = pri;
        confidence += 5;
        break;
      }
    }
    
    const locationMatch = lowerContext.match(/(?:room|location|at|in)\s+([A-Z0-9][A-Za-z0-9\s-]+(?:room|hall|center|building)?)/i);
    const location = locationMatch ? locationMatch[1].trim() : undefined;
    
    if (parsed.start && parsed.start.isCertain('day')) {
      confidence += 10;
    }
    
    const startDate = parsed.start.date();
    const event: ExtractedEvent = {
      title: title,
      description: contextLines.slice(1, 3).join(' ') || undefined,
      event_date: startDate.toISOString().split('T')[0],
      start_time: parsed.start.isCertain('hour') ? 
        `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}:00` : 
        undefined,
      end_time: parsed.end ? 
        (() => {
          const endDate = parsed.end!.date();
          return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}:00`;
        })() : 
        undefined,
      location,
      category,
      priority,
      confidence: Math.min(confidence, 98),
    };
    
    events.push(event);
  }
  
  return events;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { documentId } = await req.json();
    if (!documentId) {
      throw new Error('Missing documentId');
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .maybeSingle();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    await supabase
      .from('documents')
      .update({ status: 'processing', progress: 10 })
      .eq('id', documentId);

    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download file');
    }

    await supabase
      .from('documents')
      .update({ progress: 30 })
      .eq('id', documentId);

    const startTime = Date.now();
    let extractedText = '';

    if (document.file_type === 'application/pdf') {
      const arrayBuffer = await fileData.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');

        if (pageText.trim().length > 50) {
          extractedText += pageText + '\n';
        } else {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = new OffscreenCanvas(viewport.width, viewport.height);
          const context = canvas.getContext('2d');

          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const blob = await canvas.convertToBlob({ type: 'image/png' });
            const buffer = await blob.arrayBuffer();

            const result = await Tesseract.recognize(new Uint8Array(buffer), 'eng', {
              tessedit_pageseg_mode: Tesseract.PSM.AUTO,
              tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
            });

            extractedText += result.data.text + '\n';
          }
        }

        const progress = 30 + Math.floor((i / pdf.numPages) * 40);
        await supabase
          .from('documents')
          .update({ progress })
          .eq('id', documentId);
      }
    } else if (document.file_type.startsWith('image/')) {
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const result = await Tesseract.recognize(buffer, 'eng', {
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,;:!?-()[]{}/@#$%&*+=',
      });
      extractedText = result.data.text;

      await supabase
        .from('documents')
        .update({ progress: 70 })
        .eq('id', documentId);
    } else {
      extractedText = await fileData.text();

      await supabase
        .from('documents')
        .update({ progress: 70 })
        .eq('id', documentId);
    }

    extractedText = cleanOCRText(extractedText);

    await supabase
      .from('documents')
      .update({ progress: 75 })
      .eq('id', documentId);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    let events: ExtractedEvent[] = [];

    if (openaiApiKey && extractedText.length > 100) {
      events = await extractEventsWithGPT(extractedText, openaiApiKey);

      if (events.length === 0) {
        events = extractEventsFromText(extractedText);
      }
    } else {
      events = extractEventsFromText(extractedText);
    }

    await supabase
      .from('documents')
      .update({ progress: 85 })
      .eq('id', documentId);

    if (events.length > 0) {
      const eventsToInsert = events.map(event => ({
        ...event,
        document_id: documentId,
        user_id: document.user_id,
      }));

      const { error: eventsError } = await supabase
        .from('extracted_events')
        .insert(eventsToInsert);

      if (eventsError) {
        console.error('Error inserting events:', eventsError);
      }
    }

    const processingTime = (Date.now() - startTime) / 1000;

    await supabase
      .from('documents')
      .update({
        status: 'completed',
        progress: 100,
        extracted_text: extractedText.substring(0, 5000),
        processing_time: processingTime,
      })
      .eq('id', documentId);

    return new Response(
      JSON.stringify({
        success: true,
        eventsCount: events.length,
        processingTime,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing document:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});