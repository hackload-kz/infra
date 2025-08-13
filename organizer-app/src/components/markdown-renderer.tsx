'use client'

import { marked } from 'marked'
import { useEffect, useState } from 'react'

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [htmlContent, setHtmlContent] = useState('')

  useEffect(() => {
    // Configure marked for better rendering
    marked.setOptions({
      gfm: true,
      breaks: true
    })

    // Convert markdown to HTML
    const processMarkdown = async () => {
      try {
        const rawHtml = await marked(content)
        
        // Basic sanitization - remove potentially dangerous elements
        const cleanHtml = rawHtml
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+="[^"]*"/gi, '')
          .replace(/on\w+='[^']*'/gi, '')
        
        setHtmlContent(cleanHtml)
      } catch (error) {
        console.error('Error processing markdown:', error)
        setHtmlContent('<p>Error rendering documentation</p>')
      }
    }
    
    processMarkdown()
  }, [content])

  return (
    <div 
      className="prose prose-invert prose-slate max-w-none
        prose-headings:text-white
        prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6 prose-h1:border-b prose-h1:border-slate-700 prose-h1:pb-4
        prose-h2:text-2xl prose-h2:font-semibold prose-h2:mb-4 prose-h2:mt-8
        prose-h3:text-xl prose-h3:font-semibold prose-h3:mb-3 prose-h3:mt-6
        prose-h4:text-lg prose-h4:font-semibold prose-h4:mb-2 prose-h4:mt-4
        prose-p:text-slate-300 prose-p:mb-4 prose-p:leading-relaxed
        prose-ul:text-slate-300 prose-ul:mb-4 prose-ul:list-disc prose-ul:list-inside prose-ul:space-y-2
        prose-ol:text-slate-300 prose-ol:mb-4 prose-ol:list-decimal prose-ol:list-inside prose-ol:space-y-2
        prose-li:text-slate-300
        prose-code:bg-slate-700/50 prose-code:text-amber-400 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono
        prose-pre:bg-slate-800 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-lg prose-pre:p-4 prose-pre:mb-4 prose-pre:overflow-x-auto
        prose-pre:text-slate-300
        prose-blockquote:border-l-4 prose-blockquote:border-amber-400 prose-blockquote:pl-4 prose-blockquote:py-2 
        prose-blockquote:mb-4 prose-blockquote:bg-slate-800/30 prose-blockquote:italic prose-blockquote:text-slate-300
        prose-table:border prose-table:border-slate-700 prose-table:rounded-lg prose-table:mb-4
        prose-thead:bg-slate-800
        prose-tbody:bg-slate-900/50
        prose-tr:border-b prose-tr:border-slate-700
        prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:text-white prose-th:font-semibold
        prose-td:px-4 prose-td:py-3 prose-td:text-slate-300
        prose-a:text-amber-400 prose-a:underline hover:prose-a:text-amber-300
        prose-strong:text-white prose-strong:font-semibold
        prose-em:text-slate-300 prose-em:italic"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}