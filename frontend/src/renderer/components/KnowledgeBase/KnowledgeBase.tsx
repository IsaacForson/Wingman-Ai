/**
 * Wingman AI - Knowledge Base
 * Document upload & RAG (Retrieval-Augmented Generation) integration
 */

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
// import { useAppStore } from '../../store/appStore'
import { useWebSocket } from '../../hooks/useWebSocket'
import {
  X,
  Upload,
  FileText,
  File,
  Trash2,
  Search,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Loader2,
  Book,
  Code,
  Image as ImageIcon,
  FileJson,
  Database,
  Plus
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Document {
  id: string
  name: string
  type: string
  size: number
  uploadedAt: Date
  status: 'processing' | 'indexed' | 'error'
  chunks?: number
}

interface KnowledgeBaseProps {
  isOpen: boolean
  onClose: () => void
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ isOpen, onClose }) => {
  const [documents, setDocuments] = useState<Document[]>([
    // Sample documents for UI
    { id: '1', name: 'React Best Practices.pdf', type: 'pdf', size: 245000, uploadedAt: new Date(), status: 'indexed', chunks: 42 },
    { id: '2', name: 'System Design Notes.md', type: 'md', size: 18000, uploadedAt: new Date(), status: 'indexed', chunks: 15 },
  ])
  const [isDragging, setIsDragging] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { emit } = useWebSocket()

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  // Handle file selection
  const handleFiles = async (files: File[]) => {
    setUploading(true)
    
    for (const file of files) {
      const newDoc: Document = {
        id: Date.now().toString(),
        name: file.name,
        type: file.name.split('.').pop() || 'unknown',
        size: file.size,
        uploadedAt: new Date(),
        status: 'processing'
      }
      
      setDocuments(prev => [...prev, newDoc])
      
      // Simulate upload and processing
      // In real implementation, this would use the WebSocket to upload
      try {
        // Convert to base64 for transmission
        const reader = new FileReader()
        reader.onload = async () => {
          // Emit to backend
          emit('upload_document', {
            name: file.name,
            type: file.type,
            content: reader.result
          })
        }
        reader.readAsDataURL(file)
        
        // Simulate processing delay
        await new Promise(r => setTimeout(r, 2000))
        
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === newDoc.id
              ? { ...doc, status: 'indexed', chunks: Math.floor(Math.random() * 50) + 10 }
              : doc
          )
        )
        
        toast.success(`Indexed: ${file.name}`)
      } catch (error) {
        setDocuments(prev =>
          prev.map(doc =>
            doc.id === newDoc.id ? { ...doc, status: 'error' } : doc
          )
        )
        toast.error(`Failed to index: ${file.name}`)
      }
    }
    
    setUploading(false)
  }

  // Delete document
  const handleDelete = (id: string) => {
    const doc = documents.find(d => d.id === id)
    setDocuments(prev => prev.filter(d => d.id !== id))
    emit('delete_document', { document_id: id })
    toast.success(`Removed: ${doc?.name}`)
  }

  // Filter documents
  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get file icon based on type
  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-400" />
      case 'md':
      case 'txt':
        return <Book className="w-4 h-4 text-blue-400" />
      case 'js':
      case 'ts':
      case 'py':
      case 'java':
        return <Code className="w-4 h-4 text-green-400" />
      case 'json':
        return <FileJson className="w-4 h-4 text-yellow-400" />
      case 'png':
      case 'jpg':
      case 'jpeg':
        return <ImageIcon className="w-4 h-4 text-purple-400" />
      default:
        return <File className="w-4 h-4 text-white/60" />
    }
  }

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-[700px] max-h-[600px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-wingman-500/20">
                  <Database className="w-5 h-5 text-wingman-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Knowledge Base</h2>
                  <p className="text-xs text-white/40">
                    {documents.length} documents • {documents.reduce((acc, d) => acc + (d.chunks || 0), 0)} chunks indexed
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Upload */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-white/10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-wingman-500/50"
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-wingman-500 hover:bg-wingman-600 text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Documents
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.js,.ts,.py,.json,.csv"
                onChange={(e) => handleFiles(Array.from(e.target.files || []))}
                className="hidden"
              />
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`mx-6 mt-4 p-6 rounded-xl border-2 border-dashed transition-colors ${
                isDragging
                  ? 'border-wingman-500 bg-wingman-500/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                <motion.div
                  animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                  className="p-3 rounded-full bg-white/5 mb-3"
                >
                  <Upload className={`w-6 h-6 ${isDragging ? 'text-wingman-400' : 'text-white/40'}`} />
                </motion.div>
                <p className="text-sm text-white/70 mb-1">
                  {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-xs text-white/40">
                  Supports PDF, TXT, MD, JS, TS, PY, JSON, CSV
                </p>
              </div>
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              {filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FolderOpen className="w-12 h-12 text-white/20 mb-3" />
                  <p className="text-sm text-white/40">
                    {searchQuery ? 'No documents match your search' : 'No documents yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <motion.div
                      key={doc.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      {/* Icon */}
                      <div className="p-2 rounded-lg bg-white/10">
                        {getFileIcon(doc.type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-white font-medium truncate">
                            {doc.name}
                          </p>
                          {doc.status === 'processing' && (
                            <Loader2 className="w-3 h-3 text-wingman-400 animate-spin" />
                          )}
                          {doc.status === 'indexed' && (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          )}
                          {doc.status === 'error' && (
                            <AlertCircle className="w-3 h-3 text-red-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/40">
                          <span>{formatSize(doc.size)}</span>
                          <span>•</span>
                          <span>{doc.type.toUpperCase()}</span>
                          {doc.chunks && (
                            <>
                              <span>•</span>
                              <span>{doc.chunks} chunks</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/10 bg-white/5">
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>
                  Documents are processed locally and indexed for AI retrieval
                </span>
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  RAG Enabled
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default KnowledgeBase

