import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PlayerPhotoUpload({ player, onUpdate }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Player.update(player.id, { photo_url: file_url });
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setUploading(false);
  };

  const handleRemove = async () => {
    await base44.entities.Player.update(player.id, { photo_url: null });
    onUpdate && onUpdate();
  };

  return (
    <div className="flex items-center gap-3">
      {player.photo_url ? (
        <>
          <div className="w-20 h-20 rounded-xl overflow-hidden"
            style={{ border: '2px solid rgba(139,115,85,0.20)' }}>
            <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            style={{ color: '#B94040' }}
          >
            <X className="w-3.5 h-3.5 ml-1" />
            הסר תמונה
          </Button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <div className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: 'rgba(42,112,80,0.12)', color: '#2A7050', border: '2px dashed rgba(139,115,85,0.25)' }}>
            {(player.name || '?').charAt(0)}
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
            <div
              onClick={(e) => { if (!uploading) e.currentTarget.parentElement?.querySelector('input')?.click(); }}
              className="px-3 py-2 rounded-md border text-sm font-medium transition-all flex items-center gap-2"
              style={{
                borderColor: 'rgba(139,115,85,0.3)',
                color: uploading ? '#9A8672' : '#5C4E38',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1
              }}
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'מעלה...' : 'העלה תמונה'}
            </div>
          </label>
        </div>
      )}
    </div>
  );
}