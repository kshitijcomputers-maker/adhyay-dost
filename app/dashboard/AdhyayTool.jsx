'use client';

import { useState, useRef } from 'react';
import './adhyay-tool.css';

const loadingMsgs = [
  'चैप्टर पढ़ रहा हूँ...',
  'मुख्य बातें ढूंढ रहा हूँ...',
  'अच्छे सवाल बना रहा हूँ...',
  'फ्लैशकार्ड्स तैयार कर रहा हूँ...',
];

export default function AdhyayTool() {
  const [mode, setMode] = useState('image'); // image | text | doc
  const [lang, setLang] = useState('hi');

  const [imageBase64, setImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);

  const [textInput, setTextInput] = useState('');

  const [docBase64, setDocBase64] = useState(null);
  const [docExtractedText, setDocExtractedText] = useState(null);
  const [docFileName, setDocFileName] = useState('');
  const [docStatus, setDocStatus] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultData, setResultData] = useState(null);
  const [activeView, setActiveView] = useState('summary');

  // flashcards
  const [fcQueue, setFcQueue] = useState([]);
  const [fcTotal, setFcTotal] = useState(0);
  const [fcRemembered, setFcRemembered] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);

  // questions accordion
  const [openQ, setOpenQ] = useState(null);

  // video
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const msgIntervalRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageMediaType(file.type);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageBase64(ev.target.result.split(',')[1]);
      setPreviewSrc(ev.target.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleDocFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setDocBase64(null);
    setDocExtractedText(null);
    setDocFileName(file.name);
    const ext = file.name.split('.').pop().toLowerCase();

    try {
      if (ext === 'pdf') {
        setDocStatus('⚠️ PDF abhi direct support nahi hoti — kripya "फोटो" tab se page ki photo khींचke upload karo, ya PDF ko Word/Excel me convert karke try karo.');
        return;
      } else if (ext === 'docx') {
        setDocStatus('Word फ़ाइल पढ़ी जा रही है...');
        const mammoth = (await import('mammoth')).default;
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const extracted = result.value.trim();
        if (!extracted) throw new Error('empty');
        setDocExtractedText(extracted);
        setDocStatus('✓ टेक्स्ट निकाला गया — अब "पढ़ना शुरू करें" दबाएँ');
      } else if (ext === 'xlsx' || ext === 'xls') {
        setDocStatus('Excel फ़ाइल पढ़ी जा रही है...');
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        let combined = '';
        wb.SheetNames.forEach((name) => {
          const sheet = wb.Sheets[name];
          combined += `--- Sheet: ${name} ---\n` + XLSX.utils.sheet_to_csv(sheet) + '\n\n';
        });
        const extracted = combined.trim();
        if (!extracted) throw new Error('empty');
        setDocExtractedText(extracted);
        setDocStatus('✓ डेटा निकाला गया — अब "पढ़ना शुरू करें" दबाएँ');
      } else if (ext === 'doc') {
        throw new Error('old-doc');
      } else {
        throw new Error('unsupported');
      }
    } catch (err) {
      setDocBase64(null);
      setDocExtractedText(null);
      if (err.message === 'old-doc') {
        setDocStatus('⚠️ पुरानी .doc फ़ाइल सपोर्ट नहीं होती — कृपया .docx में सेव करके दोबारा अपलोड करें।');
      } else {
        setDocStatus('⚠️ फ़ाइल पढ़ने में दिक्कत आई — दूसरी फ़ाइल आज़माएँ या टेक्स्ट पेस्ट करें।');
      }
    }
  }

  async function processChapter() {
    setErrorMsg('');

    if (mode === 'image' && !imageBase64) {
      setErrorMsg('पहले चैप्टर की फोटो चुनें।');
      return;
    }
    if (mode === 'doc' && !docExtractedText) {
      setErrorMsg('पहले Word या Excel फ़ाइल चुनें और उसके तैयार होने का इंतज़ार करें।');
      return;
    }
    if (mode === 'text' && !textInput.trim()) {
      setErrorMsg('पहले चैप्टर का टेक्स्ट पेस्ट करें।');
      return;
    }

    setLoading(true);
    setResultData(null);
    setLoadingMsgIdx(0);
    msgIntervalRef.current = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % loadingMsgs.length);
    }, 2200);

    const basePayload = { mode, lang, imageBase64, imageMediaType, docExtractedText, textInput };

    try {
      // Part 1 — summary + questions
      const res1 = await fetch('/api/process-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, part: 1 }),
      });
      const data1 = await res1.json();
      if (!res1.ok) {
        clearInterval(msgIntervalRef.current);
        setLoading(false);
        setErrorMsg(data1.error || 'कुछ गड़बड़ हो गई — दोबारा कोशिश करें।');
        return;
      }

      // Part 2 — flashcards + video
      const res2 = await fetch('/api/process-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...basePayload, part: 2 }),
      });
      const data2 = await res2.json();
      clearInterval(msgIntervalRef.current);
      setLoading(false);

      if (!res2.ok) {
        setErrorMsg(data2.error || 'कुछ गड़बड़ हो गई — दोबारा कोशिश करें।');
        return;
      }

      const merged = {
        topic: data1.resultData.topic,
        summary: data1.resultData.summary,
        questions: data1.resultData.questions,
        flashcards: data2.resultData.flashcards || [],
        video_slides: data2.resultData.video_slides || [],
      };

      setResultData(merged);
      setFcQueue(merged.flashcards.map((c, i) => ({ ...c, id: i })));
      setFcTotal(merged.flashcards.length);
      setFcRemembered(0);
      setCurrentSlideIdx(0);
      setIsPlaying(false);
      setActiveView('summary');
    } catch (err) {
      clearInterval(msgIntervalRef.current);
      setLoading(false);
      setErrorMsg('कुछ गड़बड़ हो गई — दोबारा कोशिश करें। (इंटरनेट चेक कर लें)');
    }
  }

  function answerCard(remembered) {
    const [card, ...rest] = fcQueue;
    if (remembered) {
      setFcRemembered((r) => r + 1);
      setFcQueue(rest);
    } else {
      setFcQueue([...rest, card]);
    }
    setFcFlipped(false);
  }

  function restartFlashcards() {
    setFcQueue(resultData.flashcards.map((c, i) => ({ ...c, id: i })));
    setFcRemembered(0);
    setFcFlipped(false);
  }

  function speakText(text, onend) {
    if (!('speechSynthesis' in window)) {
      if (onend) onend();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const ttsLangMap = { hi: 'hi-IN', mr: 'mr-IN', en: 'en-IN' };
    u.lang = ttsLangMap[lang] || 'hi-IN';
    u.rate = 0.95;
    u.onend = () => {
      if (onend) onend();
    };
    window.speechSynthesis.speak(u);
  }

  function playFromSlide(idx) {
    const slide = resultData.video_slides[idx];
    if (!slide) return;
    speakText(slide.narration, () => {
      setIsPlaying((playing) => {
        if (!playing) return false;
        if (idx < resultData.video_slides.length - 1) {
          const next = idx + 1;
          setCurrentSlideIdx(next);
          playFromSlide(next);
        } else {
          return false;
        }
        return playing;
      });
    });
  }

  function togglePlay() {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    } else {
      setIsPlaying(true);
      playFromSlide(currentSlideIdx);
    }
  }

  function nextSlide() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentSlideIdx((i) => Math.min(i + 1, resultData.video_slides.length - 1));
  }
  function prevSlide() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentSlideIdx((i) => Math.max(i - 1, 0));
  }
  function restartSlide() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentSlideIdx(0);
  }

  function switchView(v) {
    if (v !== 'video' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
    setActiveView(v);
  }

  function resetAll() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setResultData(null);
    setTextInput('');
    setPreviewSrc(null);
    setImageBase64(null);
    setDocBase64(null);
    setDocExtractedText(null);
    setDocFileName('');
    setDocStatus('');
    setErrorMsg('');
  }

  return (
    <div className="adhyay-app">
      <header>
        <div className="eyebrow">अपनी किताब का दोस्त</div>
        <p>चैप्टर स्कैन करो या पेस्ट करो — सारांश, मुख्य सवाल और फ्लैशकार्ड्स तुरंत तैयार</p>
      </header>

      {!resultData && !loading && (
        <div className="adhyay-panel">
          <div className="adhyay-tabs-row">
            <button className={`adhyay-tab-btn ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>📷 फोटो</button>
            <button className={`adhyay-tab-btn ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>✍️ टेक्स्ट</button>
            <button className={`adhyay-tab-btn ${mode === 'doc' ? 'active' : ''}`} onClick={() => setMode('doc')}>📄 PDF/Word/Excel</button>
          </div>

          {mode === 'image' && (
            <div>
              <div className="adhyay-upload-box" onClick={() => fileInputRef.current.click()}>
                <div style={{ fontSize: 28 }}>📖</div>
                <p><strong>चैप्टर के पेज की फोटो चुनें</strong><br />यहाँ क्लिक करें या फोटो खींचें</p>
                {previewSrc && <img src={previewSrc} className="adhyay-preview-img" alt="preview" />}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
            </div>
          )}

          {mode === 'text' && (
            <textarea
              placeholder="यहाँ चैप्टर का टेक्स्ट पेस्ट करें..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
            />
          )}

          {mode === 'doc' && (
            <div>
              <div className="adhyay-upload-box" onClick={() => docInputRef.current.click()}>
                <div style={{ fontSize: 28 }}>📄</div>
                <p><strong>PDF, Word (.docx) या Excel (.xlsx/.xls) फ़ाइल चुनें</strong><br />यहाँ क्लिक करें</p>
                {docFileName && <div style={{ marginTop: 8, color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600 }}>{docFileName}</div>}
              </div>
              <input
                type="file"
                ref={docInputRef}
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={handleDocFile}
              />
              {docStatus && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-soft)' }}>{docStatus}</div>}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 8px', fontWeight: 600 }}>
              आवाज़ और जवाब किस भाषा में चाहिए?
            </p>
            <div className="adhyay-tabs-row">
              <button className={`adhyay-tab-btn ${lang === 'hi' ? 'active' : ''}`} onClick={() => setLang('hi')}>हिंदी</button>
              <button className={`adhyay-tab-btn ${lang === 'mr' ? 'active' : ''}`} onClick={() => setLang('mr')}>मराठी</button>
              <button className={`adhyay-tab-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>English</button>
            </div>
          </div>

          <button className="adhyay-go-btn" onClick={processChapter}>पढ़ना शुरू करें →</button>
          {errorMsg && <div className="adhyay-error-box">⚠️ {errorMsg}</div>}
        </div>
      )}

      {loading && (
        <div className="adhyay-loading">
          <div className="adhyay-spin"></div>
          <span>{loadingMsgs[loadingMsgIdx]}</span>
        </div>
      )}

      {resultData && (
        <div className="adhyay-results">
          <div className="adhyay-bookmark-row">
            <div className={`adhyay-bookmark ${activeView === 'summary' ? 'active' : ''}`} onClick={() => switchView('summary')}>📝 सारांश</div>
            <div className={`adhyay-bookmark ${activeView === 'questions' ? 'active' : ''}`} onClick={() => switchView('questions')}>❓ मुख्य प्रश्न</div>
            <div className={`adhyay-bookmark ${activeView === 'flashcards' ? 'active' : ''}`} onClick={() => switchView('flashcards')}>🗂️ फ्लैशकार्ड्स</div>
            <div className={`adhyay-bookmark ${activeView === 'video' ? 'active' : ''}`} onClick={() => switchView('video')}>🎬 वीडियो</div>
          </div>

          <div className="adhyay-result-panel">
            {activeView === 'summary' && (
              <div>
                {resultData.summary.map((s, i) => {
                  const q = encodeURIComponent((resultData.topic || '') + ' ' + s.slice(0, 40));
                  return (
                    <div className="adhyay-summary-item" key={i}>
                      <div className="adhyay-summary-num">{i + 1}</div>
                      <div>
                        <div className="adhyay-summary-text">{s}</div>
                        <a className="adhyay-yt-link" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noreferrer">
                          ▶ इस बारे में वीडियो खोजें
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeView === 'questions' && (
              <div>
                {resultData.questions.map((item, i) => (
                  <div className={`adhyay-q-item ${openQ === i ? 'open' : ''}`} key={i}>
                    <div className="adhyay-q-head" onClick={() => setOpenQ(openQ === i ? null : i)}>
                      <span><span className="adhyay-q-mark">Q{i + 1}.</span>{item.q}</span>
                      <span className="adhyay-q-arrow">▶</span>
                    </div>
                    <div className="adhyay-q-answer">{item.a}</div>
                  </div>
                ))}
              </div>
            )}

            {activeView === 'flashcards' && (
              <div>
                {fcQueue.length === 0 ? (
                  <div className="adhyay-fc-done">
                    <div className="em">🎉</div>
                    <h3>सारे कार्ड्स पूरे हो गए!</h3>
                    <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{fcRemembered}/{fcTotal} याद हो गए</p>
                    <button className="adhyay-reset-btn" onClick={restartFlashcards}>↺ फिर से शुरू करें</button>
                  </div>
                ) : (
                  <div>
                    <div className="adhyay-fc-progress">
                      <span>{fcTotal - fcQueue.length}/{fcTotal}</span>
                      <div className="adhyay-fc-bar">
                        <div className="adhyay-fc-bar-fill" style={{ width: `${Math.round(((fcTotal - fcQueue.length) / fcTotal) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="adhyay-flashcard-wrap">
                      <div className={`adhyay-flashcard ${fcFlipped ? 'flipped' : ''}`} onClick={() => setFcFlipped(!fcFlipped)}>
                        <div className="adhyay-fc-face adhyay-fc-front">
                          {fcQueue[0].front}
                          <span className="adhyay-fc-hint">पलटने के लिए टैप करें</span>
                        </div>
                        <div className="adhyay-fc-face adhyay-fc-back">{fcQueue[0].back}</div>
                      </div>
                    </div>
                    <div className="adhyay-fc-btns">
                      <button className="adhyay-fc-btn review" onClick={() => answerCard(false)}>फिर से देखूं</button>
                      <button className="adhyay-fc-btn remembered" onClick={() => answerCard(true)}>याद है ✓</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeView === 'video' && (
              <VideoTab
                resultData={resultData}
                currentSlideIdx={currentSlideIdx}
                isPlaying={isPlaying}
                lang={lang}
                onPlay={togglePlay}
                onNext={nextSlide}
                onPrev={prevSlide}
                onRestart={restartSlide}
              />
            )}
          </div>
          <button className="adhyay-new-chapter-btn" onClick={resetAll}>↺ नया चैप्टर पढ़ें</button>
        </div>
      )}
    </div>
  );
}

function VideoTab({ resultData, currentSlideIdx, isPlaying, lang, onPlay, onNext, onPrev, onRestart }) {
  const videoSlides = resultData.video_slides || [];
  if (!videoSlides.length) {
    return <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>इस चैप्टर के लिए वीडियो स्लाइड उपलब्ध नहीं हो पाईं।</p>;
  }
  const slide = videoSlides[currentSlideIdx];
  const voiceSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div>
      <div className="adhyay-video-screen">
        <div className="adhyay-video-emoji">{slide.emoji || '📘'}</div>
        <div className="adhyay-video-heading">{slide.heading}</div>
        <div className="adhyay-video-caption">{slide.narration}</div>
      </div>
      <div className="adhyay-video-progress-row">
        {videoSlides.map((_, i) => (
          <div key={i} className={`adhyay-video-dot ${i < currentSlideIdx ? 'done' : ''} ${i === currentSlideIdx ? 'current' : ''}`}></div>
        ))}
      </div>
      <div className="adhyay-video-controls">
        <button className="adhyay-vid-btn" onClick={onPrev}>⏮</button>
        <button className="adhyay-vid-btn play" onClick={onPlay}>{isPlaying ? '⏸' : '▶'}</button>
        <button className="adhyay-vid-btn" onClick={onNext}>⏭</button>
        <button className="adhyay-vid-btn" onClick={onRestart} title="फिर से शुरू">↺</button>
      </div>
      {!voiceSupported && <p className="adhyay-video-note">⚠️ इस डिवाइस पर आवाज़ सपोर्ट नहीं है — बस टेक्स्ट पढ़ लें</p>}
    </div>
  );
}
