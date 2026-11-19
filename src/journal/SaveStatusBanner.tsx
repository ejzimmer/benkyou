import { useSyncExternalStore } from 'react';
import { SaveStatus } from './localFirst/createLocalFirstContext';
import './AppUpdateBanner.css';

type SaveStatusBannerProps = { saveStatus: SaveStatus };

export function SaveStatusBanner({ saveStatus }: SaveStatusBannerProps) {
  const saveState = useSyncExternalStore(
    saveStatus.subscribe,
    saveStatus.getSaveState,
  );

  if (saveState === 'outdated') {
    return (
      <div className="app-update-banner" role="alert">
        <span>This version can't save any more.</span>
        <button className="primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }

  if (saveState === 'failing') {
    return (
      <div className="app-update-banner" role="alert">
        <span>
          Changes aren't saving. They're kept on this device and will keep
          retrying.
        </span>
      </div>
    );
  }

  return null;
}
