import { finding, quote, type ArtboardContext } from './context';
import type { Finding } from './schema';

const lorem = /\b(lorem ipsum|dolor sit amet|consectetur adipiscing)\b/i;
const placeholders = new Set([
  'lorem',
  'title',
  'subtitle',
  'heading',
  'subheading',
  'headline',
  'text',
  'text here',
  'your text here',
  'add text',
  'sample text',
  'placeholder',
  'button',
  'button text',
  'click here',
  'link',
  'tbd',
  'todo',
]);
const bracketed = /^(\[[^\]]+\]|\{\{[^}]+\}\}|<[^>]+>)$/;

export function contentRule(context: ArtboardContext): Finding[] {
  const findings: Finding[] = [];
  for (const { node } of context.nodes) {
    if (node.type === 'text') {
      const text = node.text.trim();
      if (lorem.test(text)) {
        findings.push(
          finding(
            context,
            'content',
            'error',
            node.id,
            `Text ${quote(text)} is lorem ipsum.`,
            'Write the real copy this screen would show.',
          ),
        );
      } else if (
        placeholders.has(text.toLowerCase().replace(/[.:!…]+$/, '')) ||
        bracketed.test(text)
      ) {
        findings.push(
          finding(
            context,
            'content',
            'warning',
            node.id,
            `Text ${quote(text)} is placeholder copy.`,
            'Replace it with specific, real content.',
          ),
        );
      }
    } else if (node.type === 'image' && (node.alt ?? '').trim() === '') {
      findings.push(
        finding(
          context,
          'content',
          'warning',
          node.id,
          `Image ${quote(node.src)} has no alt text.`,
          'Describe what the image shows in alt, such as alt="Barista pouring latte art".',
        ),
      );
    } else if (node.type === 'frame' && (node.children ?? []).length === 0) {
      const box = context.layout?.[node.id];
      const drawsNothing =
        box !== undefined &&
        (box.width === 0 || box.height === 0) &&
        box.borderWidth === 0 &&
        !box.backgroundImage;
      if (drawsNothing) {
        findings.push(
          finding(
            context,
            'content',
            'warning',
            node.id,
            `Frame ${node.id} is empty and has no size, so it draws nothing.`,
            'Delete it, or give it content or a size.',
          ),
        );
      }
    }
  }
  return findings;
}
