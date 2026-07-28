"use client";

import React, { useState, useCallback } from "react";
import { UploadCloud, FileType, CheckCircle2, AlertTriangle, X, Loader2 } from "lucide-react";

export default function ClientImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: number; errors: number; message: string } | null>(null);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) return [];
    
    // Parse headers (ignoring commas inside quotes)
    const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, "").trim());
    
    const rows = lines.slice(1).map(line => {
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, "").trim());
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = cols[i] || "";
      });
      return obj;
    });
    return rows;
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
      alert("Please upload a valid CSV file.");
      return;
    }
    setFile(selectedFile);
    setUploadResult(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = parseCSV(text);
      setPreviewData(data);
    };
    reader.readAsText(selectedFile);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const confirmUpload = async () => {
    if (previewData.length === 0) return;
    setIsUploading(true);
    try {
      const res = await fetch("/api/clients/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients: previewData }),
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult({
          success: data.successCount,
          errors: data.errorCount,
          message: data.message,
        });
        setPreviewData([]);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("An unexpected error occurred.");
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setPreviewData([]);
    setUploadResult(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Bulk Client Import</h1>
          <p className="text-gray-500 mt-1">Upload the standardized CSV template to safely migrate client data.</p>
        </div>
        {previewData.length > 0 && (
          <div className="flex gap-4">
            <button
              onClick={clearSelection}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium flex items-center gap-2"
            >
              <X size={18} /> Cancel
            </button>
            <button
              onClick={confirmUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/25 font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Confirm & Import {previewData.length} Records
            </button>
          </div>
        )}
      </div>

      {uploadResult && (
        <div className="p-6 rounded-xl border border-green-200 bg-green-50 text-green-800 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={24} />
            <h3 className="font-semibold text-lg">Import Complete</h3>
          </div>
          <p>{uploadResult.message}</p>
          <div className="flex gap-6 mt-2 text-sm font-medium">
            <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full">Success: {uploadResult.success}</span>
            {uploadResult.errors > 0 && (
              <span className="text-red-700 bg-red-100 px-3 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle size={14} /> Errors: {uploadResult.errors}
              </span>
            )}
          </div>
        </div>
      )}

      {!file && !uploadResult && (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/50 shadow-inner scale-[1.02]"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50 bg-white/50 backdrop-blur-sm"
          }`}
        >
          <div className="mx-auto w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
            <UploadCloud size={32} />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Drag & Drop your CSV file here</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Make sure your CSV matches the ERP_Client_Bulk_Upload_Template structure. 
          </p>
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <FileType size={20} className="text-gray-400" />
            Browse Files
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
          </label>
        </div>
      )}

      {previewData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px] animate-in fade-in zoom-in-95 duration-500">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <FileType size={20} className="text-indigo-500" /> 
              {file?.name}
            </h3>
            <span className="text-sm text-gray-500 font-medium">{previewData.length} rows detected</span>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client Code</th>
                  <th className="px-4 py-3 font-semibold">Client Name</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Price Category</th>
                  <th className="px-4 py-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewData.slice(0, 50).map((row, i) => {
                  const hasWarning = row["Duplicate Warning"] && row["Duplicate Warning"].length > 0;
                  return (
                    <tr key={i} className={`hover:bg-gray-50 transition-colors ${hasWarning ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-mono border border-gray-200">
                          {row["Client Code"] || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row["Client Name"] || "N/A"}</div>
                        {row["Email"] && <div className="text-xs text-gray-500">{row["Email"]}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-medium border border-indigo-100">
                          {row["Category"] || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-600">{row["Price Category"] || "N/A"}</td>
                      <td className="px-4 py-3 text-right">
                        {hasWarning ? (
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-md border border-amber-200" title={row["Duplicate Warning"]}>
                            <AlertTriangle size={14} /> Warning
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-md border border-green-200">
                            <CheckCircle2 size={14} /> Ready
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {previewData.length > 50 && (
              <div className="p-4 text-center text-sm text-gray-500 bg-white border-t border-gray-100">
                Showing first 50 of {previewData.length} records...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
