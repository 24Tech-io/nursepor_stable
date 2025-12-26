'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// PDF.js library reference (lazy loaded)
let pdfjsLib: any = null;

interface SecurePDFViewerProps {
  textbookId: number;
  studentEmail: string;
  accessToken: string;
  onPageChange?: (page: number, totalPages: number) => void;
}

export default function SecurePDFViewer({ 
  textbookId, 
  studentEmail, 
  accessToken,
  onPageChange 
}: SecurePDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.5);

  useEffect(() => {
    // Disable right-click, print, save shortcuts
    const preventDefaults = (e: KeyboardEvent | MouseEvent) => {
      // Disable F12, Ctrl+P, Ctrl+S, Ctrl+Shift+I, Ctrl+Shift+J
      if (e instanceof KeyboardEvent) {
        if (
          e.key === 'F12' ||
          (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'P' || e.key === 'S')) ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j')) ||
          e.key === 'PrintScreen'
        ) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
      
      // Disable right-click
      if (e instanceof MouseEvent && e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Disable text selection
    const preventSelection = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('contextmenu', preventDefaults);
    document.addEventListener('keydown', preventDefaults);
    document.addEventListener('keyup', preventDefaults);
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventSelection);

    return () => {
      document.removeEventListener('contextmenu', preventDefaults);
      document.removeEventListener('keydown', preventDefaults);
      document.removeEventListener('keyup', preventDefaults);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventSelection);
    };
  }, []);

  useEffect(() => {
    loadPDF();
  }, [accessToken, textbookId]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      // Dynamically import PDF.js only when needed
      if (!pdfjsLib) {
        pdfjsLib = await import('pdfjs-dist');
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }
      }

      // Fetch PDF stream with token
      const response = await fetch(`/api/student/textbooks/${textbookId}/stream?token=${accessToken}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Access token expired. Please refresh the page.');
        } else {
          setError('Failed to load PDF. Please try again.');
        }
        setLoading(false);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setLoading(false);

      renderPage(1, pdf);
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      setError('Failed to load PDF. Please try again.');
      setLoading(false);
    }
  };

  const updateProgress = useCallback(async (page: number) => {
    try {
      await fetch(`/api/student/textbooks/${textbookId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPage: page, totalPagesRead: page }),
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }, [textbookId]);

  const renderPage = useCallback(async (pageNum: number, doc = pdfDoc) => {
    if (!doc || !canvasRef.current) return;

    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Add watermark
      context.fillStyle = 'rgba(0, 0, 0, 0.15)';
      context.font = 'bold 20px Arial';
      context.textAlign = 'left';
      context.textBaseline = 'bottom';
      context.fillText(studentEmail, 20, viewport.height - 20);
      
      // Add page number watermark
      context.fillText(`Page ${pageNum}`, viewport.width - 150, viewport.height - 20);

      setCurrentPage(pageNum);
      if (onPageChange) {
        onPageChange(pageNum, totalPages);
      }

      // Update progress
      updateProgress(pageNum);
    } catch (error) {
      console.error('Error rendering page:', error);
    }
  }, [pdfDoc, scale, studentEmail, totalPages, onPageChange, updateProgress]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages && pdfDoc) {
      renderPage(currentPage + 1);
    }
  }, [currentPage, totalPages, pdfDoc, renderPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1 && pdfDoc) {
      renderPage(currentPage - 1);
    }
  }, [currentPage, pdfDoc, renderPage]);

  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3));
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [currentPage, pdfDoc, renderPage]);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [currentPage, pdfDoc, renderPage]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }, [scale, pdfDoc, currentPage, renderPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center bg-white p-8 rounded-lg shadow">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="secure-pdf-viewer bg-gray-100 min-h-screen">
      {/* Controls */}
      <div className="controls bg-white border-b shadow-sm p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-gray-700 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            title="Zoom Out"
          >
            −
          </button>
          <span className="text-gray-700 text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="pdf-container flex justify-center p-4 overflow-auto">
        <canvas
          ref={canvasRef}
          className="border shadow-lg bg-white"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border-t border-yellow-200 p-2 text-center text-xs text-yellow-800">
        This content is protected. Downloading, printing, or sharing is prohibited.
      </div>
    </div>
  );
}

