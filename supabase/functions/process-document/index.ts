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
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const prompt = `You are an expert at extracting ONLY genuine calendar events from documents. Your task is to identify actual scheduled events, not random dates or references.

Current context: Today is ${currentMonth} ${today.getDate()}, ${currentYear} (${todayStr}).

CRITICAL: Extract ONLY clear, actionable events with specific dates. DO NOT extract:
- Random dates mentioned in passing without event context
- Historical references or examples
- Generic statements like "meet weekly" without specific dates
- Dates in instructional text or descriptions
- Today's date unless there's a clear event scheduled for today
- Dates that are just part of document metadata or headers

What TO extract:
- Scheduled meetings with specific dates/times
- Assignment due dates with clear deliverables
- Exam dates
- Deadlines for specific tasks or submissions
- Scheduled office hours on specific dates
- Recurring events where you can calculate specific dates (e.g., "Every Monday at 2pm" - extract the next several Mondays)

For each genuine event you find, provide:
- title: Descriptive event name (NOT just "Meeting" or "Assignment" - include the topic/subject)
- description: Additional context, requirements, or details
- event_date: Date in YYYY-MM-DD format (must be a specific future date, not today unless explicitly scheduled)
- start_time: Time in HH:MM:SS format (e.g., "14:30:00" for 2:30 PM), null if not mentioned
- end_time: End time in HH:MM:SS format, null if not mentioned
- location: Physical location or virtual meeting link
- category: Choose from: assignment, exam, meeting, deadline, milestone, other
- priority: critical (finals/major deadlines), high (major assignments/midterms), medium (regular work), low (optional)
- confidence: 60-100 (use 60-70 for ambiguous, 70-85 for clear, 85-100 for explicit events with complete info)

STRICT EXTRACTION RULES:
1. Each event MUST have a clear, specific date that can be converted to YYYY-MM-DD format
2. Event title MUST be meaningful - not just the date or a single generic word
3. There must be clear event context near the date (assignment name, meeting topic, exam subject)
4. Confidence below 60 means you should NOT extract it
5. If you can't determine what the event actually is, don't extract it
6. Today's date (${todayStr}) should ONLY be used if the document explicitly mentions an event happening today

EXAMPLES OF WHAT TO EXTRACT:
✓ "Problem Set 3 due October 15" → Extract as assignment on 2025-10-15
✓ "Midterm exam on November 5, 2-4pm in Room 301" → Extract with full details
✓ "Office hours every Tuesday 3-5pm" → Extract next several Tuesday dates
✓ "Final project presentation December 10" → Extract as milestone

EXAMPLES OF WHAT NOT TO EXTRACT:
✗ "In 2025, we will cover..." → No specific event
✗ "Meet with your team regularly" → No specific date
✗ "Last updated: October 1" → Document metadata, not an event
✗ "Classes began on September 3" → Past date reference
✗ Random words or fragments near dates without clear event context

Return ONLY a valid JSON array. No markdown, no code blocks, no explanations:
[{"title":"...","event_date":"YYYY-MM-DD",...},...]

If no genuine events are found, return an empty array: []

TEXT TO ANALYZE:
${text.substring(0, 20000)}`;

    console.log('Calling OpenAI API for event extraction...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('No response content from GPT');
      throw new Error('No response from GPT');
    }

    console.log('GPT response received, parsing JSON...');

    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    jsonStr = jsonMatch ? jsonMatch[0] : jsonStr;

    const events = JSON.parse(jsonStr);
    console.log(`Successfully parsed ${events.length} events from GPT response`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const validatedEvents = events
      .map((event: any) => {
        const eventDate = event.event_date || event.date;
        if (!eventDate) {
          console.warn('Event missing date, skipping:', event.title);
          return null;
        }

        const dateObj = new Date(eventDate);
        if (isNaN(dateObj.getTime())) {
          console.warn('Invalid date format, skipping:', eventDate);
          return null;
        }

        const minDate = new Date();
        minDate.setDate(minDate.getDate() - 7);
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 3);
        if (dateObj < minDate || dateObj > maxDate) {
          console.warn('Date out of reasonable range, skipping:', eventDate);
          return null;
        }

        const title = event.title || 'Untitled Event';
        const confidence = Math.min(Math.max(event.confidence || 75, 0), 100);

        if (title.length < 5 || title.toLowerCase().includes('untitled')) {
          console.warn('Event title too short or generic, skipping:', title);
          return null;
        }

        if (confidence < 60) {
          console.warn('Event confidence too low, skipping:', title, confidence);
          return null;
        }

        const titleLower = title.toLowerCase();
        if (titleLower.match(/^(date|time|event|meeting|assignment)$/)) {
          console.warn('Event title is generic single word, skipping:', title);
          return null;
        }

        if (eventDate === todayStr) {
          const hasTimeOrLocation = event.start_time || event.location;
          if (!hasTimeOrLocation && confidence < 80) {
            console.warn('Event date is today but lacks time/location and has low confidence, skipping:', title);
            return null;
          }
        }

        return {
          title: title,
          description: event.description || undefined,
          event_date: eventDate,
          start_time: event.start_time || undefined,
          end_time: event.end_time || undefined,
          location: event.location || undefined,
          category: event.category || 'other',
          priority: event.priority || 'medium',
          confidence: confidence,
        };
      })
      .filter((event: any) => event !== null);

    console.log(`Validated ${validatedEvents.length} events after filtering`);
    return validatedEvents;
  } catch (error) {
    console.error('GPT extraction failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    return [];
  }
}

function extractEventsFromText(text: string): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  const customChrono = chrono.casual.clone();

  customChrono.refiners.push({
    refine: (context, results) => {
      const currentYear = new Date().getFullYear();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      results.forEach(result => {
        if (!result.start.isCertain('year')) {
          const parsedMonth = result.start.get('month');
          const currentMonth = new Date().getMonth() + 1;

          if (parsedMonth && parsedMonth < currentMonth) {
            result.start.assign('year', currentYear + 1);
          } else {
            result.start.assign('year', currentYear);
          }
        }

        if (result.text.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/) && !result.start.isCertain('hour')) {
          result.start.assign('hour', 0);
          result.start.assign('minute', 0);
        }
      });
      return results;
    }
  });

  console.log('Starting chrono-node date parsing...');
  const parsedDates = customChrono.parse(text, new Date(), { forwardDate: true });
  console.log(`Found ${parsedDates.length} dates in text using chrono-node`);

  const eventKeywords = {
    assignment: ['assignment', 'homework', 'hw', 'project', 'essay', 'paper', 'report', 'lab'],
    exam: ['exam', 'test', 'quiz', 'midterm', 'final', 'assessment'],
    meeting: ['meeting', 'conference', 'call', 'discussion', 'standup', 'session', 'seminar', 'workshop'],
    deadline: ['deadline', 'due', 'submit', 'submission', 'turn in'],
    milestone: ['milestone', 'release', 'launch', 'delivery', 'presentation'],
  };

  const priorityKeywords = {
    critical: ['urgent', 'critical', 'asap', 'emergency', 'final exam', 'midterm exam'],
    high: ['important', 'priority', 'high priority', 'major', 'significant'],
    medium: ['moderate', 'medium', 'regular'],
    low: ['low', 'optional', 'nice to have', 'bonus'],
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  for (const parsed of parsedDates) {
    const startIndex = Math.max(0, parsed.index - 250);
    const endIndex = Math.min(text.length, parsed.index + parsed.text.length + 250);
    const context = text.substring(startIndex, endIndex);

    const lowerContext = context.toLowerCase();

    const hasEventKeyword =
      lowerContext.includes('due') || lowerContext.includes('deadline') ||
      lowerContext.includes('exam') || lowerContext.includes('test') ||
      lowerContext.includes('meeting') || lowerContext.includes('assignment') ||
      lowerContext.includes('project') || lowerContext.includes('presentation') ||
      lowerContext.includes('quiz') || lowerContext.includes('submit') ||
      lowerContext.includes('homework') || lowerContext.includes('class') ||
      lowerContext.includes('lecture') || lowerContext.includes('seminar') ||
      lowerContext.includes('office hours');

    if (!hasEventKeyword) {
      console.warn('Date found without event keywords in context, skipping:', parsed.text);
      continue;
    }

    const contextLines = context.split('\n').map(l => l.trim()).filter(l => l);

    let title = parsed.text;
    for (const line of contextLines) {
      if (line.length > 10 && line.length < 150 && !line.match(/^\d/) && line !== parsed.text) {
        title = line;
        break;
      }
    }

    if (title.length > 120) {
      title = title.substring(0, 117) + '...';
    }

    if (title.length < 5) {
      console.warn('Title too short, skipping:', title);
      continue;
    }

    let category = 'other';
    let priority = 'medium';
    let confidence = 50;

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

    const locationPatterns = [
      /(?:room|rm\.?)\s*([A-Z0-9][A-Za-z0-9\s-]{1,20})/i,
      /(?:location|venue|at|in)\s+([A-Z][A-Za-z\s]{3,30}(?:room|hall|center|building|lab))/i,
      /(?:building|bldg\.?)\s+([A-Z0-9][A-Za-z0-9\s-]{1,20})/i,
      /(zoom|teams|meet\.google|webex)/i,
    ];

    let location: string | undefined;
    for (const pattern of locationPatterns) {
      const match = lowerContext.match(pattern);
      if (match) {
        location = match[1]?.trim() || match[0]?.trim();
        confidence += 5;
        break;
      }
    }

    if (parsed.start && parsed.start.isCertain('day')) {
      confidence += 10;
    }
    if (parsed.start && parsed.start.isCertain('month')) {
      confidence += 5;
    }

    const startDate = parsed.start.date();

    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 7);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 3);

    if (startDate < minDate || startDate > maxDate) {
      console.warn(`Date out of range, skipping: ${startDate.toISOString()}`);
      continue;
    }

    const eventDateStr = startDate.toISOString().split('T')[0];

    if (eventDateStr === todayStr && confidence < 70) {
      console.warn('Date is today with low confidence, skipping:', title);
      continue;
    }

    if (confidence < 60) {
      console.warn('Confidence too low, skipping:', title, confidence);
      continue;
    }

    const description = contextLines.slice(1, 4)
      .filter(line => line !== title && line.length > 15)
      .join(' ');

    const event: ExtractedEvent = {
      title: title,
      description: description || undefined,
      event_date: eventDateStr,
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
      confidence: Math.min(confidence, 95),
    };

    events.push(event);
  }

  console.log(`Chrono-node extracted ${events.length} valid events`);
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

    let events: ExtractedEvent[] = [];

    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('service_name', 'openai')
      .maybeSingle();

    const openaiApiKey = apiKeyData?.api_key || Deno.env.get('OPENAI_API_KEY');

    console.log(`Extracted text length: ${extractedText.length}`);
    console.log(`OpenAI key available: ${!!openaiApiKey}`);

    if (openaiApiKey && extractedText.length > 50) {
      console.log('Using GPT extraction');
      events = await extractEventsWithGPT(extractedText, openaiApiKey);
      console.log(`GPT extracted ${events.length} events`);

      if (events.length === 0) {
        console.log('GPT returned 0 events, falling back to chrono');
        events = extractEventsFromText(extractedText);
      }
    } else {
      console.log('Using fallback chrono extraction');
      events = extractEventsFromText(extractedText);
    }

    console.log(`Total events extracted: ${events.length}`);

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