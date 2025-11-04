import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { parseCSV } from '@/lib/csvParser';
import { parseExcel } from '@/lib/excelParser';
import type { ProcurementRecord } from '@/lib/csvParser';

interface FileUploadProps {
  onDataParsed: (data: ProcurementRecord[]) => void;
}

type UploadState = 'idle' | 'parsing' | 'success' | 'error';

export function FileUpload({ onDataParsed }: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recordCount, setRecordCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploadState('parsing');
    setErrorMessage('');

    try {
      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!fileExtension || !['csv', 'xlsx', 'xls'].includes(fileExtension)) {
        throw new Error('Invalid file type. Please upload a CSV or Excel file.');
      }

      // Parse the file
      let data: ProcurementRecord[];
      
      if (fileExtension === 'csv') {
        data = await parseCSV(file);
      } else {
        data = await parseExcel(file);
      }

      // Success
      setRecordCount(data.length);
      setUploadState('success');
      onDataParsed(data);
    } catch (error) {
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse file');
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setUploadState('idle');
    setErrorMessage('');
    setRecordCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileInput}
        className="hidden"
        aria-label="file input"
      />

      {uploadState === 'idle' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
            transition-colors duration-200
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          `}
          onClick={handleClick}
          role="button"
          aria-label="upload area"
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drag & drop your file here
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to browse
          </p>
          <p className="text-xs text-gray-400">
            Supported formats: CSV, XLSX
          </p>
        </div>
      )}

      {uploadState === 'parsing' && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">
            Parsing your file...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This may take a moment for large files
          </p>
        </div>
      )}

      {uploadState === 'success' && (
        <div className="text-center py-12">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Successfully parsed!
          </p>
          <p className="text-sm text-gray-600 mb-6">
            {recordCount} {recordCount === 1 ? 'record' : 'records'} loaded
          </p>
          <Button onClick={handleReset} variant="outline" aria-label="upload another file">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Upload Another File
          </Button>
        </div>
      )}

      {uploadState === 'error' && (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Upload Failed
          </p>
          <p className="text-sm text-red-600 mb-6">
            {errorMessage}
          </p>
          <Button onClick={handleReset} variant="outline">
            Try Again
          </Button>
        </div>
      )}
    </Card>
  );
}
