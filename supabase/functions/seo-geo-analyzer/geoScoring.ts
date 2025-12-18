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

  // Detect structured data - Business focused schemas
  const hasStructuredData = schemaMarkup.length > 0;
  const hasFaqSchema = schemaMarkup.some((block) =>
    /"@type"\s*:\s*"FAQPage"/i.test(block)
  );
  const hasBusinessSchema = schemaMarkup.some((block) =>
    /"@type"\s*:\s*"(Organization|LocalBusiness|Service|Product|Article|HowTo|WebPage|BreadcrumbList)"/i.test(block)
  );

  // Detect FAQ content
  const faqHeading = /faq|frequently\s+asked\s+questions/i.test(html);
  const questionMatches = html.match(
    /\b(what|how|why|where|when|can|should|is|are|does|do)\b[^?]{0,120}\?/gi
  ) ?? [];
  const hasFaqContent = hasFaqSchema || faqHeading || questionMatches.length >= 3;
  const questionCount = questionMatches.length;

  // Check for conversational headers - AI search friendly
  const allHeaders = [...h1Tags, ...h2Tags].join(' ').toLowerCase();
  const hasConversationalHeaders = /\b(what|how|why|when|guide|understanding|best|top|tips|ways|steps)\b/.test(allHeaders);

  // Structured formatting - important for AI parsing
  const hasOrderedList = /<ol[^>]*>/i.test(html);
  const hasUnorderedList = /<ul[^>]*>/i.test(html);
  const hasTable = /<table[^>]*>/i.test(html);
  const hasStructuredFormatting = hasOrderedList || hasUnorderedList || hasTable;

  // Authority signals - Business & industry focused
  const hasCitations = /\b(source|reference|citation|study|research|report|survey|data|according\s+to|statistics)\b/i.test(html);
  const hasHighQualityCitations = /<a[^>]*href=["'](.*?\.gov|.*?\.edu|.*?forbes|.*?harvard|.*?mckinsey|.*?gartner|.*?statista)["']/i.test(html);
  const hasStatistics = /\d+%|\d+\s*(percent|companies|businesses|customers|users|increase|decrease|growth)/i.test(html);

  // E-E-A-T signals - Experience, Expertise, Authority, Trust
  const hasAuthorByline = /\b(by|author|written\s+by|contributor)\b/i.test(html);
  const hasCredentials = /\b(CEO|founder|expert|consultant|analyst|MBA|CPA|certified|professional|years\s+of\s+experience)\b/i.test(html);
  const hasAboutSection = /\b(about\s+us|our\s+team|who\s+we\s+are|our\s+story)\b/i.test(html);
  const eeatCount = [hasAuthorByline, hasCredentials, hasAboutSection].filter(Boolean).length;
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

  // CONVERSATIONAL HEADERS (15 points) - Critical for AI search
  if (hasConversationalHeaders && h1Tags.length > 0) {
    rawScore += 15;
    breakdown.push({ factor: 'conversational_headers', points: 15, detail: 'AI-friendly conversational headers detected.' });
  } else if (h1Tags.length > 0) {
    rawScore += 5;
    breakdown.push({ factor: 'conversational_headers', points: 5, detail: 'Headers present but could be more conversational.' });
  } else {
    breakdown.push({ factor: 'conversational_headers', points: 0, detail: 'Missing conversational header structure.' });
  }

  // HEADER STRUCTURE (10 points)
  if (h2Count >= 6) {
    rawScore += 10;
    breakdown.push({ factor: 'structure', points: 10, detail: `Excellent structure: ${h2Count} H2 sections.` });
  } else if (h2Count >= 4) {
    rawScore += 6;
    breakdown.push({ factor: 'structure', points: 6, detail: `Good structure: ${h2Count} H2 sections.` });
  } else {
    rawScore += 2;
    breakdown.push({ factor: 'structure', points: 2, detail: `Limited structure for AI parsing.` });
  }

  // CONTENT DEPTH (12 points) - AI needs comprehensive content
  if (wordCount >= 1500) {
    rawScore += 12;
    breakdown.push({ factor: 'content_depth', points: 12, detail: `Comprehensive content (${wordCount} words).` });
  } else if (wordCount >= 800) {
    rawScore += 8;
    breakdown.push({ factor: 'content_depth', points: 8, detail: `Good depth (${wordCount} words).` });
  } else if (wordCount >= 400) {
    rawScore += 4;
    breakdown.push({ factor: 'content_depth', points: 4, detail: `Moderate depth (${wordCount} words).` });
  } else {
    breakdown.push({ factor: 'content_depth', points: 0, detail: `Thin content limits AI visibility (${wordCount} words).` });
  }

  // STRUCTURED DATA (15 points) - Business schemas
  if (hasBusinessSchema && hasFaqSchema) {
    rawScore += 15;
    breakdown.push({ factor: 'structured_data', points: 15, detail: 'Rich business + FAQ schema markup.' });
  } else if (hasBusinessSchema || hasStructuredData) {
    rawScore += 8;
    breakdown.push({ factor: 'structured_data', points: 8, detail: 'Schema markup present.' });
  } else {
    breakdown.push({ factor: 'structured_data', points: 0, detail: 'No structured data for AI engines.' });
  }

  // FAQ SCHEMA (18 points) - High value for AI answers
  if (hasFaqSchema) {
    rawScore += 18;
    breakdown.push({ factor: 'faq_schema', points: 18, detail: 'FAQPage schema - excellent for AI answers.' });
  } else if (hasFaqContent) {
    rawScore += 5;
    breakdown.push({ factor: 'faq_schema', points: 5, detail: 'FAQ content found but no schema markup.' });
  } else {
    breakdown.push({ factor: 'faq_schema', points: 0, detail: 'No FAQ content or schema.' });
  }

  // VOICE/AI SEARCH OPTIMIZATION (20 points)
  if (questionCount >= 8) {
    rawScore += 20;
    breakdown.push({ factor: 'ai_search_ready', points: 20, detail: `Excellent AI coverage (${questionCount} Q&A patterns).` });
  } else if (questionCount >= 5) {
    rawScore += 15;
    breakdown.push({ factor: 'ai_search_ready', points: 15, detail: `Good AI coverage (${questionCount} Q&A patterns).` });
  } else if (questionCount >= 3) {
    rawScore += 8;
    breakdown.push({ factor: 'ai_search_ready', points: 8, detail: `Moderate AI coverage (${questionCount} Q&A patterns).` });
  } else {
    rawScore += 2;
    breakdown.push({ factor: 'ai_search_ready', points: 2, detail: `Limited question-answer content for AI.` });
  }

  // AUTHORITY SIGNALS (12 points)
  if (hasHighQualityCitations && hasStatistics) {
    rawScore += 12;
    breakdown.push({ factor: 'authority_signals', points: 12, detail: 'Strong citations + data points.' });
  } else if (hasCitations || hasStatistics) {
    rawScore += 6;
    breakdown.push({ factor: 'authority_signals', points: 6, detail: 'Some authority signals detected.' });
  } else {
    breakdown.push({ factor: 'authority_signals', points: 0, detail: 'Add citations and data for credibility.' });
  }

  // PERFORMANCE (5 points) - Fast sites rank better
  if (loadTime <= 2000) {
    rawScore += 5;
    breakdown.push({ factor: 'performance', points: 5, detail: `Fast load time (${loadTime}ms).` });
  } else if (loadTime <= 3500) {
    rawScore += 3;
    breakdown.push({ factor: 'performance', points: 3, detail: `Acceptable speed (${loadTime}ms).` });
  } else {
    breakdown.push({ factor: 'performance', points: 0, detail: `Slow performance hurts rankings (${loadTime}ms).` });
  }

  // E-E-A-T (13 points) - Critical for business trust
  if (eeatCount >= 3) {
    rawScore += 13;
    breakdown.push({ factor: 'eeat_signals', points: 13, detail: 'Strong E-E-A-T signals (expertise + trust).' });
  } else if (eeatCount >= 2) {
    rawScore += 8;
    breakdown.push({ factor: 'eeat_signals', points: 8, detail: 'Good E-E-A-T foundation.' });
  } else if (eeatCount === 1) {
    rawScore += 4;
    breakdown.push({ factor: 'eeat_signals', points: 4, detail: 'Basic E-E-A-T signals present.' });
  } else {
    breakdown.push({ factor: 'eeat_signals', points: 0, detail: 'Add author credentials and expertise signals.' });
  }

  // META OPTIMIZATION (10 points)
  let metaPoints = 0;
  if (hasOptimalTitleLength) metaPoints += 5;
  if (hasOptimalMetaLength) metaPoints += 5;
  rawScore += metaPoints;
  breakdown.push({ factor: 'meta_optimization', points: metaPoints, detail: `Meta tags: ${metaPoints}/10 points.` });

  // IMAGE OPTIMIZATION (5 points)
  if (altCoverage >= 0.9) {
    rawScore += 5;
    breakdown.push({ factor: 'image_optimization', points: 5, detail: `Excellent alt text (${imagesWithAlt}/${imageCount}).` });
  } else if (altCoverage >= 0.5) {
    rawScore += 3;
    breakdown.push({ factor: 'image_optimization', points: 3, detail: `Partial alt text (${imagesWithAlt}/${imageCount}).` });
  } else {
    breakdown.push({ factor: 'image_optimization', points: 0, detail: 'Images need alt text for AI indexing.' });
  }

  // INTERNAL LINKING (5 points)
  if (internalLinkCount >= 10) {
    rawScore += 5;
    breakdown.push({ factor: 'internal_linking', points: 5, detail: `Strong internal linking (${internalLinkCount} links).` });
  } else if (internalLinkCount >= 5) {
    rawScore += 3;
    breakdown.push({ factor: 'internal_linking', points: 3, detail: `Good internal linking (${internalLinkCount} links).` });
  } else {
    breakdown.push({ factor: 'internal_linking', points: 0, detail: 'Add more internal links for topic authority.' });
  }

  // STRUCTURED FORMATTING (5 points)
  if (hasStructuredFormatting) {
    rawScore += 5;
    breakdown.push({ factor: 'structured_formatting', points: 5, detail: 'Lists/tables help AI parse content.' });
  } else {
    breakdown.push({ factor: 'structured_formatting', points: 0, detail: 'Add lists or tables for better AI parsing.' });
  }

  // CONTENT FRESHNESS (5 points)
  if (hasContentFreshness) {
    rawScore += 5;
    breakdown.push({ factor: 'content_freshness', points: 5, detail: 'Recent content signals detected.' });
  } else {
    breakdown.push({ factor: 'content_freshness', points: 0, detail: 'Update content with current year references.' });
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
    'faq_schema', 'ai_search_ready', 'authority_signals', 'performance',
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
