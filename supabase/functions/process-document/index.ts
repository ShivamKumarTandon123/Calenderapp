import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as pdfjsLib from "npm:pdfjs-dist@4.0.379";
import Tesseract from "npm:tesseract.js@5.0.4";
import * as chrono from "npm:chrono-node@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ExtractedDate {
  text_span: string;
  normalized_date: string;
  category: 'exam' | 'quiz' | 'assignment_due' | 'class_session' | 'holiday' | 'other';
  description: string;
}

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

interface ChunkMetadata {
  chunkIndex: number;
  startLine: number;
  endLine: number;
  text: string;
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

async function extractDatesFromDocument(
  text: string,
  openaiApiKey: string
): Promise<ExtractedDate[]> {
  const CHUNK_SIZE = 3000;
  const CHUNK_OVERLAP = 200;

  if (!text || text.trim().length < 50) {
    console.warn('Document text too short for extraction');
    return [];
  }

  const chunks = chunkDocument(text, CHUNK_SIZE, CHUNK_OVERLAP);
  console.log(`Processing ${chunks.length} chunks...`);

  const allDates: ExtractedDate[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i + 1}/${chunks.length}`);

    try {
      const dates = await callOpenAIForDates(chunk.text, openaiApiKey);
      allDates.push(...dates);
      console.log(`Extracted ${dates.length} dates from chunk ${i + 1}`);
    } catch (error) {
      console.error(`Failed to extract dates from chunk ${i + 1}:`, error);
    }

    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const mergedDates = mergeDatesFromChunks(allDates);
  console.log(`Total dates extracted: ${allDates.length}, after deduplication: ${mergedDates.length}`);

  return mergedDates;
}

function chunkDocument(text: string, chunkSize: number, overlap: number): ChunkMetadata[] {
  const lines = text.split('\n');
  const chunks: ChunkMetadata[] = [];

  const sections = detectSections(text);

  if (sections.length > 1) {
    sections.forEach((section, index) => {
      if (section.text.trim().length > 50) {
        chunks.push({
          chunkIndex: index,
          startLine: section.startLine,
          endLine: section.endLine,
          text: section.text
        });
      }
    });
  } else {
    let currentChunk = '';
    let startLine = 0;
    let currentLine = 0;
    let chunkIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const potentialChunk = currentChunk + (currentChunk ? '\n' : '') + line;

      if (potentialChunk.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          chunkIndex: chunkIndex++,
          startLine,
          endLine: currentLine,
          text: currentChunk
        });

        const overlapLines = Math.floor(overlap / 50);
        const overlapStart = Math.max(0, i - overlapLines);
        currentChunk = lines.slice(overlapStart, i + 1).join('\n');
        startLine = overlapStart;
        currentLine = i;
      } else {
        currentChunk = potentialChunk;
        currentLine = i;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        chunkIndex: chunkIndex++,
        startLine,
        endLine: currentLine,
        text: currentChunk
      });
    }
  }

  return chunks.length > 0 ? chunks : [{
    chunkIndex: 0,
    startLine: 0,
    endLine: lines.length - 1,
    text: text
  }];
}

function detectSections(text: string): Array<{ text: string; startLine: number; endLine: number }> {
  const lines = text.split('\n');
  const sections: Array<{ text: string; startLine: number; endLine: number }> = [];

  const sectionPatterns = [
    /^#{1,3}\s+(.+)$/i,
    /^[A-Z][A-Z\s]{3,50}$/,
    /^(Week\s+\d+|Module\s+\d+|Unit\s+\d+|Section\s+\d+)/i,
    /^(Schedule|Calendar|Important Dates|Assignments|Exams|Grading)/i,
  ];

  let currentSection: string[] = [];
  let sectionStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeader = sectionPatterns.some(pattern => pattern.test(line.trim()));

    if (isHeader && currentSection.length > 0) {
      sections.push({
        text: currentSection.join('\n'),
        startLine: sectionStart,
        endLine: i - 1
      });
      currentSection = [line];
      sectionStart = i;
    } else {
      currentSection.push(line);
    }
  }

  if (currentSection.length > 0) {
    sections.push({
      text: currentSection.join('\n'),
      startLine: sectionStart,
      endLine: lines.length - 1
    });
  }

  return sections;
}

async function callOpenAIForDates(chunk: string, apiKey: string): Promise<ExtractedDate[]> {
  const prompt = `You extract events from documents for a calendar.

Rules:
1. Only output events that contain an explicit calendar date in the text, such as:
   Nov 14, 2025
   November 14, 2025
   11/14/2025
   2025-11-14
2. Completely ignore relative or vague expressions like:
   today, tomorrow, in 10 minutes, in 3 weeks, within 30 days, for 600 hours, one month later, etc.
   If a line only contains a relative expression, do not create an event for it.
3. For each valid event output a JSON object with:
   text_span: the exact text that contained the date
   normalized_date: the date in ISO format YYYY-MM-DD
   description: a short description of what happens on that date
   category: one of exam, quiz, assignment_due, meeting, milestone, other
4. If you cannot determine a full calendar date (year, month, day) with high confidence, leave normalized_date empty and do not output that event at all.
5. Never invent dates. Never use the current date. Never use words like 'today' or 'tomorrow' as normalized_date.

Return only a JSON array of events. No markdown, no code blocks.

TEXT TO ANALYZE:
${chunk}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  let result: any;
  try {
    result = JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse JSON response:', content);
    return [];
  }

  const events = result.events || [];

  return events.map((event: any) => {
    return {
      text_span: event.text_span || '',
      normalized_date: event.normalized_date || '',
      category: event.category || 'other',
      description: event.description || ''
    };
  }).filter((date: ExtractedDate) => date.text_span.length > 0 && date.normalized_date.length > 0);
}

function mergeDatesFromChunks(allDates: ExtractedDate[]): ExtractedDate[] {
  const dateMap = new Map<string, ExtractedDate>();

  for (const date of allDates) {
    const key = `${date.normalized_date}:${date.description.toLowerCase().trim()}`;
    if (!dateMap.has(key)) {
      dateMap.set(key, date);
    }
  }

  const uniqueDates = Array.from(dateMap.values());

  const deduplicatedDates = uniqueDates.filter((date, index) => {
    for (let i = 0; i < index; i++) {
      const other = uniqueDates[i];
      if (date.normalized_date === other.normalized_date) {
        const similarity = calculateSimilarity(
          date.description.toLowerCase(),
          other.description.toLowerCase()
        );
        if (similarity > 0.8) {
          return false;
        }
      }
    }
    return true;
  });

  return deduplicatedDates.sort((a, b) =>
    a.normalized_date.localeCompare(b.normalized_date)
  );
}

function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function dateFromISODateOnly(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateLabel(eventDate: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[eventDate.getUTCMonth()];
  const day = eventDate.getUTCDate();
  const year = eventDate.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

function isRelativePhrase(text: string): boolean {
  const t = text.trim().toLowerCase();

  if (!t) return false;

  const bannedExact = [
    "today",
    "tomorrow",
    "yesterday",
    "tonight",
    "this week",
    "next week",
    "this month",
    "next month",
    "in 10 minutes",
    "in 5 minutes",
    "in a few minutes"
  ];

  if (bannedExact.includes(t)) return true;

  if (/^\d+\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)$/i.test(t)) {
    return true;
  }

  if (/^in\s+\d+\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)$/i.test(t)) {
    return true;
  }

  return false;
}

function buildEventTitle(rawDescription: string | null | undefined, eventDate: Date): string {
  const desc = (rawDescription ?? "").trim();
  const dateLabel = formatDateLabel(eventDate);

  if (!desc || isRelativePhrase(desc)) {
    return dateLabel;
  }

  return `${dateLabel} – ${desc}`;
}

function convertDatesToEvents(dates: ExtractedDate[]): ExtractedEvent[] {
  return dates
    .map(date => {
      if (!date.normalized_date || date.normalized_date.trim().length === 0) {
        return null;
      }

      const eventDate = dateFromISODateOnly(date.normalized_date);

      if (isNaN(eventDate.getTime())) {
        console.warn('Invalid date, skipping:', date.normalized_date);
        return null;
      }

      if (isRelativePhrase(date.description) || isRelativePhrase(date.text_span)) {
        console.warn('Skipping event with relative phrase:', date.description || date.text_span);
        return null;
      }

      const eventDateStr = eventDate.toISOString().split('T')[0];

      const title = buildEventTitle(date.description ?? date.text_span, eventDate);

      const categoryMap: Record<string, string> = {
        'exam': 'exam',
        'quiz': 'exam',
        'assignment_due': 'assignment',
        'meeting': 'meeting',
        'milestone': 'milestone',
        'other': 'other'
      };

      const priorityMap: Record<string, string> = {
        'exam': 'high',
        'quiz': 'medium',
        'assignment_due': 'high',
        'meeting': 'medium',
        'milestone': 'high',
        'other': 'medium'
      };

      return {
        title: title,
        description: date.text_span,
        event_date: eventDateStr,
        category: categoryMap[date.category] || 'other',
        priority: priorityMap[date.category] || 'medium',
        confidence: 90
      };
    })
    .filter((event): event is ExtractedEvent => event !== null);
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
    const eventDate = dateFromISODateOnly(eventDateStr);

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

    const formattedTitle = buildEventTitle(title, eventDate);

    const event: ExtractedEvent = {
      title: formattedTitle,
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
      console.log('Using new GPT-4.1 extraction with strict JSON');
      try {
        const extractedDates = await extractDatesFromDocument(extractedText, openaiApiKey);
        console.log(`GPT extracted ${extractedDates.length} dates`);
        events = convertDatesToEvents(extractedDates);
        console.log(`Converted to ${events.length} events`);

        if (events.length === 0) {
          console.log('GPT returned 0 events, falling back to chrono');
          events = extractEventsFromText(extractedText);
        }
      } catch (error) {
        console.error('GPT extraction failed, falling back to chrono:', error);
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