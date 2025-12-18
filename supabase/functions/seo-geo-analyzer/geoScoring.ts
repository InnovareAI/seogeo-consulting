interface GeoScoreBreakdown {
  factor: string;
  points: number;
  detail: string;
}

interface GeoEvaluation {
  score: number;
  rawScore: number;
  breakdown: GeoScoreBreakdown[];
  hasStructuredData: boolean;
  hasFaqSchema: boolean;
  hasFaqContent: boolean;
  questionCount: number;
  wordCount: number;
  loadTime: number;
  h2Count: number;
  hasConversationalHeaders: boolean;
  hasCitations: boolean;
  hasStatistics: boolean;
  hasEEAT: boolean;
  hasMetaOptimization: boolean;
  hasImageOptimization: boolean;
  hasInternalLinks: boolean;
  hasContentFreshness: boolean;
}

interface SnapshotData {
  url: string;
  title?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  langAttribute?: string;
  h1Tags: string[];
  h2Tags: string[];
  schemaMarkup: string[];
  loadTime: number;
  statusCode: number;
  pageSize: number;
  wordCount: number;
  analyzedAt: string;
}

export function evaluateGeoSignals(html: string, snapshot: SnapshotData): GeoEvaluation {
  const schemaMarkup: string[] = snapshot.schemaMarkup ?? [];
  const wordCount = snapshot.wordCount ?? 0;
  const loadTime = snapshot.loadTime ?? 0;
  const h1Tags = snapshot.h1Tags ?? [];
  const h2Tags = snapshot.h2Tags ?? [];
  const h2Count = h2Tags.length;

  // Detect structured data
  const hasStructuredData = schemaMarkup.length > 0;
  const hasFaqSchema = schemaMarkup.some((block) =>
    /"@type"\s*:\s*"FAQPage"/i.test(block)
  );
  const hasMedicalSchema = schemaMarkup.some((block) =>
    /"@type"\s*:\s*"(Drug|MedicalCondition|MedicalWebPage)"/i.test(block)
  );

  // Detect FAQ content
  const faqHeading = /faq|frequently\s+asked\s+questions/i.test(html);
  const questionMatches = html.match(
    /\b(what|how|why|where|when|can|should|is|are|does|do)\b[^?]{0,120}\?/gi
  ) ?? [];
  const hasFaqContent = hasFaqSchema || faqHeading || questionMatches.length >= 3;
  const questionCount = questionMatches.length;

  // Check for conversational headers
  const allHeaders = [...h1Tags, ...h2Tags].join(' ').toLowerCase();
  const hasConversationalHeaders = /\b(what|how|why|when|guide|understanding)\b/.test(allHeaders);

  // Structured formatting
  const hasOrderedList = /<ol[^>]*>/i.test(html);
  const hasUnorderedList = /<ul[^>]*>/i.test(html);
  const hasTable = /<table[^>]*>/i.test(html);
  const hasStructuredFormatting = hasOrderedList || hasUnorderedList || hasTable;

  // Authority signals
  const hasCitations = /\b(source|reference|citation|study|research|fda|journal|pubmed|clinical)\b/i.test(html);
  const hasHighQualityCitations = /<a[^>]*href=["'](.*?fda\.gov|.*?nih\.gov|.*?pubmed)["']/i.test(html);
  const hasStatistics = /\d+%|\d+\s*(patients?|participants?|response|efficacy)/i.test(html);

  // E-E-A-T signals
  const hasAuthorByline = /\b(by|author|written\s+by)\s+(Dr\.|MD|PhD|PharmD)/i.test(html);
  const hasMedicalReview = /medically\s+reviewed\s+by/i.test(html);
  const eeatCount = [hasAuthorByline, hasMedicalReview].filter(Boolean).length;
  const hasEEAT = eeatCount > 0;

  // Meta optimization
  const titleTag = snapshot.title || '';
  const metaDesc = snapshot.metaDescription || '';
  const hasTitleTag = titleTag.length > 0;
  const hasOptimalTitleLength = titleTag.length >= 30 && titleTag.length <= 60;
  const hasMetaDescription = metaDesc.length > 0;
  const hasOptimalMetaLength = metaDesc.length >= 120 && metaDesc.length <= 160;
  const hasMetaOptimization = hasTitleTag || hasMetaDescription;

  // Image optimization
  const imageMatches = html.match(/<img[^>]*>/gi) || [];
  const imageCount = imageMatches.length;
  const imagesWithAlt = html.match(/<img[^>]*alt=["'][^"']+["'][^>]*>/gi)?.length || 0;
  const altCoverage = imageCount > 0 ? (imagesWithAlt / imageCount) : 0;
  const hasImageOptimization = imageCount > 0 && altCoverage > 0;

  // Internal linking
  const internalLinks = html.match(/<a[^>]*href=["'][^"']*["'][^>]*>/gi) || [];
  const internalLinkCount = internalLinks.filter(link =>
    !link.includes('http://') && !link.includes('https://')
  ).length;
  const hasInternalLinks = internalLinkCount >= 3;

  // Content freshness
  const currentYear = new Date().getFullYear();
  const hasRecentYear = new RegExp(`\\b(${currentYear}|${currentYear - 1})\\b`).test(html);
  const hasContentFreshness = hasRecentYear;

  // Start scoring (raw points out of 150)
  const breakdown: GeoScoreBreakdown[] = [];
  let rawScore = 0;

  // CONVERSATIONAL HEADERS (15 points)
  if (hasConversationalHeaders && h1Tags.length > 0) {
    rawScore += 15;
    breakdown.push({ factor: 'conversational_headers', points: 15, detail: 'Conversational headers detected.' });
  } else if (h1Tags.length > 0) {
    rawScore += 5;
    breakdown.push({ factor: 'conversational_headers', points: 5, detail: 'Headers present but not conversational.' });
  } else {
    breakdown.push({ factor: 'conversational_headers', points: 0, detail: 'Missing conversational structure.' });
  }

  // HEADER STRUCTURE (10 points)
  if (h2Count >= 6) {
    rawScore += 10;
    breakdown.push({ factor: 'structure', points: 10, detail: `Rich structure: ${h2Count} H2 tags.` });
  } else if (h2Count >= 4) {
    rawScore += 6;
    breakdown.push({ factor: 'structure', points: 6, detail: `Good structure: ${h2Count} H2 tags.` });
  } else {
    rawScore += 2;
    breakdown.push({ factor: 'structure', points: 2, detail: `Minimal structure.` });
  }

  // CONTENT DEPTH (12 points)
  if (wordCount >= 1500) {
    rawScore += 12;
    breakdown.push({ factor: 'content_depth', points: 12, detail: `Comprehensive (${wordCount} words).` });
  } else if (wordCount >= 800) {
    rawScore += 8;
    breakdown.push({ factor: 'content_depth', points: 8, detail: `Good depth (${wordCount} words).` });
  } else if (wordCount >= 400) {
    rawScore += 4;
    breakdown.push({ factor: 'content_depth', points: 4, detail: `Moderate (${wordCount} words).` });
  } else {
    breakdown.push({ factor: 'content_depth', points: 0, detail: `Thin content (${wordCount} words).` });
  }

  // STRUCTURED DATA (15 points)
  if (hasMedicalSchema) {
    rawScore += 15;
    breakdown.push({ factor: 'structured_data', points: 15, detail: 'Medical schema present.' });
  } else if (hasStructuredData) {
    rawScore += 8;
    breakdown.push({ factor: 'structured_data', points: 8, detail: 'Schema markup present.' });
  } else {
    breakdown.push({ factor: 'structured_data', points: 0, detail: 'No structured data.' });
  }

  // FAQ SCHEMA (18 points)
  if (hasFaqSchema) {
    rawScore += 18;
    breakdown.push({ factor: 'faq_schema', points: 18, detail: 'FAQPage schema implemented.' });
  } else if (hasFaqContent) {
    rawScore += 5;
    breakdown.push({ factor: 'faq_schema', points: 5, detail: 'FAQ content but no schema.' });
  } else {
    breakdown.push({ factor: 'faq_schema', points: 0, detail: 'No FAQ content or schema.' });
  }

  // VOICE SEARCH (20 points)
  if (questionCount >= 8) {
    rawScore += 20;
    breakdown.push({ factor: 'voice_search', points: 20, detail: `Excellent (${questionCount} questions).` });
  } else if (questionCount >= 5) {
    rawScore += 15;
    breakdown.push({ factor: 'voice_search', points: 15, detail: `Good (${questionCount} questions).` });
  } else if (questionCount >= 3) {
    rawScore += 8;
    breakdown.push({ factor: 'voice_search', points: 8, detail: `Moderate (${questionCount} questions).` });
  } else {
    rawScore += 2;
    breakdown.push({ factor: 'voice_search', points: 2, detail: `Limited question content.` });
  }

  // AUTHORITY SIGNALS (12 points)
  if (hasHighQualityCitations && hasStatistics) {
    rawScore += 12;
    breakdown.push({ factor: 'authority_signals', points: 12, detail: 'High-quality citations + stats.' });
  } else if (hasCitations) {
    rawScore += 6;
    breakdown.push({ factor: 'authority_signals', points: 6, detail: 'Citations detected.' });
  } else {
    breakdown.push({ factor: 'authority_signals', points: 0, detail: 'No authority signals.' });
  }

  // PERFORMANCE (5 points)
  if (loadTime <= 2000) {
    rawScore += 5;
    breakdown.push({ factor: 'performance', points: 5, detail: `Fast (${loadTime}ms).` });
  } else if (loadTime <= 3500) {
    rawScore += 3;
    breakdown.push({ factor: 'performance', points: 3, detail: `Good (${loadTime}ms).` });
  } else {
    breakdown.push({ factor: 'performance', points: 0, detail: `Slow (${loadTime}ms).` });
  }

  // E-E-A-T (13 points)
  if (eeatCount >= 2) {
    rawScore += 13;
    breakdown.push({ factor: 'eeat_signals', points: 13, detail: 'Strong E-E-A-T signals.' });
  } else if (eeatCount === 1) {
    rawScore += 5;
    breakdown.push({ factor: 'eeat_signals', points: 5, detail: 'Some E-E-A-T signals.' });
  } else {
    breakdown.push({ factor: 'eeat_signals', points: 0, detail: 'No E-E-A-T signals.' });
  }

  // META OPTIMIZATION (10 points)
  let metaPoints = 0;
  if (hasOptimalTitleLength) metaPoints += 4;
  if (hasOptimalMetaLength) metaPoints += 4;
  rawScore += metaPoints;
  breakdown.push({ factor: 'meta_optimization', points: metaPoints, detail: `Meta tags: ${metaPoints}/8 points.` });

  // IMAGE OPTIMIZATION (5 points)
  if (altCoverage >= 0.9) {
    rawScore += 5;
    breakdown.push({ factor: 'image_optimization', points: 5, detail: `${imagesWithAlt}/${imageCount} with alt.` });
  } else if (altCoverage >= 0.5) {
    rawScore += 3;
    breakdown.push({ factor: 'image_optimization', points: 3, detail: `${imagesWithAlt}/${imageCount} with alt.` });
  } else {
    breakdown.push({ factor: 'image_optimization', points: 0, detail: 'Poor alt text coverage.' });
  }

  // INTERNAL LINKING (5 points)
  if (internalLinkCount >= 10) {
    rawScore += 5;
    breakdown.push({ factor: 'internal_linking', points: 5, detail: `${internalLinkCount} internal links.` });
  } else if (internalLinkCount >= 5) {
    rawScore += 3;
    breakdown.push({ factor: 'internal_linking', points: 3, detail: `${internalLinkCount} internal links.` });
  } else {
    breakdown.push({ factor: 'internal_linking', points: 0, detail: 'Few internal links.' });
  }

  // STRUCTURED FORMATTING (5 points)
  if (hasStructuredFormatting) {
    rawScore += 5;
    breakdown.push({ factor: 'structured_formatting', points: 5, detail: 'Lists/tables detected.' });
  } else {
    breakdown.push({ factor: 'structured_formatting', points: 0, detail: 'No structured formatting.' });
  }

  // CONTENT FRESHNESS (5 points)
  if (hasContentFreshness) {
    rawScore += 5;
    breakdown.push({ factor: 'content_freshness', points: 5, detail: 'Recent content signals.' });
  } else {
    breakdown.push({ factor: 'content_freshness', points: 0, detail: 'No freshness signals.' });
  }

  // Normalize to 0-100
  const maxRawScore = 150;
  const normalizedScore = Math.round((rawScore / maxRawScore) * 100);
  const finalScore = Math.max(0, Math.min(100, normalizedScore));

  return {
    score: finalScore,
    rawScore,
    breakdown,
    hasStructuredData,
    hasFaqSchema,
    hasFaqContent,
    questionCount,
    wordCount,
    loadTime,
    h2Count,
    hasConversationalHeaders,
    hasCitations,
    hasStatistics,
    hasEEAT,
    hasMetaOptimization,
    hasImageOptimization,
    hasInternalLinks,
    hasContentFreshness
  };
}

export function orderBreakdown(entries: GeoScoreBreakdown[]): GeoScoreBreakdown[] {
  const factorOrder = [
    'conversational_headers', 'structure', 'content_depth', 'structured_data',
    'faq_schema', 'voice_search', 'authority_signals', 'performance',
    'eeat_signals', 'meta_optimization', 'image_optimization',
    'internal_linking', 'structured_formatting', 'content_freshness'
  ];
  const entryMap = new Map(entries.map((e) => [e.factor, e]));
  const ordered: GeoScoreBreakdown[] = [];
  for (const factor of factorOrder) {
    const found = entryMap.get(factor);
    if (found) ordered.push(found);
  }
  return ordered;
}
