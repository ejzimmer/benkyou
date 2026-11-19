import { CountField } from './CountField';
import { Volume } from './types';

type MangaVolumePagesProps = { volume: Volume };

export function MangaVolumePages({ volume }: MangaVolumePagesProps) {
  return (
    <div className="manga-volume-pages">
      <span className="edit-volume-number">{volume.number}</span>
      <CountField
        name={`pages-${volume.id}`}
        label={`Volume ${volume.number} pages`}
        icon="📖"
        defaultValue={volume.pages}
      />
    </div>
  );
}
