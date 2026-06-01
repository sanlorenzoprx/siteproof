import React from 'react';
import { TimelinePlayback } from '../timeline/TimelinePlayback';

export default function TimelineSection({ jobId }: { jobId: string }) {
  return <TimelinePlayback jobId={jobId} />;
}
