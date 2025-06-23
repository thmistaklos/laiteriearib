import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oyskfqpbtyjnfjlfajga.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95c2tmcXBidHlqbmZqbGZhamdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkyMTk4NzUsImV4cCI6MjAzNDc5NTg3NX0.MvE0IlFzZWuvjkHkoUwFRm7NmVzJ1WASss8YP6ZAn6Y'

export const supabase = createClient(supabaseUrl, supabaseKey)
