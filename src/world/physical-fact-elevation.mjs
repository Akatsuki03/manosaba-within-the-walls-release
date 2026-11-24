import { physicalFactSnapshotV2 } from '../cases/case-physical-facts.mjs';

// The frozen v2 normalizer deliberately owns the physical schema. This adapter
// adds only the reviewed qualitative pose overlay after that normalization, so
// old snapshots without an overlay remain byte-identical and callers cannot
// smuggle arbitrary values into the frozen schema. It never reads an accessor:
// the frozen snapshot validates the input first, then only own data descriptors
// for pose/elevation are inspected.
const ELEVATIONS = new Set(['slightly-above-support']);
const invalid = () => Object.assign(new Error('物理姿态的定性抬升值无效。'), { code: 'INVALID_PHYSICAL_FACTS' });
export function physicalFactSnapshotV2WithElevation(input, expectedBoundary) {
  const snapshot = physicalFactSnapshotV2(input, expectedBoundary);
  if (!input || typeof input !== 'object' || Array.isArray(input)) return snapshot;
  const poseDescriptor = Object.getOwnPropertyDescriptor(input, 'pose');
  if (!poseDescriptor) { if ('pose' in input) throw invalid(); return snapshot; }
  if (!poseDescriptor.enumerable || !Object.hasOwn(poseDescriptor, 'value') || poseDescriptor.value === undefined) return snapshot;
  const pose = poseDescriptor.value;
  if (!pose || typeof pose !== 'object' || Array.isArray(pose)) return snapshot;
  const elevationDescriptor = Object.getOwnPropertyDescriptor(pose, 'elevation');
  if (!elevationDescriptor) { if ('elevation' in pose) throw invalid(); return snapshot; }
  if (!elevationDescriptor.enumerable || !Object.hasOwn(elevationDescriptor, 'value')) throw invalid();
  const elevation = elevationDescriptor.value;
  if (!ELEVATIONS.has(elevation)) throw invalid();
  return Object.freeze({ ...snapshot, pose: Object.freeze({ ...snapshot.pose, elevation }) });
}
