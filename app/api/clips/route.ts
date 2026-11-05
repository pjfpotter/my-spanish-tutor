import { BUILT_CLIPS } from '../../../lib/tele/clips';

/** Which audio clips exist (text, speed and slot). A seam so tests can stand in stub clips. */
export function GET() {
  return Response.json(BUILT_CLIPS, { headers: { 'Cache-Control': 'public, max-age=60' } });
}
