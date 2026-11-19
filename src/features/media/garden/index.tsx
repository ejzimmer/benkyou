import { LanguageMediaStorageProvider } from './LanguageMediaStorageContext';
import { MediaGarden } from './MediaGarden';

export function LanguageMediaGoals() {
  return (
    <LanguageMediaStorageProvider>
      <MediaGarden />
    </LanguageMediaStorageProvider>
  );
}
