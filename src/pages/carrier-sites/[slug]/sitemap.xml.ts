import type { APIRoute } from 'astro';
import { carriers } from '../../../carrier/inputs';
import { publishedSpec } from '../../../carrier/recorded';
import { renderSitemap } from '../../../carrier/render';

export function getStaticPaths() {
  return carriers.map((c) => ({ params: { slug: c.slug }, props: { carrierId: c.id } }));
}

export const GET: APIRoute = ({ props }) =>
  new Response(renderSitemap(publishedSpec(props.carrierId as string)), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
