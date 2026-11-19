import { FormEvent, KeyboardEvent, useState } from 'react';
import { DeleteWithConfirmation } from '../../../journal/controls/DeleteWithConfirmation';
import { useModal } from '../../../journal/controls/ModalContext';
import { TickIcon } from '../../../journal/icons/Tick';
import { CountTile } from './CountTile';
import { LadyBeetleIcon } from './LadyBeetleIcon';
import { UnderstoodTile } from './UnderstoodTile';
import { UpdateDate } from './UpdateDate';
import { useLanguageMediaStorage } from './LanguageMediaStorageContext';
import { VideoUrlTile } from './VideoUrlTile';
import { parseNumber, readText } from './fields';
import { Video, YoutubeChannel } from './types';

import './ProgressUpdateForm.css';
import './WatchedVideoForm.css';

type WatchedVideoFormProps = {
  channel: YoutubeChannel;
  video?: Video;
};

export function WatchedVideoForm({ channel, video }: WatchedVideoFormProps) {
  const { addItem, updateItem, deleteItem } = useLanguageMediaStorage();
  const { closeModal } = useModal();
  const [lookups, setLookups] = useState(video?.lookups ?? 0);
  const [aiQuestions, setAiQuestions] = useState(video?.aiQuestions ?? 0);

  const submitOnEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  };

  const saveWatchedVideo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const watchedVideo = {
      url: readText(data, 'url'),
      lookups: parseNumber(data, 'lookups') ?? 0,
      aiQuestions: parseNumber(data, 'aiQuestions') ?? 0,
      understood: parseNumber(data, 'understood'),
    };
    if (video) {
      updateItem([channel.id, 'videos', video.id], watchedVideo);
    } else {
      addItem([channel.id, 'videos'], {
        ...watchedVideo,
        status: 'done',
      });
    }
    closeModal();
  };

  const deleteVideo = ({ id }: Video) => {
    deleteItem([channel.id, 'videos', id]);
    closeModal();
  };

  return (
    <form
      className="progress-update-form"
      aria-label={
        video ? `Edit ${video.url}` : `Add a watched video to ${channel.name}`
      }
      onKeyDown={submitOnEnter}
      onSubmit={saveWatchedVideo}
    >
      <h2 className="progress-update-title">{channel.name}</h2>
      {video?.createdAt && <UpdateDate instant={video.createdAt} />}
      <div className="progress-tiles">
        <VideoUrlTile defaultValue={video?.url} />
        <CountTile
          name="lookups"
          label="Looked up"
          addLabel="Add a lookup"
          icon={<LadyBeetleIcon colour="red" width="45px" />}
          count={lookups}
          onAdd={() => setLookups((count) => count + 1)}
        />
        <CountTile
          name="aiQuestions"
          label="Asked AI"
          addLabel="Add an AI question"
          icon={<LadyBeetleIcon colour="yellow" width="45px" />}
          count={aiQuestions}
          onAdd={() => setAiQuestions((count) => count + 1)}
        />
        <UnderstoodTile mediaType="youtube" defaultValue={video?.understood} />
        <div className="progress-update-actions watched-video-actions">
          {video && (
            <DeleteWithConfirmation
              className="progress-update-delete"
              onDelete={() => deleteVideo(video)}
            />
          )}
          <button
            type="submit"
            className="progress-update-save"
            aria-label="Save"
          >
            <TickIcon width="20px" strokeWidth="2.6" />
          </button>
        </div>
      </div>
    </form>
  );
}
