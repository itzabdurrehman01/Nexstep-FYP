import React, { useState } from 'react';
import { useRestoredValue } from '../../hooks/useRestoredValue.js';
import { 
  BookOpen, 
  Award, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight,
  TrendingUp,
  GraduationCap
} from 'lucide-react';
import { translations } from '../../data/translations.js';
import { profileStream, normalizeStream } from '../../config/educationLevels.js';
import { normalizeProvince } from '../../utils/profileFields.js';

function groupFromStream(stream) {
  const s = normalizeStream(stream).toLowerCase();
  if (!s) return '';
  if (s.includes('bio') || s.includes('medical')) return 'science_bio';
  if (s.includes('computer') || s.includes('ics') || s.includes('engineer')) return 'science_cs';
  if (s.includes('art') || s.includes('human') || s.includes('icom') || s.includes('commerce') || s.includes('fa') || s.includes('technical')) return 'arts';
  return '';
}

function boardFromProvince(province) {
  return ({
    Punjab: 'BISE Lahore',
    Sindh: 'BSEK Karachi',
    KPK: 'BISE Peshawar',
    Balochistan: 'BISE Quetta',
    Islamabad: 'FBISE',
    'AJK/GB': 'FBISE',
  })[normalizeProvince(province)] || '';
}

export function Grade8MatricTab({ profile, onNavigate, lang }) {
  const t = translations[lang];

  const [activeSubTab, setActiveSubTab] = useState('matric'); // 'grade8' or 'matric'
  
  // Grade 8 Stream Selection state
  const [selectedGroup, setSelectedGroup] = useRestoredValue(groupFromStream(profileStream(profile)), 'science_cs');

  // Matric Marks Analyzer State
  const [mathMarks, setMathMarks] = useState( profile?.marks?.matricPct ? Math.round(profile.marks.matricPct * 0.75) : 68 );
  const [scienceMarks, setScienceMarks] = useState( profile?.marks?.matricPct ? Math.round(profile.marks.matricPct * 0.8) : 72 );
  const [englishMarks, setEnglishMarks] = useState(70);
  const [physicsMarks, setPhysicsMarks] = useState(70);
  const [chemistryMarks, setChemistryMarks] = useState(68);
  const [computerMarks, setComputerMarks] = useState(74);
  const [urduMarks, setUrduMarks] = useState(72);
  const [totalPercentage, setTotalPercentage] = useRestoredValue(profile?.marks?.matricPct || '', 78);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Grade 8 Interactive Evaluator State
  const [g8Math, setG8Math] = useState(75);
  const [g8Science, setG8Science] = useState(78);
  const [g8English, setG8English] = useState(70);
  const [g8Computer, setG8Computer] = useState(82);
  const [g8Result, setG8Result] = useState(null);
  const [g8Loading, setG8Loading] = useState(false);

  // BISE Board State
  const [biseBoard, setBiseBoard] = useRestoredValue(boardFromProvince(profile?.province), 'FBISE');

  const handleAnalyzeGrade8 = async () => {
    setG8Loading(true);
    try {
      const res = await fetch('/api/analyze-grade8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mathMarks: g8Math,
          scienceMarks: g8Science,
          englishMarks: g8English,
          computerMarks: g8Computer,
          riasec: String(profile?.topRiasecCluster || '').match(/[RIASEC]/i)?.[0] || '',
        })
      });
      const data = await res.json();
      setG8Result(data);
    } catch (e) {
      console.error(e);
    } finally {
      setG8Loading(false);
    }
  };

  const handleAnalyzeMatric = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-matric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mathMarks,
          scienceMarks,
          englishMarks,
          totalPercentage,
          biseBoard,
          subjects: {
            mathematics: mathMarks,
            physics: physicsMarks,
            chemistry: chemistryMarks,
            biology: scienceMarks,
            computer: computerMarks,
            english: englishMarks,
            urdu: urduMarks,
          },
          riasec: String(profile?.topRiasecCluster || '').match(/[RIASEC]/i)?.[0] || '',
        })
      });
      const data = await response.json();
      setAnalysisResult({
        ...data,
        warnings: Array.isArray(data?.warnings) ? data.warnings : [],
        recommendedStreams: Array.isArray(data?.recommendedStreams) ? data.recommendedStreams : [],
        tevtaAlternatives: Array.isArray(data?.tevtaAlternatives) ? data.tevtaAlternatives : []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
        <button
          onClick={() => setActiveSubTab('grade8')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'grade8'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t.grade8Matric.grade8Tab}
        </button>

        <button
          onClick={() => setActiveSubTab('matric')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'matric'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {t.grade8Matric.matricTab}
        </button>
      </div>

      {activeSubTab === 'grade8' ? (
        /* Grade 8 Group Selector & Interactive Evaluator */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h1 className="text-xl font-bold text-slate-900">Grade 8 Subject Marks Evaluator</h1>
            <p className="text-xs text-slate-500">
              Enter your current Grade 8 school report card marks to evaluate whether Science (Bio), Science (Computer), Commerce, or Arts group is best suited for your Matric enrollment.
              {profile?.topRiasecCluster
                ? ` Your saved quiz cluster is included in the recommendation.`
                : ' Take the interest quiz first so the group also follows your Holland result.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mathematics %</label>
                <input
                  type="number"
                  value={g8Math}
                  onChange={(e) => setG8Math(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">General Science %</label>
                <input
                  type="number"
                  value={g8Science}
                  onChange={(e) => setG8Science(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">English %</label>
                <input
                  type="number"
                  value={g8English}
                  onChange={(e) => setG8English(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Computer / Arts %</label>
                <input
                  type="number"
                  value={g8Computer}
                  onChange={(e) => setG8Computer(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 font-bold"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyzeGrade8}
              disabled={g8Loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{g8Loading ? 'Evaluating Grade 8 Marks...' : 'Evaluate Grade 8 Stream Fit'}</span>
            </button>
          </div>

          {g8Result && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">Grade 8 Stream Fit Analysis</h2>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                  Avg: {g8Result.averageScore}%
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(g8Result.subjects || []).map((subject) => (
                  <div key={subject.subject} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{subject.subject} · {subject.marks}%</h3>
                      <span className="text-[11px] font-bold text-emerald-800">{subject.strength}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{subject.meaning}</p>
                    <p className="text-xs text-slate-500 mt-1">Leads toward: {subject.careers}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(g8Result.recommendations || []).map((rec, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900">{rec.group}</h3>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {rec.fitLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{rec.reasons}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Science Bio Group */}
            <div 
              onClick={() => setSelectedGroup('science_bio')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedGroup === 'science_bio' 
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20' 
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-3">
                Bio
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Science (Biology Group)</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Mandatory for students aiming for MBBS, BDS, Nursing, Biotechnology, and Pharmacy.
              </p>
              <div className="text-[11px] text-slate-500 space-y-1">
                <div><strong>Key Subjects:</strong> Physics, Chemistry, Biology, Math</div>
                <div><strong>Post-Matric Target:</strong> FSc Pre-Medical</div>
              </div>
            </div>

            {/* Science CS Group */}
            <div 
              onClick={() => setSelectedGroup('science_cs')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedGroup === 'science_cs' 
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20' 
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-3">
                CS
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Science (Computer Group)</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Ideal for future Software Engineers, AI Specialists, Electrical/Mechanical Engineers, and Data Scientists.
              </p>
              <div className="text-[11px] text-slate-500 space-y-1">
                <div><strong>Key Subjects:</strong> Physics, Chemistry, Computer Science, Math</div>
                <div><strong>Post-Matric Target:</strong> ICS / Pre-Engineering</div>
              </div>
            </div>

            {/* Commerce / Arts */}
            <div 
              onClick={() => setSelectedGroup('arts')}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                selectedGroup === 'arts' 
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20' 
                  : 'bg-white border-slate-200 hover:border-emerald-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-3">
                FA
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">Commerce / Humanities</h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Best for Law (LLB), Business, Graphic Design, Media Studies, Chartered Accountancy, and Public Administration.
              </p>
              <div className="text-[11px] text-slate-500 space-y-1">
                <div><strong>Key Subjects:</strong> General Math, Civics, Economics, Computer Arts</div>
                <div><strong>Post-Matric Target:</strong> ICOM / FA / TEVTA Trade</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Matric BISE Marks Analyzer */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{t.grade8Matric.matricMarksTitle}</h1>
                <p className="text-xs text-slate-500">
                  Enter your BISE Matric (9th & 10th) marks to calculate aggregate merit thresholds for FSc streams, DAE, or TEVTA vocational trade options.
                </p>
              </div>
              <div className="sm:min-w-[200px] w-full sm:w-auto">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Select BISE Board</label>
                  <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    Grading Scale Normalizer
                  </span>
                </div>
                <select
                  value={biseBoard}
                  onChange={(e) => setBiseBoard(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800"
                >
                  <option value="FBISE">FBISE Islamabad (1100 Marks)</option>
                  <option value="BISE Lahore">BISE Lahore (1100 Marks)</option>
                  <option value="BISE Gujranwala">BISE Gujranwala (1100 Marks)</option>
                  <option value="BSEK Karachi">BSEK Karachi (Sindh 850 Marks Normalizer)</option>
                  <option value="BISE Peshawar">BISE Peshawar (KPK 1100 Marks)</option>
                  <option value="BISE Quetta">BISE Quetta (Balochistan 1100 Marks)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Matric Percentage %</label>
                <input
                  type="number"
                  value={totalPercentage}
                  onChange={(e) => setTotalPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mathematics Marks %</label>
                <input
                  type="number"
                  value={mathMarks}
                  onChange={(e) => setMathMarks(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Science / Bio Marks %</label>
                <input
                  type="number"
                  value={scienceMarks}
                  onChange={(e) => setScienceMarks(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">English Marks %</label>
                <input
                  type="number"
                  value={englishMarks}
                  onChange={(e) => setEnglishMarks(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>
              {[
                ['Physics %', physicsMarks, setPhysicsMarks],
                ['Chemistry %', chemistryMarks, setChemistryMarks],
                ['Computer %', computerMarks, setComputerMarks],
                ['Urdu %', urduMarks, setUrduMarks],
              ].map(([label, value, setValue]) => (
                <div key={label}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
                  <input type="number" value={value} onChange={(e) => setValue(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900" />
                </div>
              ))}
            </div>

            <button
              onClick={handleAnalyzeMatric}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{loading ? 'Analyzing BISE Thresholds...' : t.grade8Matric.analyzeBtn}</span>
            </button>
          </div>

          {/* Analysis Results Display */}
          {analysisResult && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">{t.grade8Matric.recommendedStreams} ({analysisResult.board || 'BISE'})</h2>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  Score: {analysisResult.pct}%
                </span>
              </div>

              {/* Warnings if any */}
              {Array.isArray(analysisResult.warnings) && analysisResult.warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>{t.grade8Matric.warningNotice}</span>
                  </div>
                  {analysisResult.warnings.map((w, idx) => (
                    <p key={idx}>{w}</p>
                  ))}
                </div>
              )}

              {(analysisResult.strongSubjects || analysisResult.weakSubjects) && (
                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="font-bold text-emerald-900">Strong subjects (70%+)</p>
                    <p className="text-slate-700 mt-1">{(analysisResult.strongSubjects || []).map((s) => `${s.subject} ${s.marks}%`).join(', ') || 'None entered at this band.'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="font-bold text-amber-900">Weak subjects (under 55%)</p>
                    <p className="text-slate-700 mt-1">{(analysisResult.weakSubjects || []).map((s) => `${s.subject} ${s.marks}%`).join(', ') || 'None under the BISE comfort line.'}</p>
                  </div>
                </div>
              )}
              {Array.isArray(analysisResult.allPaths) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900">Every post-Matric path</h3>
                  {analysisResult.allPaths.map((path) => (
                    <div key={path.stream} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{path.stream}</h4>
                        <span className={`text-[11px] font-bold ${path.unrealistic ? 'text-amber-700' : 'text-emerald-700'}`}>{path.matchScore}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">Leads to: {path.leadsTo}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Stream Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Array.isArray(analysisResult.recommendedStreams) ? analysisResult.recommendedStreams : []).map((st, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-slate-900">{st.stream}</h3>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {st.matchScore}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{st.details}</p>
                    
                    <button
                      onClick={() => onNavigate('fscMapper')}
                      className="mt-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>Explore FSc Cutoffs</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* TEVTA Alternatives Section if Present */}
              {Array.isArray(analysisResult.tevtaAlternatives) && analysisResult.tevtaAlternatives.length > 0 && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-emerald-600" />
                    <span>Recommended TEVTA Vocational Trade Alternatives</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {analysisResult.tevtaAlternatives.map((alt, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                        <div className="font-bold text-xs text-slate-900">{alt.title}</div>
                        <div className="text-[11px] text-slate-600"><strong>Duration:</strong> {alt.duration} | <strong>Stipend:</strong> {alt.stipend}</div>
                        <div className="text-[11px] text-emerald-800 font-semibold">{alt.institute}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
