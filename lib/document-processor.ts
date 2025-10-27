import { supabase } from './supabase'
import { hasRecurringTextCues } from './recurring-detection'

export async function uploadDocument(file: File, userId: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${Date.now()}.${fileExt}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(fileName, file)

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  const { data: document, error: insertError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      name: file.name,
      file_type: file.type,
      file_size: file.size,
      storage_path: fileName,
      status: 'pending',
      progress: 0,
    })
    .select()
    .single()

  if (insertError) {
    await supabase.storage.from('documents').remove([fileName])
    throw new Error(`Failed to create document record: ${insertError.message}`)
  }

  return document
}

export async function processDocument(documentId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const apiUrl = `${supabaseUrl}/functions/v1/process-document`

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify({ documentId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to process document')
  }

  return await response.json()
}

export async function getDocuments(userId: string) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch documents: ${error.message}`)
  }

  return data
}

export async function getExtractedEvents(documentId: string) {
  const { data, error } = await supabase
    .from('extracted_events')
    .select('*')
    .eq('document_id', documentId)
    .order('event_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`)
  }

  if (data) {
    for (const event of data) {
      const hasRecurringCue = hasRecurringTextCues(event.title + ' ' + (event.description || ''))
      if (hasRecurringCue && !(event as any).is_recurring_tagged) {
        await supabase
          .from('extracted_events')
          .update({ metadata: { ...event.metadata, has_recurring_cue: true } })
          .eq('id', event.id)
      }
    }
  }

  return data
}

export async function deleteDocument(documentId: string) {
  const { data: document, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch document: ${fetchError.message}`)
  }

  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([document.storage_path])

  if (storageError) {
    console.error('Failed to delete file from storage:', storageError)
  }

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (deleteError) {
    throw new Error(`Failed to delete document: ${deleteError.message}`)
  }
}

export async function markEventAsImported(eventId: string) {
  const { error } = await supabase
    .from('extracted_events')
    .update({ is_imported: true })
    .eq('id', eventId)

  if (error) {
    throw new Error(`Failed to mark event as imported: ${error.message}`)
  }
}

export async function deleteExtractedEvent(eventId: string) {
  const { error } = await supabase
    .from('extracted_events')
    .delete()
    .eq('id', eventId)

  if (error) {
    throw new Error(`Failed to delete event: ${error.message}`)
  }
}

export async function deleteExtractedEvents(eventIds: string[]) {
  const { error } = await supabase
    .from('extracted_events')
    .delete()
    .in('id', eventIds)

  if (error) {
    throw new Error(`Failed to delete events: ${error.message}`)
  }
}

export async function importEventToCalendar(eventId: string) {
  const { data: extractedEvent, error: fetchError } = await supabase
    .from('extracted_events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError || !extractedEvent) {
    throw new Error('Failed to fetch extracted event')
  }

  const { data: calendarEvent, error: insertError } = await supabase
    .from('calendar_events')
    .insert({
      user_id: extractedEvent.user_id,
      title: extractedEvent.title,
      description: extractedEvent.description,
      event_date: extractedEvent.event_date,
      start_time: extractedEvent.start_time,
      end_time: extractedEvent.end_time,
      location: extractedEvent.location,
      category: extractedEvent.category,
      priority: extractedEvent.priority,
      source: 'extracted',
      source_id: eventId,
      is_completed: false,
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to import event to calendar: ${insertError.message}`)
  }

  await markEventAsImported(eventId)

  return calendarEvent
}
