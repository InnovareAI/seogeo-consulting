interface SeoScoreBreakdown {
  factor: string;
  points: number;
  detail: string;
}

interface SeoEvaluation {
  score: number;
  rawScore: number;
  breakdown: SeoScoreBreakdown[];
  hasTitle: boolean;
  hasMetaDescription: boolean;
  hasCanonical: boolean;
  hasH1: boolean;
  hasSchema: boolean;
  hasGoodContent: boolean;
  hasKeywords: boolean;
  hasMobileOptimization: boolean;
  hasSecureProtocol: boolean;
  hasXMLSitemap: boolean;
  hasRobotsTxt: boolean;
  hasPageSpeed: boolean;
  hasImageOptimization: boolean;
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

export function evaluateSeoSignals(html: string, snapshot: SnapshotData, url: string): SeoEvaluation {
  const breakdown: SeoScoreBreakdown[] = [];
  let rawScore = 0;

  const title = snapshot.title || '';
  const metaDesc = snapshot.metaDescription || '';
  const h1Tags = snapshot.h1Tags || [];
  const h2Tags = snapshot.h2Tags || [];
  const schemaMarkup = snapshot.schemaMarkup || [];
  const wordCount = snapshot.wordCount || 0;
  const loadTime = snapshot.loadTime || 0;

  const hasTitle = title.length > 0;
  const hasMetaDescription = metaDesc.length > 0;
  const hasCanonical = !!snapshot.canonicalUrl;
  const hasH1 = h1Tags.length > 0;
  const hasSchema = schemaMarkup.length > 0;
  const hasGoodContent = wordCount >= 300;
  const isHTTPS = url.startsWith('https://');
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);

  // TITLE TAG (15 points max)
  const titleLength = title.length;
  if (!hasTitle) {
    breakdown.push({ factor: 'title_tag', points: 0, detail: 'Missing title tag.' });
  } else if (titleLength >= 50 && titleLength <= 60) {
    rawScore += 15;
    breakdown.push({ factor: 'title_tag', points: 15, detail: `Perfect title length (${titleLength} chars).` });
  } else if (titleLength >= 30 && titleLength < 50) {
    rawScore += 10;
    breakdown.push({ factor: 'title_tag', points: 10, detail: `Good title but short (${titleLength} chars).` });
  } else {
    rawScore += 5;
    breakdown.push({ factor: 'title_tag', points: 5, detail: `Title needs optimization (${titleLength} chars).` });
  }

  // META DESCRIPTION (15 points max)
  const metaLength = metaDesc.length;
  if (!hasMetaDescription) {
    breakdown.push({ factor: 'meta_description', points: 0, detail: 'Missing meta description.' });
  } else if (metaLength >= 150 && metaLength <= 160) {
    rawScore += 15;
    breakdown.push({ factor: 'meta_description', points: 15, detail: `Perfect length (${metaLength} chars).` });
  } else if (metaLength >= 120) {
    rawScore += 12;
    breakdown.push({ factor: 'meta_description', points: 12, detail: `Good length (${metaLength} chars).` });
  } else {
    rawScore += 5;
    breakdown.push({ factor: 'meta_description', points: 5, detail: `Too short (${metaLength} chars).` });
  }

  // HEADER TAGS (15 points max)
  const h1Count = h1Tags.length;
  const h2Count = h2Tags.length;
  if (h1Count === 1 && h2Count >= 4) {
    rawScore += 15;
    breakdown.push({ factor: 'header_tags', points: 15, detail: `Excellent: 1 H1 + ${h2Count} H2 tags.` });
  } else if (h1Count === 1 && h2Count >= 2) {
    rawScore += 10;
    breakdown.push({ factor: 'header_tags', points: 10, detail: `Good: 1 H1 + ${h2Count} H2 tags.` });
  } else if (h1Count >= 1) {
    rawScore += 5;
    breakdown.push({ factor: 'header_tags', points: 5, detail: `H1 present but needs more H2s.` });
  } else {
    breakdown.push({ factor: 'header_tags', points: 0, detail: 'Missing H1 tag.' });
  }

  // CONTENT QUALITY (12 points max)
  if (wordCount >= 1500) {
    rawScore += 12;
    breakdown.push({ factor: 'content_quality', points: 12, detail: `Excellent depth (${wordCount} words).` });
  } else if (wordCount >= 800) {
    rawScore += 10;
    breakdown.push({ factor: 'content_quality', points: 10, detail: `Good length (${wordCount} words).` });
  } else if (wordCount >= 300) {
    rawScore += 5;
    breakdown.push({ factor: 'content_quality', points: 5, detail: `Thin content (${wordCount} words).` });
  } else {
    breakdown.push({ factor: 'content_quality', points: 0, detail: `Very thin (${wordCount} words).` });
  }

  // STRUCTURED DATA (10 points max)
  if (schemaMarkup.length >= 2) {
    rawScore += 10;
    breakdown.push({ factor: 'structured_data', points: 10, detail: `${schemaMarkup.length} schema blocks.` });
  } else if (schemaMarkup.length === 1) {
    rawScore += 7;
    breakdown.push({ factor: 'structured_data', points: 7, detail: 'Schema present.' });
  } else {
    breakdown.push({ factor: 'structured_data', points: 0, detail: 'No schema markup.' });
  }

  // CANONICAL TAG (7 points)
  if (hasCanonical) {
    rawScore += 7;
    breakdown.push({ factor: 'canonical_tag', points: 7, detail: 'Canonical tag present.' });
  } else {
    breakdown.push({ factor: 'canonical_tag', points: 0, detail: 'Missing canonical tag.' });
  }

  // INTERNAL LINKS (10 points max)
  const internalLinks = html.match(/<a[^>]*href=["'][^"']*["'][^>]*>/gi) || [];
  const internalLinkCount = internalLinks.filter(link =>
    !link.includes('http://') && !link.includes('https://')
  ).length;
  if (internalLinkCount >= 5) {
    rawScore += 10;
    breakdown.push({ factor: 'internal_links', points: 10, detail: `${internalLinkCount} internal links.` });
  } else if (internalLinkCount >= 3) {
    rawScore += 6;
    breakdown.push({ factor: 'internal_links', points: 6, detail: `${internalLinkCount} internal links.` });
  } else {
    rawScore += 2;
    breakdown.push({ factor: 'internal_links', points: 2, detail: 'Few internal links.' });
  }

  // IMAGE OPTIMIZATION (10 points max)
  const images = html.match(/<img[^>]*>/gi) || [];
  const imageCount = images.length;
  const imagesWithAlt = html.match(/<img[^>]*alt=["'][^"']+["'][^>]*>/gi)?.length || 0;
  const altCoverage = imageCount > 0 ? (imagesWithAlt / imageCount) : 1;
  if (altCoverage >= 0.9) {
    rawScore += 10;
    breakdown.push({ factor: 'image_optimization', points: 10, detail: `${imagesWithAlt}/${imageCount} with alt.` });
  } else if (altCoverage >= 0.5) {
    rawScore += 6;
    breakdown.push({ factor: 'image_optimization', points: 6, detail: `${imagesWithAlt}/${imageCount} with alt.` });
  } else {
    rawScore += 2;
    breakdown.push({ factor: 'image_optimization', points: 2, detail: 'Poor alt text coverage.' });
  }

  // MOBILE OPTIMIZATION (7 points)
  if (hasViewport) {
    rawScore += 7;
    breakdown.push({ factor: 'mobile_optimization', points: 7, detail: 'Viewport meta present.' });
  } else {
    breakdown.push({ factor: 'mobile_optimization', points: 0, detail: 'Missing viewport.' });
  }

  // HTTPS (5 points)
  if (isHTTPS) {
    rawScore += 5;
    breakdown.push({ factor: 'https_security', points: 5, detail: 'HTTPS enabled.' });
  } else {
    breakdown.push({ factor: 'https_security', points: 0, detail: 'Not using HTTPS.' });
  }

  // PAGE SPEED (7 points max)
  if (loadTime <= 1500) {
    rawScore += 7;
    breakdown.push({ factor: 'page_speed', points: 7, detail: `Excellent (${loadTime}ms).` });
  } else if (loadTime <= 3000) {
    rawScore += 5;
    breakdown.push({ factor: 'page_speed', points: 5, detail: `Good (${loadTime}ms).` });
  } else {
    rawScore += 2;
    breakdown.push({ factor: 'page_speed', points: 2, detail: `Slow (${loadTime}ms).` });
  }

  // LANGUAGE (5 points)
  const hasLang = !!snapshot.langAttribute;
  if (hasLang) {
    rawScore += 5;
    breakdown.push({ factor: 'language_locale', points: 5, detail: `Language: ${snapshot.langAttribute}` });
  } else {
    breakdown.push({ factor: 'language_locale', points: 0, detail: 'No language attribute.' });
  }

  // Normalize to 0-100
  const maxRawScore = 130;
  const normalizedScore = Math.round((rawScore / maxRawScore) * 100);
  const finalScore = Math.max(0, Math.min(100, normalizedScore));

  return {
    score: finalScore,
    rawScore,
    breakdown,
    hasTitle,
    hasMetaDescription,
    hasCanonical,
    hasH1,
    hasSchema,
    hasGoodContent,
    hasKeywords: true,
    hasMobileOptimization: hasViewport,
    hasSecureProtocol: isHTTPS,
    hasXMLSitemap: false,
    hasRobotsTxt: false,
    hasPageSpeed: loadTime <= 3000,
    hasImageOptimization: altCoverage >= 0.7
  };
}

export function orderSeoBreakdown(entries: SeoScoreBreakdown[]): SeoScoreBreakdown[] {
  const factorOrder = [
    'title_tag', 'meta_description', 'header_tags', 'content_quality',
    'structured_data', 'canonical_tag', 'internal_links', 'image_optimization',
    'mobile_optimization', 'https_security', 'page_speed', 'language_locale'
  ];
  const entryMap = new Map(entries.map((e) => [e.factor, e]));
  const ordered: SeoScoreBreakdown[] = [];
  for (const factor of factorOrder) {
    const found = entryMap.get(factor);
    if (found) ordered.push(found);
  }
  return ordered;
}
