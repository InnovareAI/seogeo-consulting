import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface SEOAnalysis {
  seoScore: number;
  geoScore: number;
  seoBreakdown?: BreakdownEntry[];
  geoBreakdown?: BreakdownEntry[];
  issues?: string[];
  recommendations?: Recommendation[];
}

interface BreakdownEntry {
  factor: string;
  points: number;
  detail: string;
}

interface Recommendation {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

interface SnapshotData {
  url: string;
  title?: string;
  metaDescription?: string;
  h1Tags?: string[];
  h2Tags?: string[];
  loadTime: number;
  wordCount: number;
}

interface AnalysisResults {
  success: boolean;
  snapshot: SnapshotData;
  analysis?: SEOAnalysis;
  error?: string;
}

export default function SEOChecker() {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const priorityStyles: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border border-red-200',
    medium: 'bg-amber-100 text-amber-700 border border-amber-200',
    low: 'bg-blue-100 text-blue-700 border border-blue-200'
  };

  const analyzeURL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !url.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('seo-geo-analyzer', {
        body: { url }
      });

      if (fnError) {
        throw new Error('Analysis service unavailable. Please try again.');
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Unable to analyze this website.');
      }

      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-blue-50';
    if (score >= 40) return 'bg-amber-50';
    return 'bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            SEO/GEO Analyzer
          </h1>
          <p className="text-xl text-purple-200">
            Analyze your website's SEO performance and AI-readiness
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
          <form onSubmit={analyzeURL} className="flex flex-col sm:flex-row gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL (e.g., https://example.com)"
              className="flex-1 px-6 py-4 bg-white/90 border-0 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:outline-none text-lg"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </span>
              ) : 'Analyze'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mb-8 text-red-200">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-6"></div>
            <p className="text-xl text-purple-200">Analyzing website...</p>
            <p className="text-purple-300/60 mt-2">This may take a few seconds</p>
          </div>
        )}

        {/* Results */}
        {results && results.success && (
          <div className="space-y-8">
            {/* Score Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className={`rounded-2xl p-8 text-center ${getScoreBg(results.analysis?.seoScore || 0)}`}>
                <div className={`text-6xl font-bold ${getScoreColor(results.analysis?.seoScore || 0)}`}>
                  {results.analysis?.seoScore || 0}
                </div>
                <div className="text-2xl text-gray-600 mt-2">/ 100</div>
                <div className="text-xl font-semibold text-gray-700 mt-4">SEO Score</div>
                <p className="text-gray-500 mt-2">Traditional search optimization</p>
              </div>
              <div className={`rounded-2xl p-8 text-center ${getScoreBg(results.analysis?.geoScore || 0)}`}>
                <div className={`text-6xl font-bold ${getScoreColor(results.analysis?.geoScore || 0)}`}>
                  {results.analysis?.geoScore || 0}
                </div>
                <div className="text-2xl text-gray-600 mt-2">/ 100</div>
                <div className="text-xl font-semibold text-gray-700 mt-4">GEO Score</div>
                <p className="text-gray-500 mt-2">AI & voice search readiness</p>
              </div>
            </div>

            {/* Page Snapshot */}
            <div className="bg-white rounded-2xl p-8 shadow-xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Page Snapshot</h3>
              <dl className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <dt className="text-sm text-gray-500 mb-1">Title</dt>
                  <dd className="text-gray-900 font-medium truncate">{results.snapshot.title || 'Not found'}</dd>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <dt className="text-sm text-gray-500 mb-1">Load Time</dt>
                  <dd className="text-gray-900 font-medium">{results.snapshot.loadTime}ms</dd>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <dt className="text-sm text-gray-500 mb-1">Word Count</dt>
                  <dd className="text-gray-900 font-medium">{results.snapshot.wordCount?.toLocaleString() || 0}</dd>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <dt className="text-sm text-gray-500 mb-1">H1 Tags</dt>
                  <dd className="text-gray-900 font-medium">{results.snapshot.h1Tags?.length || 0} found</dd>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                  <dt className="text-sm text-gray-500 mb-1">Meta Description</dt>
                  <dd className="text-gray-900 font-medium truncate">
                    {results.snapshot.metaDescription || 'Not found'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Issues */}
            {results.analysis?.issues && results.analysis.issues.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-8 border border-amber-200">
                <h3 className="text-2xl font-bold text-amber-800 mb-6">Issues Found</h3>
                <ul className="space-y-3">
                  {results.analysis.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-3 text-amber-700">
                      <span className="text-xl">⚠️</span>
                      <span className="text-lg">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {results.analysis?.recommendations && results.analysis.recommendations.length > 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">AI Recommendations</h3>
                <ul className="space-y-4">
                  {results.analysis.recommendations.map((rec, i) => (
                    <li key={i} className="bg-gray-50 rounded-xl p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">{rec.title}</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityStyles[rec.priority]}`}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-600">{rec.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SEO Breakdown */}
            {results.analysis?.seoBreakdown && (
              <div className="bg-white rounded-2xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">SEO Factor Breakdown</h3>
                <div className="space-y-3">
                  {results.analysis.seoBreakdown.map((factor, i) => (
                    <div key={i} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                      <div>
                        <span className="font-medium text-gray-700">
                          {factor.factor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        <p className="text-sm text-gray-500">{factor.detail}</p>
                      </div>
                      <span className={`text-lg font-bold ${factor.points >= 8 ? 'text-green-600' : factor.points >= 4 ? 'text-amber-600' : 'text-red-600'}`}>
                        {factor.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GEO Breakdown */}
            {results.analysis?.geoBreakdown && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-200">
                <h3 className="text-2xl font-bold text-purple-900 mb-6">GEO (AI) Factor Breakdown</h3>
                <div className="space-y-3">
                  {results.analysis.geoBreakdown.map((factor, i) => (
                    <div key={i} className="flex items-center justify-between py-3 px-4 bg-white/80 rounded-xl">
                      <div>
                        <span className="font-medium text-purple-700">
                          {factor.factor.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        <p className="text-sm text-purple-500">{factor.detail}</p>
                      </div>
                      <span className={`text-lg font-bold ${factor.points >= 8 ? 'text-green-600' : factor.points >= 4 ? 'text-amber-600' : 'text-red-600'}`}>
                        {factor.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 text-purple-300/60">
          <p>Powered by SEOGEO Consulting</p>
        </div>
      </div>
    </div>
  );
}
