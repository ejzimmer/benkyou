import { findBranchPoint } from './findBranchPoint';
import { getItemsInAddedOrder } from './lists';
import { roundCoordinate } from './treeGeometry';
import { GrownShape } from './treeGrowth';
import { Video, YoutubeChannel } from './types';
import { toRadians } from '../shared/toRadians';

const SINK = 2;

export type CrownSpot = {
  key: string;
  video: Video;
  x: number;
  y: number;
  angle: number;
  understood: number;
  date?: string;
};

export function placeCrowns(
  channel: YoutubeChannel,
  shapes: GrownShape[],
): CrownSpot[] {
  return getItemsInAddedOrder(channel.videos).flatMap((video) => {
    const arm = shapes.find(({ key }) => key === `${video.id}-arm`);
    if (!arm || video.understood === undefined) return [];
    const tip = findBranchPoint(arm.edges, arm.amount);
    const reach = tip.width / 2 - SINK;
    return [
      {
        key: `${video.id}-crown`,
        video,
        x: roundCoordinate(tip.x + Math.cos(toRadians(tip.angle)) * reach),
        y: roundCoordinate(tip.y + Math.sin(toRadians(tip.angle)) * reach),
        angle: roundCoordinate(tip.angle),
        understood: video.understood,
        date: video.createdAt,
      },
    ];
  });
}
