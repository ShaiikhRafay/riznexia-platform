import { describe, expect, it } from 'vitest';
import { businessAnalysisOutputSchema, businessAnalysisSchema } from './business-analysis';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

function validOutput() {
  return {
    businessSummary: 'A family-owned diner serving classic American comfort food.',
    industry: 'Restaurant',
    targetAudience: ['Local families', 'Office workers'],
    brandPersonality: ['Warm', 'Reliable'],
    toneOfVoice: 'Friendly and welcoming',
    primaryServices: ['Dine-in', 'Takeout'],
    secondaryServices: ['Catering'],
    uniqueSellingPoints: ['Family recipes since 1985'],
    colorPalette: {
      primary: '#8B4513',
      secondary: '#F5DEB3',
      accent: '#FF6347',
      background: '#FFF8DC',
      text: '#2F1B0C',
    },
    typography: { heading: 'Georgia', body: 'Helvetica', accent: 'Pacifico' },
    layoutStyle: 'Warm and inviting, image-forward',
    websiteSections: ['Hero', 'Menu', 'About', 'Contact'],
    seoKeywords: ['diner near me', 'comfort food'],
    localSeoSuggestions: ['Add Google Business Profile hours'],
    ctaRecommendations: ['Order Online', 'Reserve a Table'],
    trustSignals: ['30+ years in business'],
    socialProofSuggestions: ['Feature Google reviews'],
    imageRecommendations: ['Interior shots', 'Signature dishes'],
    contentRecommendations: ['Highlight family history on About page'],
  };
}

describe('businessAnalysisOutputSchema', () => {
  it('accepts a well-formed 19-field output', () => {
    expect(businessAnalysisOutputSchema.safeParse(validOutput()).success).toBe(true);
  });

  it('rejects a missing required field', () => {
    const { businessSummary: _omit, ...rest } = validOutput();
    expect(businessAnalysisOutputSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects an empty required array', () => {
    const result = businessAnalysisOutputSchema.safeParse({
      ...validOutput(),
      primaryServices: [],
    });
    expect(result.success).toBe(false);
  });

  it('allows an empty optional array (secondaryServices)', () => {
    const result = businessAnalysisOutputSchema.safeParse({
      ...validOutput(),
      secondaryServices: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed colorPalette', () => {
    const result = businessAnalysisOutputSchema.safeParse({
      ...validOutput(),
      colorPalette: { primary: '#fff' },
    });
    expect(result.success).toBe(false);
  });
});

describe('businessAnalysisSchema', () => {
  const valid = {
    id: UUID_A,
    businessId: UUID_B,
    analysisVersion: 1,
    promptName: 'business_analysis',
    promptVersion: 'v1.0',
    aiProvider: 'claude',
    aiModel: 'claude-sonnet-5',
    status: 'completed',
    brandBrief: validOutput(),
    confidenceScore: 0.85,
    validationErrors: null,
    executionTimeMs: 4200,
    completedAt: new Date().toISOString(),
    promptTokens: 1200,
    completionTokens: 800,
    totalTokens: 2000,
    estimatedCost: 0.021,
    createdAt: new Date().toISOString(),
  };

  it('accepts a well-formed completed analysis', () => {
    expect(businessAnalysisSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a pending analysis with null brandBrief and metrics', () => {
    const pending = {
      ...valid,
      status: 'pending',
      brandBrief: null,
      confidenceScore: null,
      executionTimeMs: null,
      completedAt: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      estimatedCost: null,
    };
    expect(businessAnalysisSchema.safeParse(pending).success).toBe(true);
  });

  it('accepts a failed analysis with validationErrors populated', () => {
    const failed = {
      ...valid,
      status: 'failed',
      brandBrief: null,
      confidenceScore: null,
      validationErrors: ['industry: Required'],
    };
    expect(businessAnalysisSchema.safeParse(failed).success).toBe(true);
  });

  it('rejects a status outside the documented enum', () => {
    expect(businessAnalysisSchema.safeParse({ ...valid, status: 'in_progress' }).success).toBe(
      false,
    );
  });

  it('rejects an aiProvider outside the documented enum', () => {
    expect(businessAnalysisSchema.safeParse({ ...valid, aiProvider: 'CLAUDE' }).success).toBe(
      false,
    );
  });

  it('rejects a confidenceScore outside [0, 1]', () => {
    expect(businessAnalysisSchema.safeParse({ ...valid, confidenceScore: 1.5 }).success).toBe(
      false,
    );
  });
});
