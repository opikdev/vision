import { describe, expect, it } from 'vitest';
import type { Tokens } from '../schema';
import { findingsOf, frame, text } from './test-layout';

const tokens: Tokens = {
  color: { brand: '#1F3D2B', surface: '#f2efe8' },
  radius: { card: '12px' },
  spacing: { gutter: '24px' },
  text: { title: '28px' },
};

describe('tokens', () => {
  it('suggests the token class for a raw value that equals a token, keeping variants', () => {
    expect(
      findingsOf(
        'tokens',
        [
          frame('cta', [], { class: 'bg-[#1f3d2b] hover:bg-[#1F3D2B]/90' }),
          frame('card', [], { class: 'bg-[#F2EFE8] rounded-[12px] p-[24px]' }),
          text('title', 'Plans', { class: 'text-[28px] text-[#1F3D2B]' }),
        ],
        {},
        { tokens },
      ).map(({ nodeId, message, fix }) => [nodeId, message, fix]),
    ).toEqual([
      ['cta', 'bg-[#1f3d2b] repeats the color token "brand".', 'Use bg-brand instead.'],
      [
        'cta',
        'hover:bg-[#1F3D2B]/90 repeats the color token "brand".',
        'Use hover:bg-brand/90 instead.',
      ],
      ['card', 'bg-[#F2EFE8] repeats the color token "surface".', 'Use bg-surface instead.'],
      ['card', 'rounded-[12px] repeats the radius token "card".', 'Use rounded-card instead.'],
      ['card', 'p-[24px] repeats the spacing token "gutter".', 'Use p-gutter instead.'],
      ['title', 'text-[28px] repeats the text token "title".', 'Use text-title instead.'],
      ['title', 'text-[#1F3D2B] repeats the color token "brand".', 'Use text-brand instead.'],
    ]);
  });

  it('reports a repeated raw value once, with how many layers use it', () => {
    expect(
      findingsOf(
        'tokens',
        [frame('a', [], { class: 'bg-[#1F3D2B]' }), frame('b', [], { class: 'bg-[#1F3D2B]' })],
        {},
        { tokens },
      ).map(({ nodeId, message }) => [nodeId, message]),
    ).toEqual([['a', 'bg-[#1F3D2B] on 2 layers repeats the color token "brand".']]);
  });

  it('accepts raw values that match no token, and token classes', () => {
    expect(
      findingsOf(
        'tokens',
        [frame('a', [], { class: 'bg-[#123456] bg-brand w-[24px] rounded-card p-[13px]' })],
        {},
        { tokens },
      ),
    ).toEqual([]);
  });

  it('notes a design without color tokens', () => {
    expect(findingsOf('tokens', [frame('a', [], { class: 'bg-[#1F3D2B]' })], {})).toEqual([
      {
        rule: 'tokens',
        severity: 'info',
        artboardId: 'board',
        nodeId: 'board',
        message: 'The design has no color tokens, so its colors are raw values repeated by hand.',
        fix: 'Set a small palette (such as brand, surface, fg, fg-muted, line) with set_tokens and use its classes (bg-brand, text-fg-muted).',
      },
    ]);
  });
});
