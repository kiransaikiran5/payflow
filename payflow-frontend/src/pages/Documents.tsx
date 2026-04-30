import React, { useCallback, useEffect, useState } from 'react';
import {
  Container, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Box, CircularProgress
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { documentAPI } from '../services/api';
import { DocFile } from '../types';
import { toast } from 'react-toastify';

const Documents: React.FC = () => {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee_id: '', document_type: '', file: null as File | null });
  const [uploading, setUploading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentAPI.getAll();
      setDocs(res.data);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleUpload = async () => {
    // --- validate all fields ---
    if (!form.employee_id.trim()) {
      toast.warning('Employee ID is required');
      return;
    }
    if (!/^\d+$/.test(form.employee_id.trim())) {
      toast.warning('Employee ID must be a number');
      return;
    }
    if (!form.document_type.trim()) {
      toast.warning('Document type is required');
      return;
    }
    if (!form.file) {
      toast.warning('Please select a file');
      return;
    }

    setUploading(true);
    try {
      // send employee_id & document_type as query params, file as body
      await documentAPI.upload(
        form.employee_id.trim(),
        form.document_type.trim(),
        form.file
      );
      toast.success('Document uploaded successfully');
      fetch();
      setOpen(false);
      setForm({ employee_id: '', document_type: '', file: null });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      let message = 'Upload failed.';
      if (Array.isArray(detail)) {
        message = detail.map((d: any) => d.msg).filter(Boolean).join(', ');
      } else if (typeof detail === 'string') {
        message = detail;
      }
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Document Management</Typography>
        <Button variant="contained" startIcon={<CloudUpload />} onClick={() => setOpen(true)}>
          Upload Document
        </Button>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Document Type</TableCell>
                <TableCell>File</TableCell>
                <TableCell>Uploaded</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.employee_id}</TableCell>
                  <TableCell>{d.document_type}</TableCell>
                  <TableCell>
                    <a href={`http://localhost:8000${d.file_url}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                  </TableCell>
                  <TableCell>{new Date(d.uploaded_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <TextField
            label="Employee ID"
            value={form.employee_id}
            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            fullWidth
            margin="dense"
            type="number"
          />
          <TextField
            label="Document Type"
            value={form.document_type}
            onChange={(e) => setForm({ ...form, document_type: e.target.value })}
            fullWidth
            margin="dense"
          />
          <Button variant="outlined" component="label" sx={{ mt: 1 }}>
            Select File
            <input
              type="file"
              hidden
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
            />
          </Button>
          {form.file && <Typography variant="caption">{form.file.name}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Documents;