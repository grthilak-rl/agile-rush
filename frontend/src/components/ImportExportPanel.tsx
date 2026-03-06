import { useState, useRef, useCallback } from 'react';
import {
  Upload, Download, FileText, FileJson, FileSpreadsheet,
  CheckCircle2, AlertTriangle, X, ArrowLeft,
} from 'lucide-react';
import { importExportApi } from '../api/client';
import type { ImportPreviewResponse, ImportResultResponse } from '../api/client';
import { useToast } from './ui/Toast';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import type { Sprint } from '../types';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
  transition: 'border-color 150ms ease',
  boxSizing: 'border-box' as const,
  appearance: 'auto' as const,
  backgroundColor: '#FFFFFF',
};

interface ImportExportPanelProps {
  projectId: string;
  sprints: Sprint[];
  onImportComplete?: () => void;
}

type ImportStep = 'select' | 'upload' | 'preview' | 'result';
type ImportSource = 'trello' | 'jira' | 'csv';

const SOURCE_INFO: Record<ImportSource, { label: string; ext: string; instructions: string[] }> = {
  trello: {
    label: 'Trello',
    ext: '.json',
    instructions: [
      'Open your Trello board',
      'Click Menu > More > Print and Export',
      'Click "Export as JSON"',
      'Upload the downloaded file below',
    ],
  },
  jira: {
    label: 'Jira',
    ext: '.csv',
    instructions: [
      'Open Jira and go to Filters',
      'Select your filter or create one',
      'Click Export > CSV (All fields)',
      'Upload the downloaded file below',
    ],
  },
  csv: {
    label: 'CSV File',
    ext: '.csv',
    instructions: [
      'Prepare a CSV file with at least a "Title" column',
      'Optional columns: Type, Priority, Status, Story Points, Due Date, Labels, Description',
      'Upload the file below',
    ],
  },
};

function downloadBlob(data: Blob, filename: string) {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function ImportExportPanel({ projectId, sprints, onImportComplete }: ImportExportPanelProps) {
  const { addToast } = useToast();

  // Import state
  const [importStep, setImportStep] = useState<ImportStep>('select');
  const [importSource, setImportSource] = useState<ImportSource | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResultResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Export state
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportSprintId, setExportSprintId] = useState<string>('');
  const [includeComments, setIncludeComments] = useState(true);
  const [showJsonOptions, setShowJsonOptions] = useState(false);

  const resetImport = useCallback(() => {
    setImportStep('select');
    setImportSource(null);
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
  }, []);

  const handleSourceSelect = (source: ImportSource) => {
    setImportSource(source);
    setImportStep('upload');
    setSelectedFile(null);
    setPreviewData(null);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files?.[0]) return;
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) {
      addToast('error', 'File exceeds 5MB limit');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handlePreview = async () => {
    if (!selectedFile || !importSource) return;
    setPreviewing(true);
    try {
      const res = await importExportApi.preview(projectId, selectedFile, importSource);
      setPreviewData(res.data);
      setImportStep('preview');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to preview import';
      addToast('error', message);
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !importSource) return;
    setImporting(true);
    try {
      const res = await importExportApi.executeImport(projectId, selectedFile, importSource);
      setImportResult(res.data);
      setImportStep('result');
      if (res.data.success) {
        onImportComplete?.();
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to import';
      addToast('error', message);
    } finally {
      setImporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await importExportApi.exportCsv(projectId);
      downloadBlob(new Blob([res.data]), 'agilerush-export.csv');
      addToast('success', 'CSV export downloaded');
    } catch {
      addToast('error', 'Failed to export CSV');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportJson = async () => {
    setExportingJson(true);
    try {
      const res = await importExportApi.exportJson(projectId, { include_comments: includeComments });
      downloadBlob(new Blob([res.data]), 'agilerush-export.json');
      addToast('success', 'JSON export downloaded');
      setShowJsonOptions(false);
    } catch {
      addToast('error', 'Failed to export JSON');
    } finally {
      setExportingJson(false);
    }
  };

  const handleExportPdf = async () => {
    if (!exportSprintId) {
      addToast('error', 'Please select a sprint');
      return;
    }
    setExportingPdf(true);
    try {
      const res = await importExportApi.exportPdf(projectId, exportSprintId);
      const sprint = sprints.find((s) => s.id === exportSprintId);
      const filename = sprint ? `${sprint.name.replace(/\s+/g, '-')}-summary.pdf` : 'sprint-summary.pdf';
      downloadBlob(new Blob([res.data]), filename);
      addToast('success', 'PDF report downloaded');
    } catch {
      addToast('error', 'Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await importExportApi.downloadTemplate(projectId);
      downloadBlob(new Blob([res.data]), 'agilerush-import-template.csv');
      addToast('success', 'Template downloaded');
    } catch {
      addToast('error', 'Failed to download template');
    }
  };

  const sourceInfo = importSource ? SOURCE_INFO[importSource] : null;

  return (
    <div>
      {/* Import Section */}
      <Card hoverLift={false} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Upload size={20} color="#2563EB" />
          <h3 style={{ margin: 0 }}>Import Data</h3>
        </div>

        {importStep === 'select' && (
          <>
            <p style={{ color: '#64748B', fontSize: 13, marginBottom: 16, marginTop: 0 }}>
              Bring your existing tasks into AgileRush from another tool.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {(['trello', 'jira', 'csv'] as ImportSource[]).map((source) => {
                const info = SOURCE_INFO[source];
                return (
                  <button
                    key={source}
                    onClick={() => handleSourceSelect(source)}
                    style={{
                      flex: '1 1 160px',
                      padding: '20px 16px',
                      border: '2px solid #E2E8F0',
                      borderRadius: 10,
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#2563EB';
                      e.currentTarget.style.backgroundColor = '#F0F6FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    {source === 'trello' && <FileJson size={32} color="#0079BF" style={{ marginBottom: 8 }} />}
                    {source === 'jira' && <FileSpreadsheet size={32} color="#0052CC" style={{ marginBottom: 8 }} />}
                    {source === 'csv' && <FileText size={32} color="#10B981" style={{ marginBottom: 8 }} />}
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A' }}>{info.label}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{info.ext} file</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {importStep === 'upload' && sourceInfo && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setImportStep('select')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
              >
                <ArrowLeft size={18} color="#64748B" />
              </button>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Import from {sourceInfo.label}</span>
            </div>

            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginTop: 0, marginBottom: 8 }}>
                How to export from {sourceInfo.label}:
              </p>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#475569' }}>
                {sourceInfo.instructions.map((step, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{step}</li>
                ))}
              </ol>
              {importSource === 'csv' && (
                <button
                  onClick={handleDownloadTemplate}
                  style={{
                    marginTop: 8,
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Download CSV template
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? '#2563EB' : selectedFile ? '#10B981' : '#CBD5E1'}`,
                borderRadius: 10,
                padding: '32px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragOver ? '#F0F6FF' : selectedFile ? '#F0FDF4' : '#FAFAFA',
                transition: 'all 150ms ease',
                marginBottom: 16,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={sourceInfo.ext === '.json' ? '.json' : '.csv'}
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: 'none' }}
              />
              {selectedFile ? (
                <div>
                  <CheckCircle2 size={28} color="#10B981" style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 500, color: '#0F172A', fontSize: 14 }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={28} color="#94A3B8" style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 500, color: '#64748B', fontSize: 14 }}>
                    Drop your {sourceInfo.ext} file here
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                    or click to browse (max 5MB)
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={resetImport}>Cancel</Button>
              <Button
                onClick={handlePreview}
                loading={previewing}
                disabled={!selectedFile}
              >
                Upload &amp; Preview
              </Button>
            </div>
          </>
        )}

        {importStep === 'preview' && previewData && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setImportStep('upload')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
              >
                <ArrowLeft size={18} color="#64748B" />
              </button>
              <span style={{ fontWeight: 600, fontSize: 15 }}>Import Preview</span>
            </div>

            <div style={{
              display: 'flex',
              gap: 16,
              marginBottom: 16,
              padding: '12px 16px',
              backgroundColor: '#F0F6FF',
              borderRadius: 8,
            }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Source</div>
                <div style={{ fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>{previewData.source}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#64748B' }}>Items Found</div>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>{previewData.total_items}</div>
              </div>
            </div>

            {/* Status Mapping */}
            {Object.keys(previewData.status_mapping).length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                  Status Mapping:
                </div>
                {Object.entries(previewData.status_mapping).map(([source, mapped]) => (
                  <div key={source} style={{ fontSize: 13, color: '#475569', marginBottom: 2 }}>
                    &quot;{source}&quot; &rarr; {mapped}
                  </div>
                ))}
              </div>
            )}

            {/* Items Preview */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                Preview ({Math.min(previewData.items_preview.length, 10)} of {previewData.total_items}):
              </div>
              <div style={{
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                overflow: 'hidden',
              }}>
                {previewData.items_preview.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      borderBottom: i < previewData.items_preview.length - 1 ? '1px solid #F1F5F9' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: '#0F172A', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {item.title}
                    </span>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 12, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: item.type === 'bug' ? '#FEF2F2' : item.type === 'story' ? '#F0F6FF' : '#F8FAFC',
                        color: item.type === 'bug' ? '#DC2626' : item.type === 'story' ? '#2563EB' : '#64748B',
                      }}>
                        {item.type}
                      </span>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor: '#F8FAFC',
                        color: '#64748B',
                      }}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                ))}
                {previewData.total_items > 10 && (
                  <div style={{
                    padding: '8px 12px',
                    fontSize: 12,
                    color: '#94A3B8',
                    textAlign: 'center',
                    backgroundColor: '#FAFAFA',
                  }}>
                    ... and {previewData.total_items - 10} more items
                  </div>
                )}
              </div>
            </div>

            {/* Warnings */}
            {previewData.warnings.length > 0 && (
              <div style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FED7AA',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <AlertTriangle size={14} color="#F59E0B" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Warnings:</span>
                </div>
                {previewData.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#92400E', marginLeft: 20, marginBottom: 2 }}>
                    {w}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={resetImport}>Cancel</Button>
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={previewData.total_items === 0}
              >
                Import {previewData.total_items} Items
              </Button>
            </div>
          </>
        )}

        {importStep === 'result' && importResult && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {importResult.success ? (
              <>
                <CheckCircle2 size={40} color="#10B981" style={{ marginBottom: 12 }} />
                <h3 style={{ margin: '0 0 8px', color: '#0F172A' }}>Import Complete!</h3>
                <p style={{ color: '#64748B', fontSize: 14, margin: '0 0 8px' }}>
                  {importResult.items_created} items imported successfully
                </p>
                {importResult.labels_found.length > 0 && (
                  <p style={{ color: '#64748B', fontSize: 13, margin: '0 0 8px' }}>
                    Labels: {importResult.labels_found.join(', ')}
                  </p>
                )}
                {importResult.warnings.length > 0 && (
                  <div style={{
                    backgroundColor: '#FFFBEB',
                    borderRadius: 8,
                    padding: '10px 14px',
                    textAlign: 'left',
                    marginBottom: 12,
                  }}>
                    {importResult.warnings.map((w, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#92400E', marginBottom: 2 }}>
                        {w}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <X size={40} color="#EF4444" style={{ marginBottom: 12 }} />
                <h3 style={{ margin: '0 0 8px', color: '#DC2626' }}>Import Failed</h3>
                {importResult.errors.map((e, i) => (
                  <p key={i} style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{e}</p>
                ))}
              </>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <Button variant="ghost" onClick={resetImport}>Import More</Button>
              {importResult.success && onImportComplete && (
                <Button onClick={onImportComplete}>View Backlog</Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Export Section */}
      <Card hoverLift={false} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Download size={20} color="#2563EB" />
          <h3 style={{ margin: 0 }}>Export Data</h3>
        </div>

        <p style={{ color: '#64748B', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          Download your project data in various formats.
        </p>

        {/* Backlog Export */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 10 }}>
            Backlog Export
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="secondary"
              icon={<FileSpreadsheet size={16} />}
              onClick={handleExportCsv}
              loading={exportingCsv}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              icon={<FileJson size={16} />}
              onClick={() => setShowJsonOptions(!showJsonOptions)}
            >
              Export JSON
            </Button>
          </div>

          {showJsonOptions && (
            <div style={{
              marginTop: 12,
              padding: '12px 16px',
              backgroundColor: '#F8FAFC',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                />
                Include comments
              </label>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <Button onClick={handleExportJson} loading={exportingJson} size="sm">Export</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowJsonOptions(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Sprint Reports */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 10 }}>
            Sprint Summary PDF
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={exportSprintId}
              onChange={(e) => setExportSprintId(e.target.value)}
              style={{ ...inputStyle, maxWidth: 240 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            >
              <option value="">Select sprint...</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              icon={<FileText size={16} />}
              onClick={handleExportPdf}
              loading={exportingPdf}
              disabled={!exportSprintId}
            >
              Generate PDF
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
